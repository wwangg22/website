"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { media } from "@/lib/assets";
import { useTheme } from "@/lib/useTheme";
import { LoadingOverlay } from "./ui";

// MobileNeRF viewer (ported from the old NerfRenderer). Reads data/<id>_mac/data.json for
// the number of shape chunks (`num_obj`), bakes mlp.json into the fragment shader, then
// loads each chunk's OBJ and two feature textures.

/*****************************************************************************
 * GLSL SHADERS (vertex is simple, fragment is template with placeholders)
 *****************************************************************************/
const VERT_SRC = /* glsl */ `
  in vec3 position;
  in vec2 uv;
  out vec2 vUv;
  out vec3 rayDirection;
  uniform mat4 modelViewMatrix, projectionMatrix, modelMatrix;
  uniform vec3 cameraPosition;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    rayDirection = (modelMatrix * vec4(position, 1.0)).rgb - cameraPosition;
  }
`;

const FRAG_TEMPLATE = /* glsl */ `
precision mediump float;

in vec2 vUv;
in vec3 rayDirection;

out vec4 fragColor;

uniform sampler2D tDiffuse0, tDiffuse1;

mediump vec3 mlp(vec4 f0, vec4 f1, vec4 viewdir) {
  mediump mat4 x = mat4(BIAS_LIST_ZERO);
  x += viewdir.r*mat4(__W0_0__) - viewdir.b*mat4(__W0_1__) + viewdir.g*mat4(__W0_2__)
     + f0.r*mat4(__W0_3__) + f0.g*mat4(__W0_4__) + f0.b*mat4(__W0_5__) + f0.a*mat4(__W0_6__)
     + f1.r*mat4(__W0_7__) + f1.g*mat4(__W0_8__) + f1.b*mat4(__W0_9__) + f1.a*mat4(__W0_10__);
  x[0]=max(x[0],0.0); x[1]=max(x[1],0.0); x[2]=max(x[2],0.0); x[3]=max(x[3],0.0);

  mediump mat4 y = mat4(BIAS_LIST_ONE);
  y += x[0][0]*mat4(__W1_0__)+x[0][1]*mat4(__W1_1__)+x[0][2]*mat4(__W1_2__)+x[0][3]*mat4(__W1_3__)
     + x[1][0]*mat4(__W1_4__)+x[1][1]*mat4(__W1_5__)+x[1][2]*mat4(__W1_6__)+x[1][3]*mat4(__W1_7__)
     + x[2][0]*mat4(__W1_8__)+x[2][1]*mat4(__W1_9__)+x[2][2]*mat4(__W1_10__)+x[2][3]*mat4(__W1_11__)
     + x[3][0]*mat4(__W1_12__)+x[3][1]*mat4(__W1_13__)+x[3][2]*mat4(__W1_14__)+x[3][3]*mat4(__W1_15__);
  y[0]=max(y[0],0.0); y[1]=max(y[1],0.0); y[2]=max(y[2],0.0); y[3]=max(y[3],0.0);

  mediump vec3 o = vec3(BIAS_LIST_TWO);
  o += y[0][0]*vec3(__W2_0__)+y[0][1]*vec3(__W2_1__)+y[0][2]*vec3(__W2_2__)+y[0][3]*vec3(__W2_3__)
     + y[1][0]*vec3(__W2_4__)+y[1][1]*vec3(__W2_5__)+y[1][2]*vec3(__W2_6__)+y[1][3]*vec3(__W2_7__)
     + y[2][0]*vec3(__W2_8__)+y[2][1]*vec3(__W2_9__)+y[2][2]*vec3(__W2_10__)+y[2][3]*vec3(__W2_11__)
     + y[3][0]*vec3(__W2_12__)+y[3][1]*vec3(__W2_13__)+y[3][2]*vec3(__W2_14__)+y[3][3]*vec3(__W2_15__);
  return 1.0/(1.0+exp(-o));
}

void main(){
  vec4 f1 = texture(tDiffuse0, vUv);
  if (f1.r == 0.0) discard;
  vec3 dir = normalize(rayDirection);
  vec4 vdir = vec4(dir*0.5 + 0.5, 1.0);
  vec4 f2 = texture(tDiffuse1, vUv);
  f1.a = f1.a*2.0 - 1.0;
  f2.a = f2.a*2.0 - 1.0;
  vec3 col = mlp(f1, f2, vdir);
  fragColor = vec4(col, 1.0);
}
`;

type Weights = Record<"0_bias" | "1_bias" | "2_bias", number[]> &
  Record<"0_weights" | "1_weights" | "2_weights", number[][]>;

function injectWeights(src: string, w: Weights): string {
  src = src.replace(/BIAS_LIST_ZERO/g, w["0_bias"].join(","));
  src = src.replace(/BIAS_LIST_ONE/g, w["1_bias"].join(","));
  src = src.replace(/BIAS_LIST_TWO/g, w["2_bias"].join(","));
  w["0_weights"].forEach((v, i) => (src = src.replace(new RegExp(`__W0_${i}__`, `g`), v.join(","))));
  w["1_weights"].forEach((v, i) => (src = src.replace(new RegExp(`__W1_${i}__`, `g`), v.join(","))));
  w["2_weights"].forEach((v, i) => (src = src.replace(new RegExp(`__W2_${i}__`, `g`), v.join(","))));
  return src;
}

