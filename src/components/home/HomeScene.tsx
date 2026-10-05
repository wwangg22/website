"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "@/lib/useTheme";
import { sections, type SectionId } from "./sections";

// One clay family in both themes: the lighting rig carries light vs. dark,
// so the objects keep their material instead of turning muddy at night.
const CLAY = {
  stone: "#e2dbd1",
  shade: "#bdb3a7",
  graphite: "#6f6973",
  terracotta: "#c58d7b",
  slate: "#8c9fb1",
  ochre: "#c9b17c",
  sage: "#9bb0a0",
};

// Fine grain so surfaces catch light like hand-worked clay instead of flat plastic.
let grain: THREE.CanvasTexture | undefined;
function clayGrain() {
  if (grain) return grain;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.random() * 20;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grain = new THREE.CanvasTexture(canvas);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(3, 3);
  return grain;
}

const Clay = ({ color }: { color: string }) => (
  <meshStandardMaterial color={color} roughness={0.92} metalness={0} bumpMap={clayGrain()} bumpScale={0.6} />
);

function Spin({ speed, children }: { speed: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * speed;
  });
  return <group ref={ref}>{children}</group>;
}

function gearShape(teeth = 18, outer = 1, root = 0.82, hole = 0.26) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const at = (r: number, a: number) => [Math.cos(a) * r, Math.sin(a) * r] as const;
  // Each tooth: root land, flank up, rounded-ish tip (three points), flank down.
  const profile: [number, number][] = [
    [root, 0],
    [root, 0.16],
    [(root + outer) / 2, 0.27],
    [outer, 0.37],
    [outer * 1.006, 0.5],
    [outer, 0.63],
    [(root + outer) / 2, 0.73],
    [root, 0.84],
  ];
  for (let i = 0; i < teeth; i++) {
    profile.forEach(([r, f], j) => {
      const [x, y] = at(r, (i + f) * step);
      if (i === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  shape.holes.push(new THREE.Path().absarc(0, 0, hole, 0, Math.PI * 2, true));
  // Lightening holes, as on a machined gear.
  for (let i = 0; i < 6; i++) {
    const [x, y] = at(0.54, (i / 6) * Math.PI * 2);
    shape.holes.push(new THREE.Path().absarc(x, y, 0.12, 0, Math.PI * 2, true));
  }
  return shape;
}

const bevel = (depth: number, size: number) => ({
  depth,
  bevelEnabled: true,
  bevelSize: size,
  bevelThickness: size,
  bevelSegments: 5,
  curveSegments: 48,
});

function ring(outer: number, inner: number) {
  const shape = new THREE.Shape().absarc(0, 0, outer, 0, Math.PI * 2, false);
  shape.holes.push(new THREE.Path().absarc(0, 0, inner, 0, Math.PI * 2, true));
  return shape;
}

function Gear({ reduced }: { reduced: boolean }) {
  const body = useMemo(() => gearShape(), []);
  const hub = useMemo(() => ring(0.4, 0.26), []);
  return (
    <group rotation={[0.3, -0.4, 0]}>
      <Spin speed={reduced ? 0 : 0.3}>
        <mesh position={[0, 0, -0.14]}>
          <extrudeGeometry args={[body, bevel(0.28, 0.035)]} />
          <Clay color={CLAY.terracotta} />
        </mesh>
        <mesh position={[0, 0, -0.22]}>
          <extrudeGeometry args={[hub, bevel(0.44, 0.03)]} />
          <Clay color={CLAY.terracotta} />
        </mesh>
      </Spin>
    </group>
  );
}

function Chip() {
  const pins = Array.from({ length: 9 }, (_, i) => (i - 4) * 0.14);
  return (
    <group rotation={[-0.5, 0.5, 0.12]}>
      <RoundedBox args={[1.5, 1.5, 0.24]} radius={0.06} smoothness={5}>
        <Clay color={CLAY.slate} />
      </RoundedBox>
      {/* Die: a low raised plate in the same family, with a small orientation dot. */}
      <RoundedBox args={[0.86, 0.86, 0.05]} radius={0.02} smoothness={4} position={[0, 0, 0.14]}>
        <Clay color={CLAY.stone} />
      </RoundedBox>
      <mesh position={[-0.56, 0.56, 0.115]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 24]} />
        <Clay color={CLAY.shade} />
      </mesh>
      {pins.flatMap((o) =>
        [0, 1, 2, 3].map((side) => (
          <group key={`${side}${o}`} rotation={[0, 0, (side * Math.PI) / 2]}>
            <RoundedBox args={[0.07, 0.24, 0.06]} radius={0.02} position={[o, 0.82, -0.06]}>
              <Clay color={CLAY.ochre} />
            </RoundedBox>
          </group>
        )),
      )}
    </group>
  );
}

function Notebook() {
  return (
    <group rotation={[0, -0.45, 0.06]}>
      {/* Page block, slightly inset from the two covers so the edges read as paper. */}
      <RoundedBox args={[1.12, 1.52, 0.2]} radius={0.02} position={[0.03, 0, 0]}>
        <Clay color={CLAY.stone} />
      </RoundedBox>
      {[-0.115, 0.115].map((z) => (
        <RoundedBox key={z} args={[1.2, 1.6, 0.035]} radius={0.015} smoothness={4} position={[0, 0, z]}>
          <Clay color={CLAY.ochre} />
        </RoundedBox>
      ))}
      {/* Spine */}
      <RoundedBox args={[0.06, 1.6, 0.265]} radius={0.025} position={[-0.6, 0, 0]}>
        <Clay color={CLAY.ochre} />
      </RoundedBox>
      {/* Elastic band and a debossed label plate */}
      <RoundedBox args={[0.07, 1.61, 0.275]} radius={0.02} position={[0.38, 0, 0]}>
        <Clay color={CLAY.graphite} />
      </RoundedBox>
      <RoundedBox args={[0.5, 0.2, 0.012]} radius={0.005} position={[-0.12, 0.38, 0.135]}>
        <Clay color={CLAY.stone} />
      </RoundedBox>
    </group>
  );
}

function Sheet() {
  const lines: [number, number, number][] = [
    [-0.13, 0.4, 0.5],
    [0, 0.14, 0.76],
    [0, 0, 0.76],
    [0, -0.14, 0.76],
    [-0.12, -0.28, 0.52],
  ];
  return (
    <group rotation={[0, -0.3, 0.08]}>
      {/* Clipboard, paper, clip */}
      <RoundedBox args={[1.22, 1.62, 0.07]} radius={0.03} smoothness={4}>
        <Clay color={CLAY.sage} />
      </RoundedBox>
      <RoundedBox args={[1.04, 1.36, 0.02]} radius={0.008} position={[0, -0.06, 0.045]}>
        <Clay color={CLAY.stone} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.14, 0.07]} radius={0.03} position={[0, 0.7, 0.06]}>
        <Clay color={CLAY.graphite} />
      </RoundedBox>
      {/* Text as faint raised rules rather than black bars */}
      {lines.map(([x, y, w]) => (
        <RoundedBox key={y} args={[w, 0.035, 0.012]} radius={0.005} position={[x, y, 0.058]}>
          <Clay color={CLAY.shade} />
        </RoundedBox>
      ))}
    </group>
  );
}

