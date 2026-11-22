/**
 * A small WebGL renderer written for Sima Beauty. No 3D library is needed.
 *
 * What makes the products look real rather than drawn:
 *  - every edge is rounded, so it catches a highlight like a real object
 *  - materials are physically based (metal, lacquer, wax, powder, mirror)
 *  - objects reflect a photo-studio lighting rig, tinted by the scene colour
 */

// ───────────────────────── matrices (column-major) ─────────────────────────
export type M4 = Float32Array;
export const ident = (): M4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
export function mul(a: M4, b: M4): M4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
export const chain = (...ms: M4[]) => ms.reduce(mul);
export const translate = (x: number, y: number, z: number): M4 => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
export const scale = (x: number, y = x, z = x): M4 => { const m = ident(); m[0] = x; m[5] = y; m[10] = z; return m; };
export function rotX(a: number): M4 { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
export function rotY(a: number): M4 { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
export function rotZ(a: number): M4 { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
export function perspective(fovY: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fovY / 2), m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far);
  return m;
}
export function invert(m: M4): M4 | null {
  const o = new Float32Array(16);
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  det = 1 / det;
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return o;
}
export function apply(m: M4, x: number, y: number, z: number, w = 1): [number, number, number, number] {
  return [m[0] * x + m[4] * y + m[8] * z + m[12] * w, m[1] * x + m[5] * y + m[9] * z + m[13] * w, m[2] * x + m[6] * y + m[10] * z + m[14] * w, m[3] * x + m[7] * y + m[11] * z + m[15] * w];
}

// ───────────────────────────── geometry ─────────────────────────────
export interface Mesh { pos: Float32Array; nor: Float32Array; idx: Uint16Array }
export type Pt = [r: number, y: number, fillet?: number];

/** Round every corner of an outline so edges catch the light. */
export function fillet(points: Pt[], radius = 0.02, steps = 5): [number, number][] {
  const out: [number, number][] = [[points[0][0], points[0][1]]];
  for (let i = 1; i < points.length - 1; i++) {
    const [ax, ay] = points[i - 1], [bx, by, own] = points[i], [cx, cy] = points[i + 1];
    const la = Math.hypot(ax - bx, ay - by), lc = Math.hypot(cx - bx, cy - by);
    const d = Math.min(own ?? radius, la / 2, lc / 2);
    if (d <= 0 || !la || !lc) { out.push([bx, by]); continue; }
    const p1x = bx + ((ax - bx) / la) * d, p1y = by + ((ay - by) / la) * d;
    const p2x = bx + ((cx - bx) / lc) * d, p2y = by + ((cy - by) / lc) * d;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, u = 1 - t;
      out.push([u * u * p1x + 2 * u * t * bx + t * t * p2x, u * u * p1y + 2 * u * t * by + t * t * p2y]);
    }
  }
  const last = points[points.length - 1];
  out.push([last[0], last[1]]);
  return out;
}

interface LatheOptions {
  seg?: number;
  /** >0 turns the circle into a rounded square (higher = squarer). */
  squircle?: number;
  /** stretch in x and z, for oval or rectangular shapes */
  sx?: number; sz?: number;
  /** slice the top off along a slanted plane (the lipstick tip) */
  cut?: { at: (x: number) => number; normal: [number, number, number]; soft: number };
  radius?: number;
}