const objectScale = 0.1;

// The scenes were baked against white, but the backdrop follows the theme's well colour.
const backdrop = () =>
  getComputedStyle(document.documentElement).getPropertyValue("--well").trim() || "#ffffff";

export default function NerfViewer({ id }: { id: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const theme = useTheme();
  const [progress, setProgress] = useState({ loaded: 0, total: 1, text: "Loading scene metadata…" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    if (!WebGL.isWebGL2Available()) {
      queueMicrotask(() => setError("WebGL2 is not available in this browser."));
      return;
    }

    let cancelled = false;
    const abort = new AbortController();

    /************************* Three.js boilerplate *************************/
    const renderer = new THREE.WebGLRenderer({ powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(backdrop(), 1);
    rendererRef.current = renderer;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);
    renderer.domElement.addEventListener("webglcontextlost", () => {
      if (!cancelled) setError("The WebGL context was lost. Reload the page to try again.");
    });

    const camera = new THREE.PerspectiveCamera(39, 1, 0.3 * objectScale, 6 * objectScale);
    camera.position.set(0, 2 * objectScale, 3.464 * objectScale);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const scene = new THREE.Scene();

    const resize = () => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    /************************* Progress helpers *************************/
    let total = 1; // we will at least fetch data.json
    let loaded = 0;
    const inc = (text: string) => {
      if (!cancelled) setProgress({ loaded: ++loaded, total, text });
    };

    // Everything created below is disposed on unmount.
    const disposables: { dispose(): void }[] = [];

    /************************* Start loading *************************/
    // Every download goes through fetch with the abort signal, so leaving the page stops them
    // and nothing is parsed or added to the scene afterwards.
    const root = (file: string) => media(`nerf/${id}_mac/${file}`);
    const get = async (file: string) => {
      const r = await fetch(root(file), { signal: abort.signal });
      if (!r.ok) throw new Error(`${r.status} Unable to load ${file}`);
      return r;
    };
    const imageLoader = new THREE.ImageLoader();
    const loadTexture = async (file: string, tex: THREE.Texture) => {
      const url = URL.createObjectURL(await (await get(file)).blob());
      try {
        const image = await imageLoader.loadAsync(url);
        if (cancelled) return;
        tex.image = image;
        tex.needsUpdate = true;
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    (async () => {
      const meta = await (await get("data.json")).json();
      const N: number = meta.num_obj ?? 1;
      total = 2 + N + N * 2; // data.json + mlp.json + N objs + N*2 textures
      inc("Downloading weights…"); // count data.json

      const weights: Weights = await (await get("mlp.json")).json();
      if (cancelled) return;
      inc("Loading geometry and textures…");

      const fragSrc = injectWeights(FRAG_TEMPLATE, weights);
      const objLoader = new OBJLoader();
      const loads: Promise<void>[] = [];

      for (let i = 0; i < N; i++) {
        const tex0 = new THREE.Texture();
        const tex1 = new THREE.Texture();
        tex0.magFilter = tex0.minFilter = THREE.NearestFilter;
        tex1.magFilter = tex1.minFilter = THREE.NearestFilter;

        const material = new THREE.RawShaderMaterial({
          vertexShader: VERT_SRC,
          fragmentShader: fragSrc,
          uniforms: {
            tDiffuse0: { value: tex0 },
            tDiffuse1: { value: tex1 },
          },
          side: THREE.DoubleSide,
          glslVersion: THREE.GLSL3,
        });
        disposables.push(tex0, tex1, material);

        loads.push(
          loadTexture(`shape${i}.pngfeat0.png`, tex0).then(() => inc(`Texture ${i}/0`)),
          loadTexture(`shape${i}.pngfeat1.png`, tex1).then(() => inc(`Texture ${i}/1`)),
          get(`shape${i}.obj`)
            .then((r) => r.text())
            .then((text) => {
              if (cancelled) return;
              const obj = objLoader.parse(text);
              obj.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.material = material;
                  disposables.push(child.geometry);
                }
              });
              obj.scale.setScalar(objectScale);
              scene.add(obj);
              inc(`OBJ ${i}`);
            }),
        );
      }
      await Promise.all(loads);
    })().catch((err) => {
      if (cancelled) return;
      console.error("NerfViewer load error", err);
      setError(String(err?.message || err));
    });

    /************************* Animation loop *************************/
    let frameId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    /************************* Cleanup *************************/
    return () => {
      cancelled = true;
      rendererRef.current = null;
      abort.abort();
      cancelAnimationFrame(frameId);
      ro.disconnect();
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [id]);

  useEffect(() => {
    rendererRef.current?.setClearColor(backdrop(), 1);
  }, [theme]);

  const done = progress.loaded >= progress.total;

  return (
    <div className="clay w-full p-3 sm:p-4">
      <div className="clay-inset relative aspect-square overflow-hidden">
        <div ref={mountRef} className="h-full w-full" />
        {(!done || error) && (
          <LoadingOverlay
            text={progress.text}
            progress={progress.loaded / progress.total}
            detail={`${progress.loaded} / ${progress.total} files`}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
