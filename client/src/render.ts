// Development only: renders each product model to an image (see script/render-art.mjs).
import { ART_KINDS, type ArtKind } from "@shared/types";
import { chain, createRenderer, ident, perspective, translate } from "@/components/three/engine";
import { ART } from "@/components/three/models";

const canvas = document.getElementById("c") as HTMLCanvasElement;
const r = createRenderer(canvas, true)!;
const proj = perspective((26 * Math.PI) / 180, 640 / 768, 1, 40);
const view = translate(0, 0, -9.2);

/** "base": the product with its tintable parts in white. "shine": only the reflections on those tintable parts. */
function renderArt(kind: ArtKind, mode: "base" | "shine"): string {
  const { parts, pose } = ART[kind]();
  r.gl.viewport(0, 0, 640, 768);
  r.begin(proj, [0.86, 0.78, 0.82]);
  for (const p of parts) {
    const mv = chain(view, pose, p.at ?? ident());
    const id = r.add(p.mesh);
    if (mode === "base") r.draw(id, mv, p.mat, 0, [0.95, 0.75, 0.82]);
    else if (p.tint) r.draw(id, mv, { ...p.mat, color: [0, 0, 0] }, 0);
    else r.draw(id, mv, p.mat, 1);          // hides what is behind it, draws nothing
  }
  return canvas.toDataURL("image/png");
}
Object.assign(window, { renderArt, ART_KINDS });