/** Spin an outline of [radius, height] points around the vertical axis. */
export function lathe(outline: Pt[], o: LatheOptions = {}): Mesh {
  const profile = fillet(outline, o.radius ?? 0.02);
  const seg = o.seg ?? 72, n = o.squircle ?? 0, sx = o.sx ?? 1, sz = o.sz ?? 1;
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  // a smooth normal at every outline point, from the two segments that meet there
  const segN = profile.slice(0, -1).map(([r0, y0], i) => {
    const [r1, y1] = profile[i + 1];
    const len = Math.hypot(r1 - r0, y1 - y0) || 1;
    return [(y1 - y0) / len, -(r1 - r0) / len];
  });
  const ptN = profile.map((_, i) => {
    const a = segN[Math.max(i - 1, 0)], b = segN[Math.min(i, segN.length - 1)];
    const x = a[0] + b[0], y = a[1] + b[1], len = Math.hypot(x, y) || 1;
    return [x / len, y / len];
  });
  for (let i = 0; i < profile.length; i++) {
    const [r, y] = profile[i], [nr, ny] = ptN[i];
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      let k = 1, gx = c, gz = s;
      if (n > 0) {
        k = 1 / Math.pow(Math.pow(Math.abs(c), n) + Math.pow(Math.abs(s), n), 1 / n);
        gx = Math.sign(c) * Math.pow(Math.abs(c), n - 1); gz = Math.sign(s) * Math.pow(Math.abs(s), n - 1);
      }
      gx /= sx; gz /= sz;
      const gl = Math.hypot(gx, gz) || 1;
      const x = r * k * c * sx, z = r * k * s * sz;
      let py = y, nx = (nr * gx) / gl, nyy = ny, nz = (nr * gz) / gl;
      if (o.cut) {
        const limit = o.cut.at(x);
        const t = Math.min(Math.max((y - (limit - o.cut.soft)) / o.cut.soft, 0), 1);
        if (y > limit) py = limit;
        const b = t * t * (3 - 2 * t);
        nx = nx * (1 - b) + o.cut.normal[0] * b; nyy = nyy * (1 - b) + o.cut.normal[1] * b; nz = nz * (1 - b) + o.cut.normal[2] * b;
      }
      const nl = Math.hypot(nx, nyy, nz) || 1;
      pos.push(x, py, z); nor.push(nx / nl, nyy / nl, nz / nl);
    }
  }
  const ring = seg + 1;
  for (let i = 0; i < profile.length - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * ring + j, b = a + ring;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
}

/** A pie slice of pressed powder: flat top with a soft rounded rim. */
export function wedge(r0: number, r1: number, a0: number, a1: number, height: number): Mesh {
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  const steps = 14, bevel = 0.035;
  const rings: [number, number, number, number][] = [ // radius, y, normal-out, normal-up
    [r0, 0, -1, 0], [r0, height - bevel, -1, 0.2], [r0 + bevel, height, -0.3, 1], [r1 - bevel, height, 0.3, 1], [r1, height - bevel, 1, 0.2], [r1, 0, 1, 0],
  ];
  for (const [r, y, no, nu] of rings)
    for (let j = 0; j <= steps; j++) {
      const a = a0 + ((a1 - a0) * j) / steps, c = Math.cos(a), s = Math.sin(a), l = Math.hypot(no, nu);
      pos.push(r * c, y, r * s); nor.push((no * c) / l, nu / l, (no * s) / l);
    }
  const ring = steps + 1;
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < steps; j++) { const a = i * ring + j, b = a + ring; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  // the two straight side walls
  for (const [a, sign] of [[a0, -1], [a1, 1]] as const) {
    const base = pos.length / 3, c = Math.cos(a), s = Math.sin(a);
    for (const [r, y] of [[r0, 0], [r1, 0], [r0, height - bevel], [r1, height - bevel]]) { pos.push(r * c, y, r * s); nor.push(-s * sign, 0, c * sign); }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
}

// ───────────────────────────── materials ─────────────────────────────
/** kind: 0 = standard, 1 = wax (lipstick), 2 = pressed powder, 3 = mirror, 4 = brush hair */
export interface Material { color: [number, number, number]; metal?: number; rough?: number; kind?: number; coat?: number }

export const hex = (h: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h);
  const n = m ? parseInt(m[1], 16) : 0xe8257d;
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => Math.pow(v, 2.2)) as [number, number, number];
};

export const GOLD: Material = { color: [1.0, 0.71, 0.36], metal: 1, rough: 0.22 };
export const lacquer = (h: string): Material => ({ color: hex(h), rough: 0.5, coat: 1 });

