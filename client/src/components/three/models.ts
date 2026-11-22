import type { ArtKind } from "@shared/types";
import { chain, GOLD, hex, ident, lacquer, lathe, rotX, rotY, rotZ, scale, translate, wedge, type M4, type Material, type Mesh, type Pt } from "./engine";

/** One piece of a product: its shape, what it is made of, and where it sits. */
export interface Part { mesh: Mesh; mat: Material; at?: M4; tint?: boolean; mirror?: boolean }

const CASE = lacquer("#2D0F24");                 // deep plum lacquer, used for caps and cases
const PINK = lacquer("#E8257D");
const WHITE: [number, number, number] = [1, 1, 1];
const cyl = (r: number, y0: number, y1: number, radius = 0.03, extra = {}): Mesh => lathe([[0, y0], [r, y0], [r, y1], [0, y1]], { radius, ...extra });

// ───────────────────────────── lipstick ─────────────────────────────
const BULLET_R = 0.3, BULLET_TOP = 1.05, SLANT = 0.8, SL = Math.hypot(SLANT, 1);
export const LIPSTICK = {
  base: lathe([[0, -1.75], [0.52, -1.75], [0.52, -0.74], [0.5, -0.74], [0.5, -0.42], [0.42, -0.42]], { radius: 0.035 }),
  band: lathe([[0.5, -0.74], [0.535, -0.74], [0.535, -0.46], [0.5, -0.46]], { radius: 0.02 }),
  tube: lathe([[0.42, -0.44], [0.42, 0.37], [0.33, 0.37], [0.33, 0.1]], { radius: 0.025 }),
  bullet: lathe([[BULLET_R, -0.5], [BULLET_R, BULLET_TOP], [0, BULLET_TOP]], {
    radius: 0.06, seg: 96,
    cut: { at: (x) => BULLET_TOP - SLANT * (x + BULLET_R) + 0.03, normal: [SLANT / SL, 1 / SL, 0], soft: 0.09 },
  }),
  cap: lathe([[0.5, 0], [0.575, 0], [0.575, 1.55], [0, 1.55]], { radius: 0.05 }),
  capBand: lathe([[0.575, 0.03], [0.592, 0.03], [0.592, 0.24], [0.575, 0.24]], { radius: 0.015 }),
};
export const WAX = (color: [number, number, number]): Material => ({ color, rough: 0.8, kind: 1 });
export const LIP_CASE = CASE;

// ───────────────────────────── mascara ─────────────────────────────
const brushOutline: Pt[] = [[0, -1.98]];
for (let i = 0; i <= 44; i++) {
  const y = -1.95 + i * 0.021, t = i / 44;
  brushOutline.push([i % 2 ? 0.045 : 0.105 + Math.sin(t * Math.PI) * 0.06, y]);
}
brushOutline.push([0.03, -1.0]);
export const MASCARA = {
  tube: lathe([[0, -1.35], [0.3, -1.35], [0.3, 0.86], [0.23, 0.86], [0.23, 0.98], [0.17, 0.98], [0.17, 0.6]], { radius: 0.035 }),
  ring: lathe([[0.3, 0.7], [0.312, 0.7], [0.312, 0.86], [0.3, 0.86]], { radius: 0.012 }),
  cap: lathe([[0.2, 0], [0.3, 0], [0.3, 1.25], [0, 1.25]], { radius: 0.045 }),
  capRing: lathe([[0.3, 0.02], [0.312, 0.02], [0.312, 0.2], [0.3, 0.2]], { radius: 0.012 }),
  rod: lathe([[0.03, -1.0], [0.03, 0.02]], { radius: 0, seg: 24 }),
  brush: lathe(brushOutline, { radius: 0, seg: 40 }),
};
export const BRISTLE: Material = { color: hex("#150a12"), rough: 0.75 };

