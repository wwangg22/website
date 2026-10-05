"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingOverlay } from "./ui";

// Gaussian-splat viewer (ported from the old 3DGaussianRenderer / GaussianSplatViewerPath).
// Without `camerasUrl` it is the free-look viewer: the slider dollies between two fixed
// points and dragging looks around. With `camerasUrl` it follows that camera track and
// dragging offsets the view from it.
export interface SplatViewerProps {
  splatUrl: string;
  camerasUrl?: string;
}

/* ---------------------------------- math ---------------------------------- */

const wrapPi = (a: number) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const DIAG_FOV_DEG = 70;
const DIAG_FOV = (DIAG_FOV_DEG * Math.PI) / 180;

function getProjectionMatrix(fx: number, fy: number, width: number, height: number) {
  const znear = 0.2;
  const zfar = 200;
  return [
    [(2 * fx) / width, 0, 0, 0],
    [0, -(2 * fy) / height, 0, 0],
    [0, 0, zfar / (zfar - znear), 1],
    [0, 0, -(zfar * znear) / (zfar - znear), 0],
  ].flat();
}

function multiply4(a: number[], b: number[]) {
  return [
    b[0] * a[0] + b[1] * a[4] + b[2] * a[8] + b[3] * a[12],
    b[0] * a[1] + b[1] * a[5] + b[2] * a[9] + b[3] * a[13],
    b[0] * a[2] + b[1] * a[6] + b[2] * a[10] + b[3] * a[14],
    b[0] * a[3] + b[1] * a[7] + b[2] * a[11] + b[3] * a[15],
    b[4] * a[0] + b[5] * a[4] + b[6] * a[8] + b[7] * a[12],
    b[4] * a[1] + b[5] * a[5] + b[6] * a[9] + b[7] * a[13],
    b[4] * a[2] + b[5] * a[6] + b[6] * a[10] + b[7] * a[14],
    b[4] * a[3] + b[5] * a[7] + b[6] * a[11] + b[7] * a[15],
    b[8] * a[0] + b[9] * a[4] + b[10] * a[8] + b[11] * a[12],
    b[8] * a[1] + b[9] * a[5] + b[10] * a[9] + b[11] * a[13],
    b[8] * a[2] + b[9] * a[6] + b[10] * a[10] + b[11] * a[14],
    b[8] * a[3] + b[9] * a[7] + b[10] * a[11] + b[11] * a[15],
    b[12] * a[0] + b[13] * a[4] + b[14] * a[8] + b[15] * a[12],
    b[12] * a[1] + b[13] * a[5] + b[14] * a[9] + b[15] * a[13],
    b[12] * a[2] + b[13] * a[6] + b[14] * a[10] + b[15] * a[14],
    b[12] * a[3] + b[13] * a[7] + b[14] * a[11] + b[15] * a[15],
  ];
}

function invert4(a: number[]) {
  const b00 = a[0] * a[5] - a[1] * a[4];
  const b01 = a[0] * a[6] - a[2] * a[4];
  const b02 = a[0] * a[7] - a[3] * a[4];
  const b03 = a[1] * a[6] - a[2] * a[5];
  const b04 = a[1] * a[7] - a[3] * a[5];
  const b05 = a[2] * a[7] - a[3] * a[6];
  const b06 = a[8] * a[13] - a[9] * a[12];
  const b07 = a[8] * a[14] - a[10] * a[12];
  const b08 = a[8] * a[15] - a[11] * a[12];
  const b09 = a[9] * a[14] - a[10] * a[13];
  const b10 = a[9] * a[15] - a[11] * a[13];
  const b11 = a[10] * a[15] - a[11] * a[14];
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  return [
    (a[5] * b11 - a[6] * b10 + a[7] * b09) / det,
    (a[2] * b10 - a[1] * b11 - a[3] * b09) / det,
    (a[13] * b05 - a[14] * b04 + a[15] * b03) / det,
    (a[10] * b04 - a[9] * b05 - a[11] * b03) / det,
    (a[6] * b08 - a[4] * b11 - a[7] * b07) / det,
    (a[0] * b11 - a[2] * b08 + a[3] * b07) / det,
    (a[14] * b02 - a[12] * b05 - a[15] * b01) / det,
    (a[8] * b05 - a[10] * b02 + a[11] * b01) / det,
    (a[4] * b10 - a[5] * b08 + a[7] * b06) / det,
    (a[1] * b08 - a[0] * b10 - a[3] * b06) / det,
    (a[12] * b04 - a[13] * b02 + a[15] * b00) / det,
    (a[9] * b02 - a[8] * b04 - a[11] * b00) / det,
    (a[5] * b07 - a[4] * b09 - a[6] * b06) / det,
    (a[0] * b09 - a[1] * b07 + a[2] * b06) / det,
    (a[13] * b01 - a[12] * b03 - a[14] * b00) / det,
    (a[8] * b03 - a[9] * b01 + a[10] * b00) / det,
  ];
}

