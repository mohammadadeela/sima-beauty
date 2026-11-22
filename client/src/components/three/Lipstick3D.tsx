import { useEffect, useRef, useState } from "react";
import { ProductArt } from "@/components/brand/ProductArt";

/**
 * A real-time 3D lipstick drawn with plain WebGL (no 3D library needed).
 * Every part is a "lathe": a 2D outline spun around the vertical axis.
 *  - drag to spin it
 *  - it twists open when the page loads
 *  - changing `color` repaints the bullet
 */

// ───────────── tiny matrix helpers (column-major, like WebGL expects) ─────────────
type M4 = Float32Array;
const ident = (): M4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function mul(a: M4, b: M4): M4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
const translate = (x: number, y: number, z: number): M4 => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
const scale = (s: number): M4 => { const m = ident(); m[0] = m[5] = m[10] = s; return m; };
function rotX(a: number): M4 { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
function rotY(a: number): M4 { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
function rotZ(a: number): M4 { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
function perspective(fovY: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fovY / 2), m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far);
  return m;
}
const chain = (...ms: M4[]) => ms.reduce(mul);

// ───────────── geometry ─────────────
interface Mesh { pos: Float32Array; nor: Float32Array; idx: Uint16Array }
type Cut = (x: number, y: number) => number | null;

/** Spin an outline of [radius, height] points around the Y axis. */
function lathe(profile: [number, number][], cut?: { fn: Cut; normal: [number, number, number] }, seg = 80): Mesh {
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
    const len = Math.hypot(r1 - r0, y1 - y0) || 1;
    const nr = (y1 - y0) / len, ny = -(r1 - r0) / len;
    const base = pos.length / 3;
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      for (const [r, y] of [[r0, y0], [r1, y1]] as const) {
        const x = r * c;
        const limit = cut ? cut.fn(x, y) : null;
        if (limit != null && y > limit) { pos.push(x, limit, r * s); nor.push(...cut!.normal); }
        else { pos.push(x, y, r * s); nor.push(nr * c, ny, nr * s); }
      }
    }
    for (let j = 0; j < seg; j++) {
      const a = base + j * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), idx: new Uint16Array(idx) };
}

const BULLET_R = 0.3, BULLET_TOP = 1.05, SLANT = 0.78;
const slantLen = Math.hypot(SLANT, 1);

const PARTS = {
  // lacquered base
  base: lathe([[0, -1.75], [0.5, -1.75], [0.53, -1.71], [0.53, -0.44], [0.5, -0.4], [0.4, -0.4]]),
  // gold band around the base
  band: lathe([[0.53, -0.72], [0.545, -0.7], [0.545, -0.5], [0.53, -0.48]]),
  // gold inner tube that holds the bullet
  tube: lathe([[0.4, -0.42], [0.4, 0.36], [0.385, 0.385], [0.325, 0.385], [0.325, 0.2]]),
  // the colour itself, with its slanted tip
  bullet: lathe(
    [[BULLET_R, -0.4], [BULLET_R, BULLET_TOP - 0.03], [BULLET_R - 0.03, BULLET_TOP], [0, BULLET_TOP]],
    { fn: (x) => BULLET_TOP - SLANT * (x + BULLET_R) + 0.02, normal: [SLANT / slantLen, 1 / slantLen, 0] },
  ),
  // the cap, floating beside it
  cap: lathe([[0.5, 0], [0.57, 0], [0.57, 1.5], [0.54, 1.54], [0, 1.54]]),
  capBand: lathe([[0.57, 0.02], [0.585, 0.04], [0.585, 0.2], [0.57, 0.22]]),
};

// ───────────── shaders ─────────────
const VERT = `
attribute vec3 aPos; attribute vec3 aNor;
uniform mat4 uMV, uProj;
varying vec3 vNor, vPos;
void main() {
  vec4 p = uMV * vec4(aPos, 1.0);
  vPos = p.xyz;
  vNor = mat3(uMV) * aNor;
  gl_Position = uProj * p;
}`;

