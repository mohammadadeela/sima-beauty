import type { ArtKind } from "@shared/types";
import { cx } from "@/lib/format";

/** Colour used when a product has no shade colour of its own. */
const DEFAULT_COLOR: Record<ArtKind, string> = {
  lipstick: "#E8257D", gloss: "#EC5C93", liner: "#2D0F24", mascara: "#E8257D", palette: "#EC5C93",
  foundation: "#E3BE9C", compact: "#F2909F", polish: "#E8257D", brush: "#D9A58F",
};

/**
 * A 3D render of a product type, recoloured live to any shade. It stands in
 * for a product until a real photo is uploaded in the admin panel.
 *
 * Each product is two images made from the 3D models (script/render-art.mjs):
 *   *-base.webp   the product with its colour part in white
 *   *-shine.webp  only the reflections on that colour part
 * The browser multiplies the white part by the shade and puts the reflections
 * back on top, so every shade keeps real lighting and gloss.
 */
export function ProductArt({ kind, color, className }: { kind: ArtKind; color?: string; className?: string }) {
  const base = `/art/${kind}-base.webp`, shine = `/art/${kind}-shine.webp`;
  const layer = "absolute inset-0 h-full w-full";
  return (
    <span className={cx("relative inline-block aspect-[5/6] select-none", className)} style={{ isolation: "isolate" }} role="img" aria-label={kind}>
      <img src={base} alt="" className={layer} draggable={false} />
      <img src={shine} alt="" className={layer} style={{ mixBlendMode: "difference" }} draggable={false} />
      <span
        className={layer}
        style={{
          background: color || DEFAULT_COLOR[kind], transition: "background .4s", mixBlendMode: "multiply",
          WebkitMaskImage: `url(${shine})`, maskImage: `url(${shine})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%",
        }}
      />
      <img src={shine} alt="" className={layer} style={{ mixBlendMode: "screen" }} draggable={false} />
    </span>
  );
}