function safeAsin(x: number) {
  return Math.asin(Math.max(-1, Math.min(1, x)));
}

function makeViewMatrix(yaw: number, pitch: number, pos: number[]) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);

  const right = [cy, 0, -sy];
  const up = [sy * sp, cp, cy * sp];
  const back = [sy * cp, -sp, cy * cp];

  return invert4([
    right[0], right[1], right[2], 0,
    up[0], up[1], up[2], 0,
    back[0], back[1], back[2], 0,
    pos[0], pos[1], pos[2], 1,
  ]);
}

function yawPitchFromRot3(R: number[][]) {
  const bx = R[0][2];
  const by = R[1][2];
  const bz = R[2][2];
  return [Math.atan2(bx, bz), safeAsin(-by)] as const;
}

type PathKeyframe = { pos: number[]; yaw: number; pitch: number };

function samplePath(path: PathKeyframe[], t: number) {
  const n = path.length - 1;
  if (n <= 0) return path[0];

  const s = Math.min(t * n, n - 1e-6);
  const i = Math.floor(s);
  const u = s - i;

  const a = path[i];
  const b = path[i + 1];

  const pos = [
    a.pos[0] + (b.pos[0] - a.pos[0]) * u,
    a.pos[1] + (b.pos[1] - a.pos[1]) * u,
    a.pos[2] + (b.pos[2] - a.pos[2]) * u,
  ];

  const dyaw = wrapPi(b.yaw - a.yaw);
  const yaw = wrapPi(a.yaw + dyaw * u);
  const pitch = a.pitch + (b.pitch - a.pitch) * u;

  return { pos, yaw, pitch };
}

/* --------------------------------- worker --------------------------------- */

type WorkerScope = {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent) => void) | null;
};