// ───────────────────────────── compact ─────────────────────────────
export const PAN = { r0: 0.15, r1: 0.83, floor: -0.06, height: 0.075 };
export const COMPACT = {
  base: lathe([[0, -0.2], [0.94, -0.2], [1.0, -0.13], [1.0, 0], [0.9, 0], [0.9, PAN.floor], [0, PAN.floor]], { radius: 0.03, seg: 96 }),
  rim: lathe([[0.885, 0.004], [0.885, 0.022], [1.004, 0.022], [1.004, -0.03]], { radius: 0.012, seg: 96 }),
  knob: lathe([[0, PAN.floor], [0.13, PAN.floor], [0.13, 0.0], [0.06, 0.04], [0, 0.04]], { radius: 0.03 }),
  disc: lathe([[0, PAN.floor], [0.84, PAN.floor], [0.84, 0.005], [0, 0.005]], { radius: 0.03, seg: 96 }),
  lid: lathe([[0, 0.022], [1.0, 0.022], [1.0, 0.13], [0.9, 0.16], [0, 0.16]], { radius: 0.035, seg: 96 }),
  lidRim: lathe([[0.87, 0.02], [0.87, 0.012], [1.004, 0.012], [1.004, 0.05]], { radius: 0.01, seg: 96 }),
  mirror: lathe([[0, 0.018], [0.87, 0.018]], { radius: 0, seg: 96 }),
  hinge: lathe([[0, -0.22], [0.05, -0.22], [0.05, 0.22], [0, 0.22]], { radius: 0.02, seg: 24 }),
  wedges: (count: number) => [...Array(count)].map((_, i) => {
    const step = (Math.PI * 2) / count, gap = 0.025;
    return wedge(PAN.r0, PAN.r1, i * step + gap, (i + 1) * step - gap, PAN.height);
  }),
};
export const POWDER = (color: [number, number, number]): Material => ({ color, rough: 1, kind: 2 });
export const MIRROR: Material = { color: WHITE, kind: 3 };
/** Where the lid sits for a given opening angle (0 = shut). */
export const lidAt = (angle: number): M4 => chain(translate(0, 0.02, -1.0), rotX(-angle), translate(0, -0.02, 1.0));

// ─────────────────── the nine product types, as still models ───────────────────
// These are rendered once into images (see script/render-art.mjs) and used as
// the picture for any product that has no photo yet. Parts marked `tint` take
// the colour of the product's shade.
const T: Material = { color: WHITE, rough: 0.2, coat: 0.6 };       // liquid seen through glass
const NUDES = ["#F3D9C4", "#E7B4A6", "#C98B7B", "#EBD3A6", "", "#A34A5E", "#8A5346", "#6E1238", "#3F2B22"];

