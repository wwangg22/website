"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { asset, media } from "@/lib/assets";
import { useTheme } from "@/lib/useTheme";
import { easeInOut, modelTitle, partName as label, placement, type Model, type Part, type VersionData } from "./parts";

const TRANSITION = 1; // seconds for explode / select fly-out
const SPIN_TRANSITION = 3; // seconds for spin to ease in and out
const HOME = new THREE.Vector3(300, 0, 0); // the old viewer's camera, also where story mode starts
const FILL = 0.65; // share of the stage the model should span
const GRAIN_MM = 40; // millimetres of part covered by one tile of the grain texture
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const deg = Math.PI / 180;
const BTN = "clay-btn px-3 py-1.5 sm:px-5 sm:py-2.5";

type PartMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> & {
  userData: { part: Part; place: ReturnType<typeof placement>; rest: THREE.Quaternion; spin: number };
};

// Fine grain so parts catch light like unglazed clay instead of smooth plastic.
// One per viewer, disposed with it, so no renderer outlives its component.
function clayGrain() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 118 + Math.random() * 20;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const grain = new THREE.CanvasTexture(canvas);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  return grain;
}

// STLs carry no UVs; project each triangle onto the plane its face normal points at most.
function addGrainUVs(geometry: THREE.BufferGeometry) {
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const [a, b, c, n] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.crossVectors(b.sub(a), c.sub(a));
    const [ax, ay, az] = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)];
    for (let j = i; j < i + 3; j++) {
      const [u, v] =
        ax >= ay && ax >= az ? [pos.getY(j), pos.getZ(j)] : ay >= az ? [pos.getX(j), pos.getZ(j)] : [pos.getX(j), pos.getY(j)];
      uv[j * 2] = u / GRAIN_MM;
      uv[j * 2 + 1] = v / GRAIN_MM;
    }
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

const disposeGroup = (group: THREE.Group) => {
  for (const m of group.children as PartMesh[]) {
    m.geometry.dispose();
    m.material.dispose();
  }
  group.removeFromParent();
};

// Probe on a throwaway canvas so a missing WebGL never reaches three (which logs errors and throws).
const hasWebGL = () => {
  const gl = document.createElement("canvas").getContext("webgl2");
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return !!gl;
};