// Stringified into a blob worker, so it must not reference anything outside itself.
function createWorker(self: WorkerScope) {
  let buffer: ArrayBuffer | undefined;
  let vertexCount = 0;
  let viewProj: number[] | undefined;

  let lastProj: number[] = [];
  let depthIndex = new Uint32Array();
  let lastVertexCount = 0;

  const _floatView = new Float32Array(1);
  const _int32View = new Int32Array(_floatView.buffer);

  function floatToHalf(float: number) {
    _floatView[0] = float;
    const f = _int32View[0];

    const sign = (f >> 31) & 0x0001;
    const exp = (f >> 23) & 0x00ff;
    let frac = f & 0x007fffff;

    let newExp;
    if (exp == 0) {
      newExp = 0;
    } else if (exp < 113) {
      newExp = 0;
      frac |= 0x00800000;
      frac = frac >> (113 - exp);
      if (frac & 0x01000000) {
        newExp = 1;
        frac = 0;
      }
    } else if (exp < 142) {
      newExp = exp - 112;
    } else {
      newExp = 31;
      frac = 0;
    }
    return (sign << 15) | (newExp << 10) | (frac >> 13);
  }

  function packHalf2x16(x: number, y: number) {
    return (floatToHalf(x) | (floatToHalf(y) << 16)) >>> 0;
  }

  function generateTexture() {
    if (!buffer) return;
    const f_buffer = new Float32Array(buffer);
    const u_buffer = new Uint8Array(buffer);

    const texwidth = 1024 * 2;
    const texheight = Math.ceil((2 * vertexCount) / texwidth);
    const texdata = new Uint32Array(texwidth * texheight * 4);
    const texdata_c = new Uint8Array(texdata.buffer);
    const texdata_f = new Float32Array(texdata.buffer);

    for (let i = 0; i < vertexCount; i++) {
      texdata_f[8 * i + 0] = f_buffer[8 * i + 0];
      texdata_f[8 * i + 1] = f_buffer[8 * i + 1];
      texdata_f[8 * i + 2] = f_buffer[8 * i + 2];

      texdata_c[4 * (8 * i + 7) + 0] = u_buffer[32 * i + 24 + 0];
      texdata_c[4 * (8 * i + 7) + 1] = u_buffer[32 * i + 24 + 1];
      texdata_c[4 * (8 * i + 7) + 2] = u_buffer[32 * i + 24 + 2];
      texdata_c[4 * (8 * i + 7) + 3] = u_buffer[32 * i + 24 + 3];

      const scale = [
        f_buffer[8 * i + 3 + 0],
        f_buffer[8 * i + 3 + 1],
        f_buffer[8 * i + 3 + 2],
      ];
      const rot = [
        (u_buffer[32 * i + 28 + 0] - 128) / 128,
        (u_buffer[32 * i + 28 + 1] - 128) / 128,
        (u_buffer[32 * i + 28 + 2] - 128) / 128,
        (u_buffer[32 * i + 28 + 3] - 128) / 128,
      ];

      const M = [
        1.0 - 2.0 * (rot[2] * rot[2] + rot[3] * rot[3]),
        2.0 * (rot[1] * rot[2] + rot[0] * rot[3]),
        2.0 * (rot[1] * rot[3] - rot[0] * rot[2]),

        2.0 * (rot[1] * rot[2] - rot[0] * rot[3]),
        1.0 - 2.0 * (rot[1] * rot[1] + rot[3] * rot[3]),
        2.0 * (rot[2] * rot[3] + rot[0] * rot[1]),

        2.0 * (rot[1] * rot[3] + rot[0] * rot[2]),
        2.0 * (rot[2] * rot[3] - rot[0] * rot[1]),
        1.0 - 2.0 * (rot[1] * rot[1] + rot[2] * rot[2]),
      ].map((k, idx) => k * scale[Math.floor(idx / 3)]);

      const sigma = [
        M[0] * M[0] + M[3] * M[3] + M[6] * M[6],
        M[0] * M[1] + M[3] * M[4] + M[6] * M[7],
        M[0] * M[2] + M[3] * M[5] + M[6] * M[8],
        M[1] * M[1] + M[4] * M[4] + M[7] * M[7],
        M[1] * M[2] + M[4] * M[5] + M[7] * M[8],
        M[2] * M[2] + M[5] * M[5] + M[8] * M[8],
      ];

      texdata[8 * i + 4] = packHalf2x16(4 * sigma[0], 4 * sigma[1]);
      texdata[8 * i + 5] = packHalf2x16(4 * sigma[2], 4 * sigma[3]);
      texdata[8 * i + 6] = packHalf2x16(4 * sigma[4], 4 * sigma[5]);
    }

    self.postMessage({ texdata, texwidth, texheight }, [texdata.buffer]);
  }

  function runSort(vp: number[]) {
    if (!buffer) return;
    const f_buffer = new Float32Array(buffer);

    if (lastVertexCount == vertexCount) {
      const dot = lastProj[2] * vp[2] + lastProj[6] * vp[6] + lastProj[10] * vp[10];
      if (Math.abs(dot - 1) < 0.01) return;
    } else {
      generateTexture();
      lastVertexCount = vertexCount;
    }

    let maxDepth = -Infinity;
    let minDepth = Infinity;
    const sizeList = new Int32Array(vertexCount);

    for (let i = 0; i < vertexCount; i++) {
      const depth = ((vp[2] * f_buffer[8 * i + 0] + vp[6] * f_buffer[8 * i + 1] + vp[10] * f_buffer[8 * i + 2]) * 4096) | 0;
      sizeList[i] = depth;
      if (depth > maxDepth) maxDepth = depth;
      if (depth < minDepth) minDepth = depth;
    }

    const depthInv = (256 * 256 - 1) / (maxDepth - minDepth);
    const counts0 = new Uint32Array(256 * 256);
    for (let i = 0; i < vertexCount; i++) {
      sizeList[i] = ((sizeList[i] - minDepth) * depthInv) | 0;
      counts0[sizeList[i]]++;
    }
    const starts0 = new Uint32Array(256 * 256);
    for (let i = 1; i < 256 * 256; i++) starts0[i] = starts0[i - 1] + counts0[i - 1];

    depthIndex = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) depthIndex[starts0[sizeList[i]]++] = i;

    lastProj = vp;
    self.postMessage({ depthIndex, viewProj: vp, vertexCount }, [depthIndex.buffer]);
  }

  let sortRunning = false;
  const throttledSort = () => {
    if (sortRunning) return;
    sortRunning = true;
    const lastView = viewProj!;
    runSort(lastView);
    setTimeout(() => {
      sortRunning = false;
      if (lastView !== viewProj) throttledSort();
    }, 0);
  };

  self.onmessage = (e: MessageEvent) => {
    const data = e.data as { buffer?: ArrayBuffer; vertexCount?: number; view?: number[] };
    if (data.buffer) {
      buffer = data.buffer;
      vertexCount = data.vertexCount!;
    } else if (data.vertexCount) {
      vertexCount = data.vertexCount;
    } else if (data.view) {
      viewProj = data.view;
      throttledSort();
    }
  };
}