const VERT = `
attribute vec3 aPos; attribute vec3 aNor;
uniform mat4 uMV, uProj;
varying vec3 vNor, vPos, vObj;
void main() {
  vec4 p = uMV * vec4(aPos, 1.0);
  vPos = p.xyz; vObj = aPos;
  vNor = mat3(uMV) * aNor;
  gl_Position = uProj * p;
}`;

const FRAG = `
precision highp float;
uniform vec3 uColor, uTint, uMirror;
uniform float uMetal, uRough, uKind, uCoat, uMask;
varying vec3 vNor, vPos, vObj;

float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

// The photo studio around the product: a big soft box overhead, a tall strip
// light on the left, a thin rim light on the right, and walls and floor in the
// colour of the scene, so the product picks up its surroundings.
float band(float d, float w, float e) { return 1.0 - smoothstep(w - e, w + e, abs(d)); }
vec3 studio(vec3 r, float rough) {
  float e = 0.012 + rough * 0.5;
  float strip = band(r.x + 0.5, 0.14, e) * smoothstep(-0.62 - e, -0.38 + e, r.y) * (1.0 - smoothstep(0.72 - e, 0.9 + e, r.y));
  float rim = band(r.x - 0.8, 0.055, e) * smoothstep(-0.45 - e, -0.2 + e, r.y) * (1.0 - smoothstep(0.7 - e, 0.9 + e, r.y));
  float top = smoothstep(0.84 - e, 0.9 + e, r.y);
  vec3 wall = uTint * mix(0.06, 0.3, smoothstep(-1.0, 0.85, r.y));
  wall += uTint * 0.22 * smoothstep(0.0, -0.75, r.y);
  vec3 lights = vec3(1.0, 0.985, 0.965) * (top * 1.5 + strip * 3.4 + rim * 2.4);
  return wall + lights * mix(1.0, 0.3, rough);
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  if (uMask > 0.5) { gl_FragColor = vec4(uMask > 1.5 ? 1.0 : 0.0); return; }
  vec3 V = normalize(-vPos);
  vec3 N = normalize(vNor);
  if (dot(N, V) < 0.0) N = -N;
  float rough = uRough;
  vec3 base = uColor;

  if (uKind > 0.5 && uKind < 1.5) {           // wax: creamy, very fine streaks
    float n = noise(vObj * vec3(60.0, 9.0, 60.0));
    N = normalize(N + (n - 0.5) * 0.05);
    base *= 0.96 + n * 0.06;
  } else if (uKind > 1.5 && uKind < 2.5) {    // powder: grainy and matte
    float g = noise(vObj * 150.0) * 0.5 + noise(vObj * 55.0) * 0.5;
    base *= 0.86 + g * 0.2;
    N = normalize(N + (g - 0.5) * 0.12);
  } else if (uKind > 3.5) {                   // brush hair: thousands of fine fibres
    float f = noise(vec3(atan(vObj.z, vObj.x) * 90.0, vObj.y * 3.0, 1.0));
    base *= 0.72 + f * 0.4;
    N = normalize(N + vec3(f - 0.5, 0.0, f - 0.5) * 0.3);
  }

  float nv = max(dot(N, V), 0.0);
  vec3 R = reflect(-V, N);
  vec3 F0 = mix(vec3(0.04), base, uMetal);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);
  vec3 L = normalize(vec3(-0.5, 0.75, 0.55));
  float wrap = uKind > 0.5 && uKind < 1.5 ? 0.35 : 0.0;
  float direct = max((dot(N, L) + wrap) / (1.0 + wrap), 0.0);
  vec3 irradiance = studio(N, 1.0) * 1.1 + vec3(direct) * 0.85;
  float gloss = uKind > 0.5 && uKind < 1.5 ? 0.08 : uMetal > 0.5 ? 1.25 : 1.0;   // wax only has a soft sheen
  vec3 col = base * (1.0 - uMetal) * irradiance * (1.0 - F) + studio(R, rough) * F * gloss;

  if (uCoat > 0.0) {                          // a glassy clear coat over lacquer
    float fc = 0.06 + 0.94 * pow(1.0 - nv, 5.0);
    col = col * (1.0 - fc) + studio(R, 0.02) * fc * uCoat;
  }
  if (uKind > 2.5 && uKind < 3.5) {           // mirror: bright glass with a streak of light, and the powder reflected near the hinge
    float streak = band(vObj.x * 0.75 + vObj.z * 0.65 + 0.1, 0.1, 0.07) * 0.5 + band(vObj.x * 0.75 + vObj.z * 0.65 - 0.22, 0.03, 0.04) * 0.35;
    vec3 glass = mix(vec3(0.62, 0.56, 0.62), vec3(0.93, 0.9, 0.93), smoothstep(-0.9, 0.9, vObj.z)) + streak;
    float below = smoothstep(0.15, -0.85, vObj.z);
    col = mix(glass, uMirror * 0.9 + 0.06, below * 0.8) * (0.85 + 0.15 * nv);
  }
  col = aces(col * 1.05);
  gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
}`;

