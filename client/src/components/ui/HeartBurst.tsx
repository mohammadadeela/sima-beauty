import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

interface Burst { id: number; x: number; y: number; color: string }

/** Call this from a click handler to throw a puff of hearts from that spot. */
export function burstHearts(e: { clientX: number; clientY: number }, color = "#E8257D") {
  window.dispatchEvent(new CustomEvent("sima-burst", { detail: { x: e.clientX, y: e.clientY, color } }));
}

export function HeartBurstLayer() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  useEffect(() => {
    let id = 0;
    const on = (e: Event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const b = { id: ++id, ...(e as CustomEvent).detail } as Burst;
      setBursts((list) => [...list, b]);
      setTimeout(() => setBursts((list) => list.filter((x) => x.id !== b.id)), 1100);
    };
    window.addEventListener("sima-burst", on);
    return () => window.removeEventListener("sima-burst", on);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]" aria-hidden>
      {bursts.map((b) =>
        [...Array(9)].map((_, i) => {
          const angle = -Math.PI / 2 + (i - 4) * 0.42;
          const dist = 50 + (i % 3) * 34;
          return (
            <motion.span key={`${b.id}-${i}`} className="absolute" style={{ left: b.x - 10, top: b.y - 10, color: i % 2 ? b.color : "#FF6BAA" }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
              animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 30, scale: 1, opacity: 0, rotate: (i - 4) * 14 }}
              transition={{ duration: 0.9, ease: "easeOut" }}>
              <Heart size={14 + (i % 3) * 6} fill="currentColor" strokeWidth={0} />
            </motion.span>
          );
        }),
      )}
    </div>
  );
}
