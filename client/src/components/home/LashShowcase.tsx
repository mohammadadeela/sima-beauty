import { useRef } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import type { Settings } from "@shared/types";
import { ProductArt } from "@/components/brand/ProductArt";
import { chain, GOLD, lacquer, mul, perspective, rotX, rotY, rotZ, scale, translate } from "@/components/three/engine";
import { BRISTLE, MASCARA } from "@/components/three/models";
import { useScene } from "@/components/three/useScene";

const TUBE = lacquer("#E8257D"), CAP = lacquer("#2D0F24");

/**
 * A close-up mascara, rendered live in 3D. As the shopper scrolls, the wand
 * unscrews and slides out of the tube.
 */
export function LashShowcase({ settings }: { settings: Settings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const failed = useScene(canvasRef, (r, canvas) => {
    const ids = Object.fromEntries(Object.entries(MASCARA).map(([k, mesh]) => [k, r.add(mesh)])) as Record<keyof typeof MASCARA, number>;
    let pull = 0;
    return ({ t, dt, w, h, reduced }) => {
      // how far the banner has travelled up the screen: 0 when it enters, 1 near the top
      const rect = canvas.getBoundingClientRect();
      const goal = reduced ? 0.8 : Math.min(Math.max((window.innerHeight * 0.92 - rect.top) / (window.innerHeight * 0.7), 0), 1);
      pull += (goal - pull) * Math.min(dt * 5, 1);

      const aspect = w / h;
      r.begin(perspective((24 * Math.PI) / 180, aspect, 1, 40), [0.95, 0.62, 0.76]);
      const fit = Math.min(1, aspect / 1.75);
      const float = reduced ? 0 : Math.sin(t * 0.9) * 0.05;
      const tube = chain(translate(-2.3 * fit, -0.75 + float, -9), rotZ(-1.15), rotX(0.3), rotY(0.4 + pull * 0.6), scale(1.3 * fit));
      r.draw(ids.tube, tube, TUBE);
      r.draw(ids.ring, tube, GOLD);
      // the wand slides out along the tube and turns as it goes
      const wand = mul(tube, chain(translate(0, 0.86 + pull * 2.1, 0), rotY(pull * 5)));
      r.draw(ids.cap, wand, CAP);
      r.draw(ids.capRing, wand, GOLD);
      r.draw(ids.rod, wand, GOLD);
      r.draw(ids.brush, wand, BRISTLE);
    };
  });

  return (
    <section className="wrap">
      <div className="relative grid overflow-hidden rounded-blob bg-gradient-to-br from-[#FFC2DA] via-blush to-[#FFE3EE] md:grid-cols-[0.85fr_1.3fr]">
        <div className="relative z-10 p-6 sm:p-9 md:py-12">
          <h2 className="text-[2.4rem] font-semibold italic leading-[0.95] sm:text-[3.4rem]">{settings.lashTitle}</h2>
          <p className="mt-3 max-w-xs text-[16px] text-ink-soft" dir="auto">{settings.lashText}</p>
          <Link href={settings.lashLink || "/shop"} className="btn-ink mt-5">{settings.lashCta}<ArrowRight size={18} /></Link>
        </div>
        <div className="relative h-[210px] sm:h-[270px] md:h-auto md:min-h-[300px]">
          {failed
            ? <ProductArt kind="mascara" className="absolute inset-0 m-auto h-[90%]" />
            : <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Mascara wand sliding out of its tube" />}
        </div>
      </div>
    </section>
  );
}