/* --------------------------------- shaders -------------------------------- */

const vertexShaderSource = `#version 300 es
precision highp float;
precision highp int;

uniform highp usampler2D u_texture;
uniform mat4 projection, view;
uniform vec2 focal;
uniform vec2 viewport;

in vec2 position;
in int index;

out vec4 vColor;
out vec2 vPosition;

void main () {
    uvec4 cen = texelFetch(u_texture, ivec2((uint(index) & 0x3ffu) << 1, uint(index) >> 10), 0);
    vec4 cam = view * vec4(uintBitsToFloat(cen.xyz), 1);
    vec4 pos2d = projection * cam;

    float clip = 1.2 * pos2d.w;
    if (pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }

    uvec4 cov = texelFetch(u_texture, ivec2(((uint(index) & 0x3ffu) << 1) | 1u, uint(index) >> 10), 0);
    vec2 u1 = unpackHalf2x16(cov.x), u2 = unpackHalf2x16(cov.y), u3 = unpackHalf2x16(cov.z);
    mat3 Vrk = mat3(u1.x, u1.y, u2.x, u1.y, u2.y, u3.x, u2.x, u3.x, u3.y);

    mat3 J = mat3(
        focal.x / cam.z, 0., -(focal.x * cam.x) / (cam.z * cam.z),
        0., -focal.y / cam.z, (focal.y * cam.y) / (cam.z * cam.z),
        0., 0., 0.
    );

    mat3 T = transpose(mat3(view)) * J;
    mat3 cov2d = transpose(T) * Vrk * T;

    float mid = (cov2d[0][0] + cov2d[1][1]) / 2.0;
    float radius = length(vec2((cov2d[0][0] - cov2d[1][1]) / 2.0, cov2d[0][1]));
    float lambda1 = mid + radius, lambda2 = mid - radius;

    if(lambda2 < 0.0) return;
    vec2 diagonalVector = normalize(vec2(cov2d[0][1], lambda1 - cov2d[0][0]));
    vec2 majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
    vec2 minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);

    vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu) / 255.0;
    vPosition = position;

    vec2 vCenter = vec2(pos2d) / pos2d.w;
    gl_Position = vec4(
        vCenter
        + position.x * majorAxis / viewport
        + position.y * minorAxis / viewport, 0.0, 1.0);
}
`.trim();

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vPosition;

out vec4 fragColor;

