import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { cx, isLight } from "@/lib/format";

export interface CompactShade { id: string; name: string; hex: string }

/**
 * A powder compact that opens when it scrolls into view. The lid swings up
 * to show its mirror, and the pan underneath is split into colour wedges
 * the shopper can tap. Built with CSS 3D transforms only.
 */
export function Compact({ shades, active, onPick }: { shades: CompactShade[]; active: string; onPick: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const open = useInView(ref, { once: true, amount: 0.5 });
  const current = shades.find((s) => s.id === active) || shades[0];
  const step = 360 / shades.length;

  // A pie slice as a clip-path, for the wedge that starts at `from` degrees.
  const slice = (from: number) => {
    const pts = ["50% 50%"];
    for (let a = from; a <= from + step + 0.01; a += step / 6) {
      const r = (a - 90) * (Math.PI / 180);
      pts.push(`${50 + 50 * Math.cos(r)}% ${50 + 50 * Math.sin(r)}%`);
    }
    return `polygon(${pts.join(",")})`;
  };

  return (
    <div ref={ref} className="relative mx-auto mt-16 h-[330px] w-[280px] select-none sm:mt-24 sm:h-[420px] sm:w-[360px]" style={{ perspective: 1100 }}>
      <div className="absolute bottom-0 left-0 aspect-square w-full" style={{ transformStyle: "preserve-3d", transform: "translateY(20%) rotateX(58deg)" }}>
        {/* soft shadow on the table */}
        <div className="absolute inset-[4%] rounded-full bg-pink-deep/40 blur-2xl" style={{ transform: "translateZ(-30px) translateY(8%)" }} />

        {/* base */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-deep shadow-[0_0_0_1px_rgba(0,0,0,.08)]" style={{ transformStyle: "preserve-3d" }}>
          <div className="absolute inset-[7%] rounded-full bg-pink-deep shadow-[inset_0_6px_14px_rgba(0,0,0,.35)]" />
          {/* the pan of pressed powder */}
          <div className="absolute inset-[11%]" style={{ transformStyle: "preserve-3d" }}>
            {shades.map((s, i) => (
              <motion.button
                key={s.id} type="button" onClick={() => onPick(s.id)} aria-label={`${s.name} shades`} aria-pressed={s.id === active}
                className="absolute inset-0 cursor-pointer rounded-full outline-none"
                style={{ clipPath: slice(i * step), background: `radial-gradient(circle at 40% 30%, color-mix(in oklab, ${s.hex} 80%, white), ${s.hex} 55%, color-mix(in oklab, ${s.hex} 75%, black))` }}
                animate={{ z: s.id === active ? 26 : 0, scale: s.id === active ? 1.04 : 1 }}
                whileHover={{ z: 16 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              />
            ))}
            <div className="pointer-events-none absolute inset-[39%] rounded-full bg-gradient-to-br from-gold-light to-gold-deep shadow-md" style={{ transform: "translateZ(30px)" }} />
          </div>
        </div>

        {/* hinge */}
        <div className="absolute left-1/2 top-0 h-[5%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-deep" />

        {/* lid: swings up around its back edge */}
        <motion.div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d", transformOrigin: "50% 0%" }}
          initial={{ rotateX: 0 }}
          animate={{ rotateX: open ? 108 : 0 }}
          transition={{ type: "spring", stiffness: 60, damping: 11, delay: 0.15 }}
        >
          {/* outside of the lid */}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-pink-glow via-pink to-pink-deep" style={{ backfaceVisibility: "hidden" }}>
            <Logo tone="light" tagline={false} className="text-[3.2rem]" />
          </div>
          {/* inside of the lid: the mirror */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-deep" style={{ transform: "rotateX(180deg)", backfaceVisibility: "hidden" }}>
            <div className="absolute inset-[7%] overflow-hidden rounded-full bg-gradient-to-br from-white via-[#FFE3EE] to-[#F7BBD3] shadow-[inset_0_0_30px_rgba(179,18,92,.25)]">
              <div className="mirror-sheen absolute -inset-y-1/4 left-1/4 w-1/3 bg-gradient-to-r from-transparent via-white/90 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <motion.span key={current.id} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
                  className="flex h-[38%] w-[38%] items-center justify-center rounded-full shadow-lift" style={{ background: current.hex }}>
                  <span className={cx("font-display text-xl font-semibold italic sm:text-2xl", isLight(current.hex) ? "text-ink" : "text-white")}>{current.name}</span>
                </motion.span>
                <span className="mt-2 text-[12px] font-semibold text-pink-deep sm:text-[13px]">Tap a colour below</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
