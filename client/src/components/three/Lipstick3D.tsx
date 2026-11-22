import { useEffect, useRef } from "react";
import { ProductArt } from "@/components/brand/ProductArt";
import { chain, GOLD, hex, mul, perspective, rotX, rotY, rotZ, scale, translate } from "./engine";
import { LIP_CASE, LIPSTICK, WAX } from "./models";
import { useScene } from "./useScene";

const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

/**
 * The hero lipstick, rendered live in 3D.
 *  - drag to spin it
 *  - the cap lifts off and the bullet twists up when the page loads
 *  - changing `color` repaints the bullet and the light around it
 */
export function Lipstick3D({ color, className }: { color: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef(color);
  const kick = useRef(0);

  useEffect(() => {
    if (colorRef.current !== color) kick.current = 5; // a little spin when the shade changes
    colorRef.current = color;
  }, [color]);

  const failed = useScene(canvasRef, (r, canvas) => {
    const ids = Object.fromEntries(Object.entries(LIPSTICK).map(([k, mesh]) => [k, r.add(mesh)])) as Record<keyof typeof LIPSTICK, number>;
    let shade = hex(colorRef.current);
    let yaw = 0.7, yawVel = 0, tiltX = 0, tiltZ = 0, targetX = 0, targetZ = 0, dragging = false, lastX = 0;

    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; yaw += dx * 0.012; yawVel = dx * 0.5; } };
    const up = () => { dragging = false; };
    const hover = (e: PointerEvent) => {
      targetZ = -(e.clientX / window.innerWidth - 0.5) * 0.16;
      targetX = (e.clientY / window.innerHeight - 0.5) * 0.2;
    };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    window.addEventListener("pointermove", hover, { passive: true });

    return {
      frame({ t, dt, w, h, reduced }) {
        const capT = reduced ? 1 : ease((t - 0.25) / 1.3);
        const twist = reduced ? 1 : ease((t - 0.9) / 1.5);
        const target = hex(colorRef.current);
        shade = shade.map((v, i) => v + (target[i] - v) * Math.min(dt * 7, 1)) as [number, number, number];
        if (kick.current) { yawVel += kick.current; kick.current = 0; }
        if (!dragging) { yaw += (reduced ? 0 : 0.35) * dt + yawVel * dt; yawVel *= Math.pow(0.04, dt); }
        tiltX += (targetX - tiltX) * Math.min(dt * 4, 1);
        tiltZ += (targetZ - tiltZ) * Math.min(dt * 4, 1);

        const aspect = w / h;
        const dist = aspect < 0.8 ? 10.5 + (0.8 - aspect) * 7 : 10.5;
        // the lipstick reflects a room painted in its own shade
        r.begin(perspective((28 * Math.PI) / 180, aspect, 1, 40), [shade[0] * 0.8 + 0.12, shade[1] * 0.8 + 0.12, shade[2] * 0.8 + 0.12]);

        const bob = reduced ? 0 : Math.sin(t * 1.1) * 0.06;
        const scroll = Math.min(window.scrollY / 600, 1);
        const view = translate(aspect > 1 ? -0.55 : -0.3, 0.1 + bob, -dist);
        const body = chain(view, rotZ(-0.3 + tiltZ - scroll * 0.25), rotX(0.16 + tiltX), rotY(yaw + scroll * 2.2), scale(1.1));
        r.draw(ids.base, body, LIP_CASE);
        r.draw(ids.band, body, GOLD);
        r.draw(ids.tube, body, GOLD);
        r.draw(ids.bullet, mul(body, translate(0, -0.62 + twist * 0.92, 0)), WAX(shade));

        // the cap starts on the lipstick, then floats off to the side
        const cx = 1.02 * capT, cy = -0.4 + capT * (0.5 + (reduced ? 0 : Math.sin(t * 0.9 + 1) * 0.08)), cz = -0.2 * capT;
        const cap = chain(view, rotZ(-0.3 + tiltZ), rotX(0.16 + tiltX), translate(cx, cy, cz), rotZ(-0.55 * capT), rotX(0.35 * capT * Math.sin(t * 0.6)), rotY(yaw * 0.6), scale(1.1));
        r.draw(ids.cap, cap, LIP_CASE);
        r.draw(ids.capBand, cap, GOLD);
      },
      dispose() {
        canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
        window.removeEventListener("pointermove", hover);
      },
    };
  });

  if (failed) return <div className={className}><ProductArt kind="lipstick" color={color} className="mx-auto h-full animate-floaty" /></div>;
  return <canvas ref={canvasRef} className={className} style={{ touchAction: "pan-y", cursor: "grab" }} aria-label="3D lipstick. Drag to spin." role="img" />;
}