export default function Viewer({ model }: { model: Model }) {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [spin, setSpin] = useState(false);
  const [passive, setPassive] = useState(() => !matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [xray, setXray] = useState(false);
  const [story, setStory] = useState(false);
  const [selected, setSelected] = useState<Part | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [failed, setFailed] = useState(() => !hasWebGL()); // no WebGL, or the context was lost

  // Everything the render loop reads lives here so it never goes stale.
  const live = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    group: null as THREE.Group | null,
    grain: null as THREE.Texture | null,
    data: {} as VersionData,
    selected: null as PartMesh | null,
    hovered: null as PartMesh | null,
    reverse: false,
    t: TRANSITION,
    spinT: 1,
    expanded: false,
    spin: false,
    passive,
    xray: false,
    story: false,
    down: false,
    panY: 0,
    original: new THREE.Quaternion(),
    drift: new THREE.Quaternion(),
    home: HOME.clone(),
    focus: new THREE.Vector3(180, 10, 45),
    look: new THREE.Vector3(),
    // Of the loaded model, in world space; a placeholder until the first load.
    bounds: { collapsed: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(200, 200, 200)), exploded: new THREE.Box3() },
    paint: () => {},
    frame: () => {},
    aim: () => {}, // place l.focus so the selected part fits the free part of the stage
    pick: (() => {}) as (file: string) => void, // select a part without the pointer (keyboard part list)
  });

  const data = model.versions[version].data;
  const canExplode = !!data.expand;

  // Scene, lights, render loop and pointer handling: set up once per model.
  useEffect(() => {
    if (failed) return;
    const l = live.current;
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      // WebGL is only known to be missing once we try; a one-off re-render to the fallback is fine.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    const pmrem = new THREE.PMREMGenerator(renderer);
    let envMap: THREE.WebGLRenderTarget | null = null;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    camera.position.copy(HOME);
    l.scene = scene;
    l.camera = camera;
    l.grain = clayGrain();

    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 24;
    key.shadow.blurSamples = 16;
    key.shadow.bias = -0.0005;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial());
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(key, key.target, ground);

    // Shadow catcher and key light follow the jig's vertical pan.
    let groundY = 0;
    const keyBase = new THREE.Vector3();
    const placeLights = () => {
      ground.position.y = groundY + l.panY;
      key.position.copy(keyBase).setY(keyBase.y + l.panY);
      key.target.position.y = l.panY;
    };
    l.paint = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      const css = getComputedStyle(document.documentElement);
      // Studio softboxes baked into an environment map: a big key from the upper right
      // (camera looks down -x, so screen right is -z), a dim fill, a rim from behind and a floor bounce.
      const env = new THREE.Scene();
      const softbox = (intensity: number, [x, y, z]: number[], [w, h]: number[]) => {
        const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
        material.color.setScalar(intensity);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
        m.position.set(x, y, z);
        m.lookAt(0, 0, 0);
        env.add(m);
      };
      // The floor bounce is kept low so undersides fall into shade, a cheap stand-in for occlusion.
      softbox(dark ? 1.8 : 2.4, [5, 6, -4], [9, 9]);
      softbox(dark ? 0.5 : 1.2, [3, 1, 7], [6, 8]);
      softbox(dark ? 0.8 : 1.2, [-7, 4, 0], [12, 4]);
      softbox(dark ? 0.1 : 0.3, [2, -6, 0], [12, 6]);
      envMap?.dispose();
      envMap = pmrem.fromScene(env, 0, 0.1, 100);
      scene.environment = envMap.texture;
      env.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
      key.intensity = dark ? 0.72 : 0.88;
      ground.material.opacity = dark ? 0.42 : 0.2;

      // One stone/clay family: the muted accents are pulled most of the way to stone, so parts
      // differ by a subtle tint and by alternating light and dark values.
      const get = (v: string) => new THREE.Color(css.getPropertyValue(v).trim());
      const stone = (dark ? get("--ink-soft").lerp(get("--ink"), 0.2) : get("--well")).lerp(get("--butter"), 0.15);
      const tint = (v: string) => get(v).lerp(stone, 0.67);
      const tones = [stone, tint("--sky").multiplyScalar(0.78), tint("--coral"), stone.clone().multiplyScalar(0.66), tint("--butter"), tint("--lavender").multiplyScalar(0.78), tint("--mint")];
      (l.group?.children as PartMesh[] | undefined)?.forEach((m, i) => {
        m.material.color.copy(tones[i % tones.length]);
        if (i >= tones.length) m.material.color.multiplyScalar(0.88);
      });
      if (!l.group) return;
      // Sit the shadow catcher under the model and fit the shadow camera to it, exploded too.
      const box = l.bounds.collapsed.clone().union(l.bounds.exploded);
      const r = box.getBoundingSphere(new THREE.Sphere()).radius;
      groundY = box.min.y - 1;
      keyBase.set(r * 1.2, r * 1.5, -r);
      placeLights();
      const cam = key.shadow.camera;
      cam.left = cam.bottom = -r * 1.3;
      cam.right = cam.top = r * 1.3;
      cam.far = r * 6;
      cam.updateProjectionMatrix();
    };
    l.paint();

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = wrap;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      l.frame();
    };
    // Same viewing direction as the old viewer, at a distance that fits the model in the stage.
    l.frame = () => {
      // The model turns about the vertical axis, so fit its height and its full turning
      // radius to FILL of the stage, plus a little for parts swinging towards the camera.
      const tanV = Math.tan(37.5 * deg);
      const tanH = tanV * camera.aspect;
      const { min, max } = l.data.expand && l.expanded ? l.bounds.exploded : l.bounds.collapsed;
      const radius = Math.hypot(Math.max(-min.x, max.x), Math.max(-min.z, max.z));
      const height = Math.max(-min.y, max.y);
      const d = Math.max(height / (FILL * tanV), radius / (FILL * tanH)) + radius * 0.3;
      l.home.copy(HOME).setLength(d);
      l.aim();
    };
    l.aim = () => {
      const m = l.selected;
      if (!m) return;
      const geometry = m.geometry;
      if (!geometry.boundingSphere) geometry.computeBoundingSphere();
      const r = geometry.boundingSphere!.radius;
      // From sm up the info card (w-80 + right-4) covers the right of the stage; on phones it sits below.
      const w = wrap.clientWidth;
      const card = w >= 640 ? 336 : 0;
      const tanV = Math.tan(37.5 * deg);
      const tanH = tanV * camera.aspect;
      const d = r / (0.75 * Math.min(tanV, (tanH * (w - card)) / w));
      // d in front of the camera, shifted left (+z) into the middle of the free area.
      l.focus.copy(l.home).setLength(l.home.length() - d).setZ((card / w) * d * tanH);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hitTest = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const canPick = (!l.data.expand || l.expanded) && !l.selected && l.t >= TRANSITION && !l.story;
      if (!l.group || !canPick) return null;
      raycaster.setFromCamera(pointer, camera);
      return (raycaster.intersectObjects(l.group.children)[0]?.object as PartMesh | undefined) ?? null;
    };
    const setHovered = (m: PartMesh | null) => {
      if (m === l.hovered) return;
      l.hovered = m;
      setHover(m ? label(m.userData.part) : null);
    };

    // Only the first finger/button drives rotation; a second one turns the gesture into a
    // non-click so pinches never jump the model or select a part.
    let active: number | null = null;
    let multi = false;
    let lastX = 0;
    let lastY = 0;
    let travel = 0;
    const onDown = (e: PointerEvent) => {
      if (l.story || e.button !== 0) return;
      if (active !== null || !e.isPrimary) {
        multi = true;
        return;
      }
      active = e.pointerId;
      multi = false;
      canvas.setPointerCapture(e.pointerId);
      l.down = true;
      lastX = e.clientX;
      lastY = e.clientY;
      travel = 0;
      setHovered(null);
    };
    const onMove = (e: PointerEvent) => {
      if (!l.down) {
        if (e.pointerType === "mouse") setHovered(hitTest(e));
        return;
      }
      if (e.pointerId !== active || multi) return;
      const dx = (e.clientX - lastX) / 2;
      const dy = (e.clientY - lastY) / 2;
      travel += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX;
      lastY = e.clientY;
      rotate(dx, dy);
    };
    // Drag (or arrow keys) by dx, dy half-pixels. Keyboard turns also move the resting pose
    // (sticky = true) so the model doesn't drift back once the key is released.
    const rotate = (dx: number, dy: number, sticky = false) => {
      const group = l.group;
      if (!group) return;
      const turn = (axis: THREE.Vector3, angle: number) => {
        group.rotateOnWorldAxis(axis, angle);
        if (sticky) l.drift.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
      };
      if (model.name === "testingjig") {
        // The jig only turns about the vertical axis; vertical drags slide it up and down.
        turn(Y, dx / 100);
        l.panY = THREE.MathUtils.clamp(l.panY - dy / 5, -60, 60);
        group.position.y = l.panY;
        placeLights();
      } else if (l.selected) {
        const inv = group.quaternion.clone().invert();
        l.selected.rotateOnWorldAxis(Y.clone().applyQuaternion(inv), dx / 100);
        l.selected.rotateOnWorldAxis(Z.clone().applyQuaternion(inv), -dy / 100);
      } else {
        turn(Y, dx / 100);
        turn(Z, -dy / 100);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const step = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[e.key];
      if (!step || l.story) return;
      e.preventDefault();
      rotate(step[0], step[1], true);
    };
    const select = (m: PartMesh) => {
      l.selected = m;
      l.aim();
      l.reverse = false;
      l.t = 0;
      if (l.spin) {
        l.spin = false;
        l.spinT = l.spinT >= 1 ? 0 : 1 - l.spinT; // ease out from wherever the ease-in got to
        setSpin(false);
      }
      setHovered(null);
      setSelected(m.userData.part);
    };
    l.pick = (file) => {
      const m = (l.group?.children as PartMesh[] | undefined)?.find((c) => c.userData.part.file === file);
      if (m && !l.selected && !l.story && l.t >= TRANSITION) select(m);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== active) return;
      active = null;
      l.down = false;
      if (multi || travel > 4) return;
      const hit = hitTest(e);
      if (hit) select(hit);
    };
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== active) return;
      active = null;
      l.down = false;
    };
    const onLeave = () => setHovered(null);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerleave", onLeave);
    const onLost = (e: Event) => {
      e.preventDefault(); // lets the browser restore the context; see the restore effect below
      cancelAnimationFrame(raf);
      setSelected(null);
      setHover(null);
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const stop = new THREE.Vector3();
    const stopLook = new THREE.Vector3();
    const target = new THREE.Vector3();
    const restPos = new THREE.Vector3();
    const where = new THREE.Vector3();
    const partTurn = new THREE.Quaternion();
    let prev = performance.now();
    let raf = 0;
    const tick = (time: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((time - prev) / 1000, 0.1);
      const k = dt * 60; // per-frame amounts below were tuned for 60fps
      prev = time;
      const group = l.group;
      if (renderer.getPixelRatio() !== Math.min(devicePixelRatio, 2)) resize(); // moved to another screen or zoomed

      // Ease back upright after a drag; story mode returns to the original pose.
      if (group && l.story) group.quaternion.slerp(l.original, 0.02 * k);
      else if (group && !l.down) group.quaternion.slerp(l.drift, 0.02 * k);
      if (group && !l.down && !l.selected && !l.story && l.passive) {
        l.drift.premultiply(new THREE.Quaternion().setFromAxisAngle(Y, 0.001 * k));
      }

      // Camera: home, or the story stop picked by the scroll position.
      const stops = l.data.camera_positions;
      const scroller = scrollRef.current;
      if (l.story && stops && stops.length >= 2 && scroller) {
        const n = stops.length - 1;
        const f = Math.min(scroller.scrollTop / scroller.clientHeight, n);
        const seg = Math.min(Math.floor(f), n - 1);
        const e = easeInOut(f - seg);
        stop.fromArray(stops[seg].position).lerp(target.fromArray(stops[seg + 1].position), e);
        stopLook.fromArray(stops[seg].lookAt).lerp(target.fromArray(stops[seg + 1].lookAt), e);
        stop.sub(stopLook).multiplyScalar(1.25).add(stopLook); // stops were set for a full-screen view; back off to fit the stage
        camera.position.lerp(stop, 0.15);
        l.look.lerp(stopLook, 0.15);
      } else {
        camera.position.lerp(l.home, 0.03 * k);
        l.look.lerp(stop.set(0, 0, 0), 0.1 * k);
      }
      camera.lookAt(l.look);

      l.t = Math.min(l.t + dt, TRANSITION);
      l.spinT = Math.min(l.spinT + dt / SPIN_TRANSITION, 1);
      const p = easeInOut(l.t / TRANSITION);
      const s = l.spin ? easeInOut(l.spinT) : 1 - easeInOut(l.spinT);

      for (const m of (group?.children ?? []) as PartMesh[]) {
        const { place, rest } = m.userData;
        if (l.selected) {
          m.visible = m === l.selected;
          if (m === l.selected) {
            // Put the part's bounding-sphere centre (not its origin, which file offsets can move) on the focus point.
            m.getWorldQuaternion(partTurn);
            target.copy(m.geometry.boundingSphere!.center).applyQuaternion(partTurn);
            group!.worldToLocal(target.subVectors(l.focus, target));
            restPos.set(place.x, l.data.expand && l.expanded ? place.explodedY : place.y, place.z);
            if (l.reverse) {
              m.position.lerpVectors(target, restPos, p);
              m.quaternion.slerp(rest, p);
            } else m.position.lerpVectors(restPos, target, p);
          }
        } else {
          m.visible = true;
          if (l.data.expand) {
            const [from, to] = l.expanded ? [place.y, place.explodedY] : [place.explodedY, place.y];
            m.position.y = from + (to - from) * p;
          }
        }
        if (m.userData.spin && s > 0) m.rotateY(m.userData.spin * s * k);
        const seeThrough = l.xray && m !== l.selected;
        m.material.transparent = seeThrough;
        m.material.opacity = seeThrough ? 0.35 : 1;
        m.material.depthWrite = !seeThrough;
        m.material.emissive.setScalar(m === l.hovered ? 0.06 : 0);
      }
      if (l.reverse && l.t >= TRANSITION) {
        l.selected = null;
        l.reverse = false;
      }

      if (l.hovered && labelRef.current) {
        l.hovered.getWorldPosition(where).project(camera);
        const x = ((where.x + 1) / 2) * wrap.clientWidth;
        const y = ((1 - where.y) / 2) * wrap.clientHeight;
        labelRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      // three keeps its PBR lookup texture (DFG LUT) in a module-level singleton, and its dispose
      // listeners pin every renderer that ever used it. Disposing it releases them; three simply
      // re-uploads it the next time any renderer needs it.
      let dfg: THREE.Texture | undefined;
      scene.traverse((o) => {
        if (!dfg && o instanceof THREE.Mesh) {
          const props = renderer.properties.get(o.material) as { uniforms?: { dfgLUT?: { value: THREE.Texture | null } } };
          dfg = props.uniforms?.dfgLUT?.value ?? undefined;
        }
      });
      dfg?.dispose();
      if (l.group) disposeGroup(l.group);
      l.group = null;
      l.scene = null;
      l.selected = l.hovered = null;
      l.reverse = false;
      l.camera = null;
      l.grain?.dispose();
      l.grain = null;
      ground.geometry.dispose();
      ground.material.dispose();
      key.shadow.dispose();
      scene.environment = null;
      envMap?.dispose();
      pmrem.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      l.paint = l.frame = l.aim = l.pick = () => {};
    };
  }, [model.name, failed]);

  // Load the parts of the current version.
  useEffect(() => {
    const l = live.current;
    const v = model.versions[version];
    if (failed || !l.scene) return; // WebGL unavailable
    let cancelled = false;
    const loader = new STLLoader();
    Promise.all(v.parts.map((p) => loader.loadAsync(media(`garage/stl/${model.name}/${v.version}/${p.file}`))))
      .then((geometries) => {
        if (cancelled || !l.scene) return geometries.forEach((g) => g.dispose());
        const group = new THREE.Group();
        geometries.forEach((geometry, i) => {
          const part = v.parts[i];
          const place = placement(part.file);
          // Smooth curved faces but keep machined edges crisp.
          toCreasedNormals(geometry, 35 * deg);
          addGrainUVs(geometry);
          const material = new THREE.MeshStandardMaterial({
            roughness: 0.92,
            metalness: 0,
            side: THREE.DoubleSide,
            bumpMap: l.grain,
            bumpScale: 0.6,
          });
          const m = new THREE.Mesh(geometry, material) as unknown as PartMesh;
          if (!isNaN(place.rz)) m.rotateZ(place.rz * deg);
          if (!isNaN(place.ry)) m.rotateY(place.ry * deg);
          if (!isNaN(place.rx)) m.rotateX(place.rx * deg);
          m.position.set(place.x, place.y, place.z);
          geometry.center();
          if (place.ofs != 0 || place.zofs != 0) geometry.translate(place.ofs, 0, place.zofs);
          m.castShadow = m.receiveShadow = true;
          const spin = Object.entries(v.data.spin ?? {}).reduce((sum, [key, speed]) => (part.file.includes(key) ? sum + speed : sum), 0);
          m.userData = { part, place, rest: m.quaternion.clone(), spin };
          group.add(m);
        });
        // Centre the assembly (collapsed and exploded together) on the turning axis. Story
        // camera stops are absolute, so models that have them keep their original origin.
        const parts = group.children as PartMesh[];
        const extent = (exploded: boolean) => {
          const box = new THREE.Box3();
          group.updateMatrixWorld();
          for (const m of parts) {
            m.position.y = exploded ? m.userData.place.explodedY : m.userData.place.y;
            m.updateMatrixWorld();
            box.expandByObject(m);
            m.position.y = m.userData.place.y;
          }
          return box;
        };
        if (!v.data.camera_positions) {
          const box = extent(false);
          if (v.data.expand) box.union(extent(true));
          const c = box.getCenter(new THREE.Vector3());
          for (const m of parts) {
            const p = m.userData.place;
            p.x -= c.x;
            p.y -= c.y;
            p.z -= c.z;
            p.explodedY -= c.y;
            m.position.set(p.x, p.y, p.z);
          }
        }
        group.rotateX(-Math.PI / 2);
        l.bounds.collapsed = extent(false);
        l.bounds.exploded = v.data.expand ? extent(true) : l.bounds.collapsed;
        if (l.group) disposeGroup(l.group);
        l.scene?.add(group);
        l.group = group;
        l.data = v.data;
        l.panY = 0;
        l.original.copy(group.quaternion);
        l.drift.copy(group.quaternion);
        l.frame();
        l.paint();
        setLoading(false);
      })
      .catch((err) => {
        console.error("garage: failed to load parts", err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [model, version, failed]);

  useEffect(() => live.current.paint(), [theme]);

  // A lost context shows the fallback; when the browser restores it, rebuild everything.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const onRestored = () => {
      setLoading(true);
      setFailed(false);
    };
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => canvas.removeEventListener("webglcontextrestored", onRestored);
  }, []);

  // Keep keyboard focus in the toolbar when the button that had it is swapped out.
  const actionsRef = useRef<HTMLDivElement>(null);
  const refocus = () => requestAnimationFrame(() => actionsRef.current?.querySelector("button")?.focus());

  const pickVersion = (i: number) => {
    if (i === version) return;
    const l = live.current;
    l.selected = null;
    l.hovered = null;
    l.reverse = false;
    l.expanded = false;
    l.t = TRANSITION;
    setExpanded(false);
    setSelected(null);
    setHover(null);
    setLoading(true);
    setVersion(i);
  };
  const toggleExplode = () => {
    const l = live.current;
    if (l.selected) {
      if (!l.reverse) return;
      // Still flying back after Back: land it now so the explode can start straight away.
      const m = l.selected;
      const p = m.userData.place;
      m.quaternion.copy(m.userData.rest);
      m.position.set(p.x, l.data.expand && l.expanded ? p.explodedY : p.y, p.z);
      l.selected = null;
      l.reverse = false;
      l.t = TRANSITION;
    }
    l.t = l.t >= TRANSITION ? 0 : TRANSITION - l.t;
    l.expanded = !l.expanded;
    l.frame();
    setExpanded(l.expanded);
  };
  const toggleSpin = () => {
    const l = live.current;
    l.spinT = l.spinT >= 1 ? 0 : 1 - l.spinT;
    l.spin = !l.spin;
    setSpin(l.spin);
  };
  const toggle = (key: "passive" | "xray" | "story", set: (v: boolean) => void) => {
    live.current[key] = !live.current[key];
    set(live.current[key]);
  };
  const back = () => {
    const l = live.current;
    if (failed) return setSelected(null);
    if (!l.selected || l.reverse) return;
    l.reverse = true;
    l.t = l.t >= TRANSITION ? 0 : TRANSITION - l.t; // reverse from wherever the fly-out got to
    setSelected(null);
    refocus();
  };
  const toggleStory = () => {
    toggle("story", setStory);
    refocus();
  };

  return (
    <div className="min-w-0">
      <div className="flex min-h-12 flex-wrap items-center gap-2 px-1 pb-3">
        <h2 className="mr-2 text-2xl font-semibold">{modelTitle(model.name)}</h2>
        {!selected && !story && model.versions.length > 1 && (
          <div role="group" aria-label="Version" className="clay-inset flex gap-1 rounded-full p-1">
            {model.versions.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickVersion(i)}
                aria-pressed={i === version}
                className={`clay-btn px-3 py-1 text-sm ${i === version ? "accent-sky" : ""}`}
              >
                V{i + 1}
              </button>
            ))}
          </div>
        )}
        <div ref={actionsRef} className="ml-auto flex flex-wrap justify-end gap-2 text-sm">
          {selected ? (
            <button type="button" onClick={back} className={BTN}>
              Back
            </button>
          ) : story ? (
            <button type="button" onClick={toggleStory} className={BTN}>
              Exit story
            </button>
          ) : failed ? (
            data.camera_positions && (
              <button type="button" onClick={toggleStory} className={`${BTN} accent-coral`}>
                Discover
              </button>
            )
          ) : (
            <>
              <button type="button" onClick={() => toggle("passive", setPassive)} aria-pressed={passive} className={BTN}>
                Auto-rotate
              </button>
              {canExplode && (
                <button type="button" onClick={toggleExplode} aria-pressed={expanded} className={BTN}>
                  {expanded ? "Collapse" : "Explode"}
                </button>
              )}
              {canExplode && data.spin && (
                <button type="button" onClick={toggleSpin} aria-pressed={spin} className={BTN}>
                  Spin
                </button>
              )}
              <button type="button" onClick={() => toggle("xray", setXray)} aria-pressed={xray} className={BTN}>
                X-ray
              </button>
              {data.camera_positions && (
                <button type="button" onClick={toggleStory} className={`${BTN} accent-coral`}>
                  Discover
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <div ref={wrapRef} className="clay-inset relative h-[55svh] min-h-72 overflow-hidden sm:h-[min(60svh,32rem)] lg:h-[calc(100svh-26.5rem)] lg:max-h-[48rem] lg:min-h-80">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            aria-label={`3D model of ${modelTitle(model.name)}. Drag or use the arrow keys to rotate.`}
            className={`block h-full w-full cursor-grab touch-none active:cursor-grabbing ${failed ? "invisible" : ""}`}
          />
          {/* Keyboard route to the parts: hidden until a button inside it takes focus. */}
          {!failed && !story && !selected && !loading && (
            <nav
              aria-label="Parts"
              className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-x-3 focus-within:bottom-3 focus-within:flex focus-within:flex-wrap focus-within:gap-2 focus-within:rounded-2xl focus-within:bg-surface focus-within:p-2"
            >
              {model.versions[version].parts.map((p) => (
                <button
                  key={p.file}
                  type="button"
                  onClick={() => {
                    live.current.pick(p.file);
                    refocus();
                  }}
                  className="clay-btn px-3 py-1 text-sm"
                >
                  {label(p)}
                </button>
              ))}
            </nav>
          )}
          {failed && !story && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
              {model.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset(model.thumbnail)} alt={`Render of ${modelTitle(model.name)}`} className="max-h-[45%] min-h-0 object-contain" />
              )}
              <p className="max-w-sm text-sm text-ink-soft">
                The interactive 3D view needs WebGL, which isn&apos;t available here. The part notes are still listed below.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {model.versions[version].parts
                  .filter((p) => p.description)
                  .map((p) => (
                    <button key={p.file} type="button" onClick={() => setSelected(p)} className="clay-btn px-3 py-1 text-sm">
                      {label(p)}
                    </button>
                  ))}
              </div>
            </div>
          )}
          {loading && !failed && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="clay-sm px-5 py-3 font-display text-ink-soft">Loading parts…</span>
            </div>
          )}
          <div
            ref={labelRef}
            className={`clay-sm pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-[130%] px-3 py-1 font-display text-sm transition-opacity ${hover ? "opacity-100" : "opacity-0"}`}
          >
            {hover}
          </div>
        </div>
        {/* Story text: over the stage from sm up, in its own scroller below it on phones. */}
        {story && data.camera_positions && (
          <div
            ref={scrollRef}
            tabIndex={0}
            aria-label="Story tour, scroll to step through"
            className="mt-3 h-80 snap-y snap-mandatory overflow-y-auto overscroll-contain sm:absolute sm:inset-0 sm:mt-0 sm:h-auto"
          >
            {data.camera_positions.map((stop, i) => (
              <section
                key={i}
                className={`flex h-full snap-start sm:items-center sm:p-6 ${stop.page_info?.container.tailwind.includes("right-") ? "sm:justify-end" : ""}`}
              >
                {stop.page_info && (
                  <div className="clay-sm max-h-full w-full overflow-y-auto p-5 sm:max-w-xs">
                    <h3 className="text-xl font-semibold">{stop.page_info.title.text}</h3>
                    {stop.page_info.paragraph.map((para, j) =>
                      para.type === "p" ? (
                        <p key={j} className="mt-2 text-ink-soft">
                          {para.text?.replace(/\s*\n\s*/g, " ").trim()}
                        </p>
                      ) : (
                        <div key={j} className="clay-inset mt-3 aspect-video overflow-hidden">
                          {para.type === "iframe" && <iframe src={para.src} title={para.title} allowFullScreen className="h-full w-full" />}
                          {para.type === "video" && <video src={para.src} controls={para.controls} className="h-full w-full" />}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {para.type === "img" && <img src={para.src} alt={para.alt ?? ""} className="h-full w-full object-cover" />}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        {selected && (
          <aside className="clay-sm mt-3 overflow-y-auto p-5 sm:absolute sm:right-4 sm:top-4 sm:mt-0 sm:max-h-[calc(100%-2rem)] sm:w-80">
            <h3 className="text-2xl font-semibold">{label(selected)}</h3>
            {selected.description ? (
              <>
                <h4 className="mt-4 font-display font-semibold">Purpose</h4>
                <p className="mt-1 text-ink-soft">{selected.description.purpose}</p>
                <h4 className="mt-4 font-display font-semibold">Design elements</h4>
                <p className="mt-1 text-ink-soft">{selected.description.design}</p>
              </>
            ) : (
              <p className="mt-2 text-ink-soft">No design notes for this part yet.</p>
            )}
          </aside>
        )}
      </div>

      <p className="px-1 pt-3 text-sm text-ink-soft">
        {failed
          ? "Showing a static render in place of the 3D view."
          : story
          ? "Scroll within the stage to step through the tour."
          : canExplode && !expanded
            ? "Drag to rotate. Explode the assembly to select individual parts."
            : "Drag to rotate. Select a part to see it on its own with its design notes."}
      </p>
    </div>
  );
}
