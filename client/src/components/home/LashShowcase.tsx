import { useRef } from "react";
import { Link } from "wouter";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Settings } from "@shared/types";

const LASHES = 17;

/**
 * A close-up mascara moment. As the shopper scrolls, a giant wand sweeps
 * across a closed eye and the lashes grow longer behind it.
 */
export function LashShowcase({ settings }: { settings: Settings }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 35%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 70, damping: 18 });
  const wandX = useTransform(progress, [0, 1], ["-12%", "68%"]);
  const wandRotate = useTransform(progress, [0, 0.5, 1], [-10, -4, 6]);

  return (
    <section ref={ref} className="wrap relative">
      <div className="relative grid overflow-hidden rounded-blob bg-gradient-to-br from-[#FFC2DA] via-blush to-[#FFE3EE] lg:grid-cols-[0.9fr_1.3fr]">
        <div className="relative z-10 p-6 sm:p-10 lg:py-16">
          <h2 className="text-[2.7rem] font-semibold italic leading-[0.95] sm:text-[4.2rem]">{settings.lashTitle}</h2>
          <p className="mt-3 max-w-xs text-[16px] text-ink-soft">{settings.lashText}</p>
          <Link href={settings.lashLink || "/shop"} className="btn-ink mt-6">{settings.lashCta}<ArrowRight size={18} /></Link>
        </div>

        <div className="relative h-[230px] sm:h-[300px] lg:h-auto">
          {/* the eye */}
          <svg viewBox="0 0 600 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <path d="M70 190 Q300 60 530 190" fill="none" stroke="#2D0F24" strokeWidth="7" strokeLinecap="round" />
            {[...Array(LASHES)].map((_, i) => <Lash key={i} i={i} progress={progress} />)}
          </svg>

          {/* the wand, very close */}
          <motion.div className="absolute left-0 top-[4%] w-[62%] sm:top-0" style={{ x: wandX, rotate: wandRotate }}>
            <svg viewBox="0 0 520 150" className="w-full drop-shadow-[0_18px_22px_rgba(45,15,36,.3)]" aria-hidden>
              <defs>
                <linearGradient id="wand-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F1D7B5" /><stop offset="0.5" stopColor="#C9A56B" /><stop offset="1" stopColor="#9C7A44" /></linearGradient>
                <linearGradient id="wand-pink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF6BAA" /><stop offset="0.55" stopColor="#E8257D" /><stop offset="1" stopColor="#B3125C" /></linearGradient>
              </defs>
              {/* bristles */}
              {[...Array(34)].map((_, i) => {
                const x = 14 + i * 6.4;
                const len = 30 - Math.abs(i - 16.5) * 0.75;
                return <line key={i} x1={x} x2={x + 5} y1={75 - len} y2={75 + len} stroke="#2D0F24" strokeWidth="3.4" strokeLinecap="round" />;
              })}
              <rect x="8" y="69" width="226" height="12" rx="6" fill="#2D0F24" />
              <rect x="228" y="71" width="96" height="8" fill="url(#wand-gold)" />
              <rect x="316" y="44" width="24" height="62" rx="4" fill="url(#wand-gold)" />
              <rect x="338" y="34" width="176" height="82" rx="16" fill="url(#wand-pink)" />
              <rect x="352" y="44" width="150" height="9" rx="4.5" fill="#fff" opacity="0.35" />
            </svg>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** One lash on the lid. It grows as the wand passes over it. */
function Lash({ i, progress }: { i: number; progress: MotionValue<number> }) {
  const t = i / (LASHES - 1);
  // point on the lid curve (a quadratic Bézier) and the direction pointing out of it
  const x = (1 - t) ** 2 * 70 + 2 * (1 - t) * t * 300 + t ** 2 * 530;
  const y = (1 - t) ** 2 * 190 + 2 * (1 - t) * t * 60 + t ** 2 * 190;
  const lean = (t - 0.5) * 70;
  const reach = 0.1 + t * 0.75;
  const pathLength = useTransform(progress, [Math.max(reach - 0.22, 0), reach + 0.08], [0.3, 1], { clamp: true });
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.path d={`M0 0 Q ${lean * 0.25} -34 ${lean * 0.9} -78`} fill="none" stroke="#2D0F24" strokeWidth="5.5" strokeLinecap="round" style={{ pathLength }} />
    </g>
  );
}