void main () {
    float A = -dot(vPosition, vPosition);
    if (A < -4.0) discard;
    float B = exp(A) * vColor.a;
    fragColor = vec4(B * vColor.rgb, B);
}
`.trim();

/* -------------------------------- component ------------------------------- */

type Status = {
  text: string;
  bytes: number;
  total: number;
  verts: number;
  done: boolean;
  error: string | null;
};

const MB = (n: number) => (n / 1e6).toFixed(1);

export default function SplatViewer({ splatUrl, camerasUrl }: SplatViewerProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  const [fps, setFps] = useState(0);
  const [status, setStatus] = useState<Status>({
    text: camerasUrl ? "Loading cameras…" : "Loading splat…",
    bytes: 0,
    total: 0,
    verts: 0,
    done: false,
    error: null,
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const slider = sliderRef.current;
    if (!wrap || !slider) return;

    // A fresh canvas per run, so its context can be released on cleanup.
    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full touch-none";
    wrap.prepend(canvas);

    let cancelled = false;
    const abort = new AbortController();
    const update = (s: Partial<Status>) => {
      if (!cancelled) setStatus((prev) => ({ ...prev, ...s }));
    };
    const fail = (e: unknown) => update({ error: String((e as Error)?.message || e) });

    const LERP_RATE = 8;
    const ROTATE_SPEED = 1.7;

    // Free-look: dolly START_POS -> END_POS, look around within limits.
    const START_POS = [0.5828, -0.0901, 1.6495];
    const END_POS = [1.3242, -0.3213, 4.0102];
    const yaw0 = 0.35;
    const pitch0 = 0.0006108470632345802;
    const MIN_PITCH = -Math.PI / 4 + 0.01;
    const MAX_PITCH = Math.PI / 4 - 0.01;
    const MIN_YAW = 0.35 - Math.PI / 2;
    const MAX_YAW = 0.35 + Math.PI / 2;
    let targetYaw = yaw0;
    let targetPitch = pitch0;
    let currentYaw = yaw0;
    let currentPitch = pitch0;

    // Path: follow the camera keyframes, drag offsets yaw/pitch by up to ±RANGE/2.
    let PATH: PathKeyframe[] = [];
    const YAW_RANGE = Math.PI / 2;
    const PITCH_RANGE = Math.PI / 2;
    let yawFrac = 0.5;
    let pitchFrac = 0.5;

    let targetT = 0;
    let currentT = 0;

    let dragging = false;
    let px = 0;
    let py = 0;

    let viewW = 1;
    let viewH = 1;
    let fx = 1, fy = 1;
    function updateFocalLengths() {
      const minDim = Math.min(viewW, viewH);
      const f = (0.5 * minDim) / Math.tan(DIAG_FOV / 2);
      fx = f;
      fy = f;
    }

    // --- WebGL init ---
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) {
      canvas.remove();
      queueMicrotask(() => fail("WebGL2 not available."));
      return;
    }

    const shaders: WebGLShader[] = [];
    function compile(type: number, src: string) {
      const sh = gl!.createShader(type)!;
      shaders.push(sh);
      gl!.shaderSource(sh, src);
      gl!.compileShader(sh);
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
        console.error(gl!.getShaderInfoLog(sh));
        throw new Error("Shader compile failed (see console).");
      }
      return sh;
    }

    const program = gl.createProgram();
    try {
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShaderSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShaderSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        throw new Error("Program link failed (see console).");
      }
      gl.useProgram(program);
    } catch (e) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      queueMicrotask(() => fail(e));
      return;
    }

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE_MINUS_DST_ALPHA, gl.ONE, gl.ONE_MINUS_DST_ALPHA, gl.ONE);
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

    const u_projection = gl.getUniformLocation(program, "projection");
    const u_viewport = gl.getUniformLocation(program, "viewport");
    const u_focal = gl.getUniformLocation(program, "focal");
    const u_view = gl.getUniformLocation(program, "view");

    // quad geometry
    const quad = new Float32Array([-2, -2, 2, -2, 2, 2, -2, 2]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const a_position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    // texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

    // index buffer (instanced)
    const indexBuffer = gl.createBuffer();
    const a_index = gl.getAttribLocation(program, "index");
    gl.enableVertexAttribArray(a_index);
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
    gl.vertexAttribIPointer(a_index, 1, gl.INT, 0, 0);
    gl.vertexAttribDivisor(a_index, 1);

    // worker
    const workerBlob = new Blob([`(${createWorker.toString()})(self)`], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);
    URL.revokeObjectURL(workerUrl);

    // resize + projection
    let projectionMatrix: number[] = [];
    let downsample = 1;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      viewW = Math.max(1, Math.floor(r.width));
      viewH = Math.max(1, Math.floor(r.height));

      updateFocalLengths();
      gl.uniform2fv(u_focal, new Float32Array([fx, fy]));

      projectionMatrix = getProjectionMatrix(fx, fy, viewW, viewH);
      gl.uniform2fv(u_viewport, new Float32Array([viewW, viewH]));

      gl.canvas.width = Math.round(viewW / downsample);
      gl.canvas.height = Math.round(viewH / downsample);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      gl.uniformMatrix4fv(u_projection, false, projectionMatrix);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    // slider (t in 0..1)
    const onSlider = () => {
      targetT = (Number(slider.value) || 0) / 100;
    };
    slider.addEventListener("input", onSlider);
    onSlider();

    // wheel moves along the path (and doesn't scroll the page while over the stage)
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // browser zoom / trackpad pinch
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      const step = 0.05;
      targetT = clamp(targetT + dir * step, 0, 1);
      slider.value = String(targetT * 100);
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });

    // pointer drag -> look around
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    canvas.addEventListener("contextmenu", onContextMenu);
    const onContextLost = () => fail("The WebGL context was lost. Reload the page to try again.");
    canvas.addEventListener("webglcontextlost", onContextLost);

    const onPointerDown = (ev: PointerEvent) => {
      canvas.setPointerCapture(ev.pointerId);
      if (ev.isPrimary) {
        dragging = true;
        px = ev.clientX;
        py = ev.clientY;
      }
    };
    const onPointerMove = (ev: PointerEvent) => {
      if (!dragging || !ev.isPrimary) return;
      if (ev.buttons & 1 || ev.pointerType === "touch") {
        const dx = (ev.clientX - px) / viewW;
        const dy = (ev.clientY - py) / viewH;

        if (camerasUrl) {
          yawFrac = clamp(yawFrac + dx * ROTATE_SPEED, 0, 1);
          pitchFrac = clamp(pitchFrac - dy * ROTATE_SPEED, 0, 1);
        } else {
          targetYaw = clamp(targetYaw + ROTATE_SPEED * dx, MIN_YAW, MAX_YAW);
          targetPitch = clamp(targetPitch - ROTATE_SPEED * dy, MIN_PITCH, MAX_PITCH);
        }

        px = ev.clientX;
        py = ev.clientY;
      }
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (ev.isPrimary) dragging = false;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    // worker -> upload texture + indices
    let vertexCount = 0;

    worker.onmessage = (e: MessageEvent) => {
      const data = e.data;

      if (data.texdata) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA32UI,
          data.texwidth,
          data.texheight,
          0,
          gl.RGBA_INTEGER,
          gl.UNSIGNED_INT,
          data.texdata,
        );

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
      } else if (data.depthIndex) {
        gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data.depthIndex, gl.DYNAMIC_DRAW);
        const count = data.vertexCount || 0;
        if (count !== vertexCount) update({ verts: count });
        vertexCount = count;
      }
    };

    // 1) cameras -> PATH
    const loadCameras = async (url: string) => {
      const r = await fetch(url, { signal: abort.signal, credentials: "omit" });
      if (!r.ok) throw new Error(`${r.status} Unable to load cameras JSON: ${url}`);
      const cams = await r.json();

      if (!Array.isArray(cams) || cams.length === 0) {
        throw new Error("Cameras JSON is empty or not an array.");
      }

      PATH = [];
      for (const cam of cams) {
        const R = cam.rotation as number[][]; // 3x3
        const t = cam.position as number[]; // [x,y,z]
        if (!R || !t) continue;

        const [yaw, pitch] = yawPitchFromRot3(R);

        // flip Y and Z of the position to match handedness
        PATH.push({ pos: [t[0], -t[1], -t[2]], yaw, pitch });
      }

      if (PATH.length < 1) throw new Error("No valid camera entries found in cameras JSON.");
    };

    // 2) splat, streamed to the worker as it arrives
    const rowLength = 3 * 4 + 3 * 4 + 4 + 4;

    const loadSplat = async () => {
      update({ text: "Loading splat…" });

      const req = await fetch(splatUrl, { signal: abort.signal, credentials: "omit" });
      if (!req.ok) throw new Error(`${req.status} Unable to load splat: ${splatUrl}`);
      update({ total: Number(req.headers.get("content-length")) || 0 });

      let splatData: Uint8Array;
      let bytesRead = 0;

      if (!req.body) {
        splatData = new Uint8Array(await req.arrayBuffer());
        bytesRead = splatData.length;
        worker.postMessage({ buffer: splatData.buffer, vertexCount: Math.floor(bytesRead / rowLength) });
      } else {
        const reader = req.body.getReader();
        splatData = new Uint8Array(1024 * 1024);
        let lastVertexCount = -1;

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          if (bytesRead + value.length > splatData.length) {
            const nextSize = Math.max(splatData.length * 2, bytesRead + value.length);
            const bigger = new Uint8Array(nextSize);
            bigger.set(splatData);
            splatData = bigger;
          }

          splatData.set(value, bytesRead);
          bytesRead += value.length;
          update({ bytes: bytesRead });

          // only push more data once the worker has caught up
          if (vertexCount > lastVertexCount) {
            worker.postMessage({ buffer: splatData.buffer, vertexCount: Math.floor(bytesRead / rowLength) });
            lastVertexCount = vertexCount;
          }
        }

        worker.postMessage({ buffer: splatData.buffer, vertexCount: Math.floor(bytesRead / rowLength) });
      }

      downsample = bytesRead / rowLength > 500000 ? 1 : 1 / window.devicePixelRatio;
      resize();
      update({ bytes: bytesRead, done: true, text: "Rendering…" });
    };

    // 3) render loop
    let frameId = 0;
    let lastFrame = 0;
    let avgFps = 0;
    let lastFpsSet = 0;

    const frame = (now: number) => {
      const dt = (now - lastFrame) * 0.001;
      const k = 1.0 - Math.exp(-LERP_RATE * dt);

      currentT += (targetT - currentT) * k;

      let pose: PathKeyframe | null = null;
      if (camerasUrl) {
        if (PATH.length > 0) {
          const base = samplePath(PATH, currentT);
          pose = {
            pos: base.pos,
            yaw: base.yaw + (yawFrac - 0.5) * YAW_RANGE,
            pitch: base.pitch + (pitchFrac - 0.5) * PITCH_RANGE,
          };
        }
      } else {
        currentYaw += wrapPi(targetYaw - currentYaw) * k;
        currentPitch += (targetPitch - currentPitch) * k;
        pose = {
          pos: [
            lerp(START_POS[0], END_POS[0], currentT),
            lerp(START_POS[1], END_POS[1], currentT),
            lerp(START_POS[2], END_POS[2], currentT),
          ],
          yaw: currentYaw,
          pitch: currentPitch,
        };
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      const vm = pose && makeViewMatrix(pose.yaw, pose.pitch, pose.pos);
      if (vm) {
        worker.postMessage({ view: multiply4(projectionMatrix, vm) });
        if (vertexCount > 0) {
          gl.uniformMatrix4fv(u_view, false, vm);
          gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, vertexCount);
        }
      }

      if (now > lastFrame) avgFps = avgFps * 0.9 + (1000 / (now - lastFrame)) * 0.1;
      if (now - lastFpsSet > 250) {
        setFps(Math.round(avgFps));
        lastFpsSet = now;
      }

      lastFrame = now;
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    (async () => {
      if (camerasUrl) await loadCameras(camerasUrl);
      await loadSplat();
    })().catch((e) => {
      if (!cancelled) fail(e);
    });

    return () => {
      cancelled = true;
      abort.abort();
      cancelAnimationFrame(frameId);
      ro.disconnect();

      slider.removeEventListener("input", onSlider);
      wrap.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);

      worker.terminate();
      gl.deleteBuffer(vertexBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      shaders.forEach((s) => gl.deleteShader(s));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [splatUrl, camerasUrl]);

  const { text, bytes, total, verts, done, error } = status;
  const progress = total ? Math.min(1, bytes / total) : undefined;
  const detail = bytes
    ? `${MB(bytes)}${total ? ` / ${MB(total)}` : ""} MB · ${verts.toLocaleString()} splats`
    : undefined;

  return (
    <div className="clay w-full p-3 sm:p-4">
      <div
        ref={wrapRef}
        className="clay-inset relative aspect-[4/5] overflow-hidden bg-black sm:aspect-video"
      >

        {!done && verts > 0 && (
          <div className="chip pointer-events-none absolute top-3 left-3 z-10">
            Loading {progress !== undefined ? `${Math.round(progress * 100)}%` : `${MB(bytes)} MB`}
          </div>
        )}

        {(error || verts === 0) && (
          <LoadingOverlay text={text} progress={progress} detail={detail} error={error} />
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 sm:mt-4">
        <label className="clay-inset flex flex-1 items-center gap-3 rounded-full px-4 py-2">
          <span className="text-sm font-semibold text-ink-soft">Position</span>
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={100}
            defaultValue={0}
            aria-label="Position along the path"
            className="w-full cursor-pointer [accent-color:var(--coral)]"
          />
        </label>
        <span className="shrink-0 font-mono text-xs text-ink-soft tabular-nums">
          {fps} fps
        </span>
      </div>
    </div>
  );
}