interface ObjectProps {
  position: [number, number];
  phase: number;
  hovered: boolean;
  reduced: boolean;
  onHover: (over: boolean) => void;
  onActivate: () => void;
  children: ReactNode;
}

// Floats gently, puffs up and wiggles on hover, squishes when clicked.
function ClayObject({ position, phase, hovered, reduced, onHover, onActivate, children }: ObjectProps) {
  const ref = useRef<THREE.Group>(null);
  const size = useRef(1);
  const wiggle = useRef(0);
  const pressedAt = useRef(-1);
  const clock = useThree((s) => s.clock);
  const navTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(navTimer.current), []);

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    size.current = THREE.MathUtils.damp(size.current, hovered ? 1.1 : 1, 8, dt);
    wiggle.current = THREE.MathUtils.damp(wiggle.current, hovered && !reduced ? 1 : 0, 6, dt);

    let squish = 0;
    if (pressedAt.current >= 0) {
      const k = (t - pressedAt.current) / 0.35;
      if (k >= 1) pressedAt.current = -1;
      else squish = Math.sin(k * Math.PI) * 0.18;
    }
    const s = size.current;
    g.scale.set(s * (1 + squish * 0.5), s * (1 - squish), s * (1 + squish * 0.5));
    g.position.set(position[0], position[1] + (reduced ? 0 : Math.sin(t * 1.2 + phase) * 0.05), 0);
    g.rotation.y = reduced ? 0 : Math.sin(t * 0.6 + phase) * 0.22;
    g.rotation.z = Math.sin(t * 6) * 0.04 * wiggle.current;
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(true);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    pressedAt.current = clock.elapsedTime;
    clearTimeout(navTimer.current);
    navTimer.current = setTimeout(onActivate, reduced ? 0 : 300);
  };

  return (
    <group ref={ref} onPointerOver={over} onPointerOut={() => onHover(false)} onClick={click}>
      {children}
    </group>
  );
}