export interface Renderer {
  gl: WebGLRenderingContext;
  add: (mesh: Mesh) => number;
  begin: (proj: M4, tint: [number, number, number]) => void;
  draw: (id: number, mv: M4, m: Material, mask?: number, mirror?: [number, number, number]) => void;
  resize: () => { w: number; h: number };
}

/** Set up WebGL on a canvas. Returns null when the device can't do it. */
export function createRenderer(canvas: HTMLCanvasElement, preserve = false): Renderer | null {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: preserve });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
    return sh;
  };
  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
  } catch (e) {
    console.warn("[3D]", e);
    return null;
  }
  gl.useProgram(prog);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const loc = { pos: gl.getAttribLocation(prog, "aPos"), nor: gl.getAttribLocation(prog, "aNor"), mv: U("uMV"), proj: U("uProj"), color: U("uColor"),
    tint: U("uTint"), mirror: U("uMirror"), metal: U("uMetal"), rough: U("uRough"), kind: U("uKind"), coat: U("uCoat"), mask: U("uMask") };
  gl.enable(gl.DEPTH_TEST);
  gl.enableVertexAttribArray(loc.pos); gl.enableVertexAttribArray(loc.nor);
  const meshes: { pos: WebGLBuffer; nor: WebGLBuffer; idx: WebGLBuffer; count: number }[] = [];

  return {
    gl,
    add(mesh) {
      const make = (target: number, data: ArrayBufferView) => { const b = gl.createBuffer()!; gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
      meshes.push({ pos: make(gl.ARRAY_BUFFER, mesh.pos), nor: make(gl.ARRAY_BUFFER, mesh.nor), idx: make(gl.ELEMENT_ARRAY_BUFFER, mesh.idx), count: mesh.idx.length });
      return meshes.length - 1;
    },
    begin(proj, tint) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(loc.proj, false, proj);
      gl.uniform3f(loc.tint, tint[0], tint[1], tint[2]);
    },
    draw(id, mv, m, mask = 0, mirror = [0, 0, 0]) {
      const b = meshes[id];
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.vertexAttribPointer(loc.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nor); gl.vertexAttribPointer(loc.nor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
      gl.uniformMatrix4fv(loc.mv, false, mv);
      gl.uniform3f(loc.color, m.color[0], m.color[1], m.color[2]);
      gl.uniform3f(loc.mirror, mirror[0], mirror[1], mirror[2]);
      gl.uniform1f(loc.metal, m.metal ?? 0); gl.uniform1f(loc.rough, m.rough ?? 0.4);
      gl.uniform1f(loc.kind, m.kind ?? 0); gl.uniform1f(loc.coat, m.coat ?? 0); gl.uniform1f(loc.mask, mask);
      gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_SHORT, 0);
    },
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const cw = Math.max(1, Math.round(w * dpr)), ch = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      gl.viewport(0, 0, canvas.width, canvas.height);
      return { w, h };
    },
  };
}