const FRAG = `
precision highp float;
uniform vec3 uColor; uniform float uMetal, uGloss;
varying vec3 vNor, vPos;

// A small photo studio made of maths: a big soft box above, a strip light on
// the left, a warm bounce from the right, and a dark floor.
vec3 studio(vec3 r) {
  float top = smoothstep(0.25, 0.95, r.y);
  float strip = exp(-pow((r.x + 0.55) * 3.2, 2.0)) * smoothstep(-0.5, 0.3, r.y);
  float bounce = exp(-pow((r.x - 0.75) * 2.6, 2.0)) * 0.55;
  float floorDark = smoothstep(-0.1, -0.8, r.y);
  vec3 c = vec3(0.16, 0.13, 0.15);
  c += vec3(1.0, 0.97, 0.95) * top * 0.9;
  c += vec3(1.0, 0.98, 0.96) * strip * 1.25;
  c += vec3(1.0, 0.78, 0.74) * bounce;
  return c * (1.0 - floorDark * 0.7);
}

void main() {
  vec3 V = normalize(-vPos);
  vec3 N = normalize(vNor);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(vec3(-0.45, 0.75, 0.6));
  vec3 L2 = normalize(vec3(0.7, 0.1, 0.5));
  float diff = max(dot(N, L), 0.0) * 0.7 + max(dot(N, L2), 0.0) * 0.35 + mix(0.5, 0.28, uGloss);
  vec3 R = reflect(-V, N);
  vec3 env = studio(R);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  float spec = pow(max(dot(normalize(L + V), N), 0.0), mix(18.0, 90.0, uGloss));

  vec3 soft = uColor * diff + env * (0.03 + fres * 0.35) * uGloss + vec3(1.0) * spec * (0.12 + 0.5 * uGloss);
  vec3 metal = uColor * env * 1.25 + vec3(1.0, 0.95, 0.85) * spec * 0.6;
  vec3 col = mix(soft, metal, uMetal);
  col = col / (col + vec3(0.72)) * 1.55;          // gentle highlight roll-off
  gl_FragColor = vec4(pow(col, vec3(0.92)), 1.0);
}`;

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0xc2183f;
  // sRGB → roughly linear, so colours match the swatches after shading
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => Math.pow(v, 1.6)) as [number, number, number];
};

const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