interface SceneProps {
  hovered: SectionId | null;
  onHover: (id: SectionId | null) => void;
  onActivate: (id: SectionId) => void;
}

function Scene({ hovered, onHover, onActivate }: SceneProps) {
  const dark = useTheme() === "dark";
  const viewport = useThree((s) => s.viewport);
  const tilt = useRef<THREE.Group>(null);
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  // A row on wide canvases, a 2x2 grid on narrow ones; shrink to fit either way.
  const narrow = viewport.aspect < 1.3;
  const slots: [number, number][] = narrow
    ? [[-1.25, 1.3], [1.25, 1.3], [-1.25, -1.2], [1.25, -1.2]]
    : [[-3.6, 0], [-1.2, 0], [1.2, 0], [3.6, 0]];
  const fit = Math.min(1.1, viewport.width / (narrow ? 5.9 : 10.6), viewport.height / (narrow ? 5.4 : 3.2));

  useFrame((state, dt) => {
    if (!tilt.current || reduced) return;
    tilt.current.rotation.y = THREE.MathUtils.damp(tilt.current.rotation.y, state.pointer.x * 0.15, 4, dt);
    tilt.current.rotation.x = THREE.MathUtils.damp(tilt.current.rotation.x, -state.pointer.y * 0.1, 4, dt);
  });

  const shapes: Record<SectionId, ReactNode> = {
    garage: <Gear reduced={reduced} />,
    projects: <Chip />,
    blog: <Notebook />,
    resume: <Sheet />,
  };

  return (
    <>
      {/* Studio softboxes: one big key from the upper right, a dim fill, a rim from behind. */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={dark ? 2.2 : 3} position={[4, 6, 5]} scale={[9, 9, 1]} />
        <Lightformer form="rect" intensity={dark ? 0.35 : 0.9} position={[-7, 1, 3]} scale={[6, 8, 1]} />
        <Lightformer form="rect" intensity={dark ? 0.8 : 1.2} position={[0, 4, -7]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={dark ? 0.15 : 0.6} position={[0, -6, 2]} scale={[12, 6, 1]} />
      </Environment>
      <directionalLight position={[4, 6, 5]} intensity={dark ? 0.9 : 1.1} />
      <group ref={tilt} scale={fit}>
        {sections.map((s, i) => (
          <ClayObject
            key={s.id}
            position={slots[i]}
            phase={i * 1.7}
            hovered={hovered === s.id}
            reduced={reduced}
            onHover={(over) => onHover(over ? s.id : null)}
            onActivate={() => onActivate(s.id)}
          >
            {shapes[s.id]}
          </ClayObject>
        ))}
        <ContactShadows
          position={[0, narrow ? -2.2 : -1.02, 0]}
          scale={14}
          blur={2.6}
          far={4}
          opacity={dark ? 0.6 : 0.4}
        />
      </group>
    </>
  );
}

export default function HomeScene(props: SceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 8], fov: 35 }}
      gl={{ alpha: true, antialias: true }}
      style={{ cursor: props.hovered ? "pointer" : "default", touchAction: "pan-y" }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