export const ART: Record<ArtKind, () => { parts: Part[]; pose: M4 }> = {
  lipstick: () => ({
    pose: chain(translate(0, -0.05, 0), rotY(0.7)),
    parts: [
      { mesh: LIPSTICK.base, mat: CASE }, { mesh: LIPSTICK.band, mat: GOLD }, { mesh: LIPSTICK.tube, mat: GOLD },
      { mesh: LIPSTICK.bullet, mat: WAX(WHITE), tint: true, at: translate(0, 0.3, 0) },
    ],
  }),
  gloss: () => ({
    pose: ident(),
    parts: [
      { mesh: lathe([[0, -1.72], [0.34, -1.72], [0.34, 0.28], [0.27, 0.36], [0.27, 0.44], [0, 0.44]], { radius: 0.06 }), mat: T, tint: true },
      { mesh: cyl(0.29, 0.4, 0.56, 0.015), mat: GOLD },
      { mesh: cyl(0.33, 0.56, 1.72, 0.05), mat: CASE },
    ],
  }),
  liner: () => ({
    pose: chain(rotZ(-0.85), scale(1.08)),
    parts: [
      { mesh: cyl(0.13, -1.1, 1.42, 0.01), mat: CASE },
      { mesh: cyl(0.134, -1.22, -1.1, 0.008), mat: GOLD },
      { mesh: cyl(0.13, 1.42, 1.58, 0.03), mat: { color: WHITE, rough: 0.3, coat: 0.6 }, tint: true },
      { mesh: lathe([[0.13, -1.22], [0.05, -1.52]], { radius: 0 }), mat: { color: hex("#E2B98F"), rough: 0.85 } },
      { mesh: lathe([[0.05, -1.52], [0.0, -1.68]], { radius: 0 }), mat: { color: WHITE, rough: 0.5 }, tint: true },
    ],
  }),
  mascara: () => {
    const wand = chain(translate(0.62, 0.5, 0), rotZ(-0.32));
    return {
      pose: translate(-0.1, -0.1, 0),
      parts: [
        { mesh: MASCARA.tube, mat: { color: WHITE, rough: 0.5, coat: 1 }, tint: true, at: translate(-0.45, -0.25, 0) },
        { mesh: MASCARA.ring, mat: GOLD, at: translate(-0.45, -0.25, 0) },
        { mesh: MASCARA.cap, mat: CASE, at: wand }, { mesh: MASCARA.capRing, mat: GOLD, at: wand },
        { mesh: MASCARA.rod, mat: GOLD, at: wand }, { mesh: MASCARA.brush, mat: BRISTLE, at: wand },
      ],
    };
  },
  palette: () => {
    const parts: Part[] = [
      { mesh: lathe([[0, -0.1], [1.42, -0.1], [1.42, 0.08], [1.3, 0.08], [1.3, 0.0], [0, 0.0]], { radius: 0.03, squircle: 7 }), mat: CASE },
      { mesh: lathe([[1.3, 0.082], [1.42, 0.082]], { radius: 0, squircle: 7 }), mat: GOLD },
    ];
    NUDES.forEach((c, i) => parts.push({
      mesh: lathe([[0, 0], [0.36, 0], [0.36, 0.05], [0, 0.05]], { radius: 0.02, squircle: 5, seg: 40 }),
      mat: POWDER(c ? hex(c) : WHITE), tint: !c, at: translate(((i % 3) - 1) * 0.8, 0, (Math.floor(i / 3) - 1) * 0.8),
    }));
    return { pose: chain(rotX(1.02), rotY(0.12), scale(1.12)), parts };
  },
  foundation: () => ({
    pose: rotY(0.5),
    parts: [
      { mesh: lathe([[0, -1.72], [0.56, -1.72], [0.56, 0.3], [0.3, 0.56], [0.3, 0.7], [0, 0.7]], { radius: 0.1, squircle: 3.2 }), mat: T, tint: true },
      { mesh: cyl(0.31, 0.68, 0.86, 0.015), mat: GOLD },
      { mesh: cyl(0.35, 0.86, 1.72, 0.05), mat: CASE },
    ],
  }),
  compact: () => ({
    pose: chain(translate(0, -0.75, 0), rotX(0.62), scale(1.5)),
    parts: [
      { mesh: COMPACT.base, mat: PINK }, { mesh: COMPACT.rim, mat: GOLD },
      { mesh: COMPACT.disc, mat: POWDER(WHITE), tint: true },
      { mesh: COMPACT.hinge, mat: GOLD, at: chain(translate(0, 0.0, -1.0), rotZ(Math.PI / 2)) },
      { mesh: COMPACT.lid, mat: PINK, at: lidAt(1.95) }, { mesh: COMPACT.lidRim, mat: GOLD, at: lidAt(1.95) },
      { mesh: COMPACT.mirror, mat: MIRROR, at: lidAt(1.95), mirror: true },
    ],
  }),
  polish: () => ({
    pose: rotY(0.45),
    parts: [
      { mesh: lathe([[0, -1.72], [0.66, -1.72], [0.66, -0.42], [0.24, -0.12], [0.24, 0.0], [0, 0.0]], { radius: 0.14, squircle: 3.4 }), mat: T, tint: true },
      { mesh: cyl(0.25, -0.02, 0.12, 0.012), mat: GOLD },
      { mesh: lathe([[0, 0.12], [0.27, 0.12], [0.23, 1.72], [0, 1.72]], { radius: 0.05 }), mat: CASE },
    ],
  }),
  brush: () => ({
    pose: chain(rotZ(-0.5), translate(0, -0.05, 0)),
    parts: [
      { mesh: lathe([[0, -1.75], [0.075, -1.75], [0.14, -0.2], [0.14, 0.2], [0, 0.2]], { radius: 0.04 }), mat: CASE },
      { mesh: lathe([[0.15, 0.12], [0.18, 0.72], [0.17, 0.78], [0, 0.78]], { radius: 0.015 }), mat: GOLD },
      { mesh: lathe([[0.17, 0.74], [0.4, 1.22], [0.34, 1.56], [0, 1.74]], { radius: 0.16, seg: 96 }), mat: { color: WHITE, rough: 0.9, kind: 4 }, tint: true },
    ],
  }),
};