export function Lipstick3D({ color, className }: { color: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef(color);
  const kick = useRef(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (colorRef.current !== color) kick.current = 5; // a little spin when the shade changes
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) { setFailed(true); return; }

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
      console.warn("[Lipstick3D]", e);
      setFailed(true);
      return;
    }
    gl.useProgram(prog);
    const loc = {
      pos: gl.getAttribLocation(prog, "aPos"), nor: gl.getAttribLocation(prog, "aNor"),
      mv: gl.getUniformLocation(prog, "uMV"), proj: gl.getUniformLocation(prog, "uProj"),
      color: gl.getUniformLocation(prog, "uColor"), metal: gl.getUniformLocation(prog, "uMetal"), gloss: gl.getUniformLocation(prog, "uGloss"),
    };
    const buffers = Object.fromEntries(
      Object.entries(PARTS).map(([name, mesh]) => {
        const pos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pos); gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
        const nor = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nor); gl.bufferData(gl.ARRAY_BUFFER, mesh.nor, gl.STATIC_DRAW);
        const idx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
        return [name, { pos, nor, idx, count: mesh.idx.length }];
      }),
    ) as Record<keyof typeof PARTS, { pos: WebGLBuffer; nor: WebGLBuffer; idx: WebGLBuffer; count: number }>;
    gl.enable(gl.DEPTH_TEST);
    gl.enableVertexAttribArray(loc.pos);
    gl.enableVertexAttribArray(loc.nor);

    const draw = (part: keyof typeof PARTS, mv: M4, rgb: number[], metal: number, gloss: number) => {
      const b = buffers[part];
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.vertexAttribPointer(loc.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nor); gl.vertexAttribPointer(loc.nor, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
      gl.uniformMatrix4fv(loc.mv, false, mv);
      gl.uniform3f(loc.color, rgb[0], rgb[1], rgb[2]);
      gl.uniform1f(loc.metal, metal); gl.uniform1f(loc.gloss, gloss);
      gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_SHORT, 0);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const LACQUER = hexToRgb("#FFD9E8"), GOLD = [0.95, 0.72, 0.38];
    let shade = hexToRgb(colorRef.current);
    let yaw = 0.6, yawVel = 0, tiltX = 0, tiltZ = 0, targetX = 0, targetZ = 0;
    let dragging = false, lastX = 0, raf = 0, visible = true, start = 0, last = 0;
    let w = 0, h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || !w || !h) return;
      if (!start) { start = now; last = now; }
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const t = (now - start) / 1000;

      // Intro: cap lifts away, then the bullet twists up.
      const capT = reduced ? 1 : ease((t - 0.25) / 1.3);
      const twist = reduced ? 1 : ease((t - 0.9) / 1.5);

      const target = hexToRgb(colorRef.current);
      shade = shade.map((v, i) => v + (target[i] - v) * Math.min(dt * 7, 1)) as [number, number, number];

      if (kick.current) { yawVel += kick.current; kick.current = 0; }
      if (!dragging) { yaw += (reduced ? 0 : 0.35) * dt + yawVel * dt; yawVel *= Math.pow(0.04, dt); }
      tiltX += (targetX - tiltX) * Math.min(dt * 4, 1);
      tiltZ += (targetZ - tiltZ) * Math.min(dt * 4, 1);

      const aspect = w / h;
      const dist = aspect < 0.8 ? 10.5 + (0.8 - aspect) * 7 : 10.5;
      gl.uniformMatrix4fv(loc.proj, false, perspective((28 * Math.PI) / 180, aspect, 1, 40));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const bob = reduced ? 0 : Math.sin(t * 1.1) * 0.06;
      const scroll = Math.min(window.scrollY / 600, 1);
      const view = translate(aspect > 1 ? -0.95 : -0.32, 0.1 + bob, -dist);
      const body = chain(view, rotZ(-0.3 + tiltZ - scroll * 0.25), rotX(0.16 + tiltX), rotY(yaw + scroll * 2.2), scale(1.12));

      draw("base", body, LACQUER, 0.25, 1);
      draw("band", body, GOLD, 1, 1);
      draw("tube", body, GOLD, 1, 1);
      draw("bullet", mul(body, translate(0, -0.62 + twist * 0.9, 0)), shade, 0, 0.35);

      // Cap: starts sitting on the base, then floats off to the side.
      const cx = 0.95 * capT, cy = -0.4 + capT * (0.55 + (reduced ? 0 : Math.sin(t * 0.9 + 1) * 0.08)), cz = -0.2 * capT;
      const cap = chain(view, rotZ(-0.3 + tiltZ), rotX(0.16 + tiltX), translate(cx, cy, cz),
        rotZ(-0.55 * capT), rotX(0.35 * capT * Math.sin(t * 0.6)), rotY(yaw * 0.6), scale(1.12));
      draw("cap", cap, LACQUER, 0.25, 1);
      draw("capBand", cap, GOLD, 1, 1);
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); });
    io.observe(canvas);

    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; yaw += dx * 0.012; yawVel = dx * 0.5; }
    };
    const up = () => { dragging = false; };
    const hover = (e: PointerEvent) => {
      targetZ = -((e.clientX / window.innerWidth) - 0.5) * 0.18;
      targetX = ((e.clientY / window.innerHeight) - 0.5) * 0.22;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    window.addEventListener("pointermove", hover, { passive: true });

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
      window.removeEventListener("pointermove", hover);
    };
  }, []);

  if (failed) {
    return <div className={className}><ProductArt kind="lipstick" color={color} className="mx-auto h-full w-auto animate-floaty" /></div>;
  }
  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ touchAction: "pan-y", cursor: "grab" }}
      aria-label="3D lipstick. Drag to spin."
      role="img"
    />
  );
}
