import { useEffect, useRef } from "react";
import { apply, chain, GOLD, hex, invert, lacquer, mul, perspective, rotX, rotY, rotZ, scale, translate } from "@/components/three/engine";
import { COMPACT, lidAt, MIRROR, PAN, POWDER } from "@/components/three/models";
import { useScene } from "@/components/three/useScene";
import { cx } from "@/lib/format";

export interface CompactShade { id: string; name: string; hex: string }

const SHELL = lacquer("#E8257D");
const easeOutBack = (t: number) => { const x = Math.min(Math.max(t, 0), 1) - 1; return 1 + 2.2 * x * x * x + 1.2 * x * x; };

/**
 * A real 3D powder compact. It opens when it scrolls into view, the mirror
 * reflects the powder below, and each wedge of pressed powder can be tapped
 * to choose a colour.
 */
export function Compact({ shades, active, onPick }: { shades: CompactShade[]; active: string; onPick: (id: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const state = useRef({ shades, active, onPick });
  useEffect(() => { state.current = { shades, active, onPick }; });
  const current = shades.find((s) => s.id === active) || shades[0];

  const failed = useScene(canvasRef, (r, canvas) => {
    const count = state.current.shades.length;
    const ids = { base: r.add(COMPACT.base), rim: r.add(COMPACT.rim), knob: r.add(COMPACT.knob), lid: r.add(COMPACT.lid), lidRim: r.add(COMPACT.lidRim), mirror: r.add(COMPACT.mirror), hinge: r.add(COMPACT.hinge) };
    const wedges = COMPACT.wedges(count).map((m) => r.add(m));
    const lift = new Array(count).fill(0);
    let mirrorColor = hex(state.current.shades[0].hex);
    let hovered = -1, mvp = perspective(1, 1, 1, 10), size = { w: 1, h: 1 };

    /** Which wedge (if any) is under this point of the canvas? */
    const wedgeAt = (clientX: number, clientY: number): number => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1, ny = 1 - ((clientY - rect.top) / rect.height) * 2;
      const inv = invert(mvp);
      if (!inv) return -1;
      const a = apply(inv, nx, ny, -1), b = apply(inv, nx, ny, 1);
      const p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], p1 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
      const top = PAN.floor + PAN.height;
      const k = (top - p0[1]) / (p1[1] - p0[1]);
      const x = p0[0] + (p1[0] - p0[0]) * k, z = p0[2] + (p1[2] - p0[2]) * k;
      const rad = Math.hypot(x, z);
      if (rad < PAN.r0 || rad > PAN.r1 + 0.03) return -1;
      const ang = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);
      return Math.floor(ang / ((Math.PI * 2) / count));
    };
    const click = (e: MouseEvent) => { const i = wedgeAt(e.clientX, e.clientY); if (i >= 0) state.current.onPick(state.current.shades[i].id); };
    const move = (e: PointerEvent) => { hovered = wedgeAt(e.clientX, e.clientY); canvas.style.cursor = hovered >= 0 ? "pointer" : "default"; };
    const leave = () => { hovered = -1; };
    canvas.addEventListener("click", click); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerleave", leave);

    return {
      frame({ t, dt, w, h, reduced }) {
        size = { w, h };
        const { shades: list, active: on } = state.current;
        const open = (reduced ? 1 : easeOutBack((t - 0.35) / 1.5)) * 1.78;
        const proj = perspective((30 * Math.PI) / 180, w / h, 1, 40);
        r.begin(proj, [0.62, 0.3, 0.45]);
        const sway = reduced ? 0 : Math.sin(t * 0.7) * 0.05;
        const body = chain(translate(0, -0.95, -6.7), rotX(0.7), rotY(sway), scale(1.0));
        mvp = mul(proj, body);

        r.draw(ids.base, body, SHELL);
        r.draw(ids.rim, body, GOLD);
        r.draw(ids.knob, body, GOLD);
        r.draw(ids.hinge, chain(body, translate(0, 0.0, -1.0), rotZ(Math.PI / 2)), GOLD);
        list.forEach((s, i) => {
          const goal = s.id === on ? 0.05 : i === hovered ? 0.025 : 0;
          lift[i] += (goal - lift[i]) * Math.min(dt * 10, 1);
          r.draw(wedges[i], mul(body, translate(0, PAN.floor + lift[i], 0)), POWDER(hex(s.hex)));
        });

        const target = hex((list.find((s) => s.id === on) || list[0]).hex);
        mirrorColor = mirrorColor.map((v, i) => v + (target[i] - v) * Math.min(dt * 6, 1)) as [number, number, number];
        const lid = mul(body, lidAt(open));
        r.draw(ids.lid, lid, SHELL);
        r.draw(ids.lidRim, lid, GOLD);
        r.draw(ids.mirror, lid, MIRROR, 0, mirrorColor);

        // keep the name label glued to the middle of the mirror
        if (labelRef.current) {
          const c = apply(mul(proj, lid), 0, 0.018, 0);
          const x = (c[0] / c[3] * 0.5 + 0.5) * size.w, y = (1 - (c[1] / c[3] * 0.5 + 0.5)) * size.h;
          labelRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
          labelRef.current.style.opacity = String(Math.min(Math.max((open - 1.4) * 4, 0), 1));
        }
      },
      dispose() { canvas.removeEventListener("click", click); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerleave", leave); },
    };
  });

  return (
    <div className="mx-auto w-full max-w-[420px] select-none">
    <div className="relative aspect-[10/11] w-full">
      <div className="absolute bottom-[6%] left-1/2 h-[10%] w-[70%] -translate-x-1/2 rounded-[50%] bg-black/50 blur-2xl" aria-hidden />
      {!failed && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Powder compact with colour wedges" />}
      {!failed && (
        <div ref={labelRef} className="pointer-events-none absolute left-0 top-0 text-center opacity-0" aria-hidden>
          <p key={current.id} className="animate-pop font-display text-[1.7rem] font-semibold italic leading-none text-ink sm:text-[2.1rem]">{current.name}</p>
        </div>
      )}
    </div>
      {/* The same choice as plain buttons: for keyboards, screen readers, and devices without 3D. */}
      <div className="mt-1 flex flex-wrap justify-center gap-2.5">
        {shades.map((s) => (
          <button key={s.id} onClick={() => onPick(s.id)} aria-label={`${s.name} shades`} aria-pressed={s.id === active} title={s.name}
            className={cx("rounded-full border-2 transition-transform hover:scale-110", failed ? "h-14 w-14" : "h-7 w-7", s.id === active ? "scale-110 border-white" : "border-white/30")} style={{ background: s.hex }} />
        ))}
      </div>
    </div>
  );
}
