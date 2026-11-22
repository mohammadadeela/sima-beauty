import type { ArtKind } from "@shared/types";

const INK = "#2D0F24";
const GOLD = "#C9A56B";
const GOLD_LIGHT = "#EBD3A6";

/** Colour used when a product has no shade colour of its own. */
const DEFAULT_COLOR: Partial<Record<ArtKind, string>> = { foundation: "#EBC9A9", compact: "#FF8FB1", brush: "#E7B4A6", liner: "#2D0F24" };

interface ArtProps { kind: ArtKind; color?: string; className?: string }

/**
 * Illustrated products, tinted with the chosen shade. They stand in for a
 * product until a real photo is uploaded in the admin panel.
 */
export function ProductArt({ kind, color, className }: ArtProps) {
  const c = color || DEFAULT_COLOR[kind] || "#E8257D";
  return (
    <svg viewBox="0 0 200 240" className={className} role="img" aria-label={kind}>
      <ellipse cx="100" cy="224" rx="62" ry="7" fill={INK} opacity="0.12" />
      {ART[kind]?.(c) ?? ART.lipstick(c)}
    </svg>
  );
}

const shine = (x: number, y: number, w: number, h: number, o = 0.22) => (
  <rect x={x} y={y} width={w} height={h} rx={w / 2} fill="#fff" opacity={o} />
);

const ART: Record<ArtKind, (c: string) => JSX.Element> = {
  lipstick: (c) => (
    <g>
      <path d="M80 110 V60 q0-8 7-12 l24-15 q9-5 9 5 v72 z" fill={c} style={{ transition: "fill .4s" }} />
      {shine(87, 58, 6, 46, 0.28)}
      <rect x="72" y="106" width="56" height="40" rx="3" fill={GOLD} />
      <rect x="72" y="106" width="56" height="7" fill={GOLD_LIGHT} />
      {shine(80, 114, 5, 28, 0.35)}
      <rect x="64" y="142" width="72" height="80" rx="7" fill={INK} />
      {shine(74, 150, 6, 62, 0.14)}
    </g>
  ),
  gloss: (c) => (
    <g>
      <rect x="74" y="98" width="52" height="124" rx="12" fill={c} style={{ transition: "fill .4s" }} />
      <rect x="74" y="98" width="52" height="124" rx="12" fill="#fff" opacity="0.12" />
      {shine(82, 110, 7, 96, 0.35)}
      <rect x="77" y="88" width="46" height="12" rx="2" fill={GOLD} />
      <rect x="80" y="20" width="40" height="70" rx="7" fill={INK} />
      {shine(87, 28, 5, 52, 0.16)}
    </g>
  ),
  liner: (c) => (
    <g transform="rotate(32 100 120)">
      <rect x="89" y="22" width="22" height="146" rx="4" fill={INK} />
      <rect x="89" y="22" width="22" height="22" rx="4" fill={c} style={{ transition: "fill .4s" }} />
      <rect x="89" y="150" width="22" height="9" fill={GOLD} />
      {shine(93, 50, 4, 92, 0.16)}
      <path d="M89 168 h22 l-11 40 z" fill="#E9C9A8" />
      <path d="M95 190 h10 l-5 18 z" fill={c} style={{ transition: "fill .4s" }} />
    </g>
  ),
  mascara: (c) => (
    <g>
      <rect x="52" y="92" width="46" height="130" rx="9" fill={INK} />
      <rect x="52" y="92" width="46" height="12" rx="3" fill={GOLD} />
      <rect x="52" y="150" width="46" height="26" fill={c} style={{ transition: "fill .4s" }} />
      {shine(60, 108, 5, 104, 0.16)}
      <g transform="rotate(16 140 130)">
        <rect x="124" y="128" width="34" height="92" rx="8" fill={INK} />
        <rect x="124" y="128" width="34" height="9" fill={GOLD} />
        <rect x="139.5" y="84" width="3" height="46" fill={GOLD} />
        <ellipse cx="141" cy="56" rx="9" ry="32" fill={INK} />
        {[...Array(9)].map((_, i) => (
          <line key={i} x1="128" x2="154" y1={30 + i * 6.5} y2={32 + i * 6.5} stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        ))}
      </g>
    </g>
  ),
  palette: (c) => {
    const pans = ["#F3D9C4", "#E7B4A6", "#C98B7B", "#EBD3A6", c, "#A34A5E", "#8A5346", "#6E1238", "#3F2B22"];
    return (
      <g>
        <rect x="26" y="52" width="148" height="160" rx="16" fill={INK} />
        <rect x="26" y="52" width="148" height="160" rx="16" fill="none" stroke={GOLD} strokeWidth="2.5" />
        {pans.map((p, i) => (
          <g key={i}>
            <rect x={40 + (i % 3) * 42} y={66 + Math.floor(i / 3) * 46} width="36" height="40" rx="8" fill={p} style={{ transition: "fill .4s" }} />
            <rect x={44 + (i % 3) * 42} y={70 + Math.floor(i / 3) * 46} width="14" height="4" rx="2" fill="#fff" opacity="0.3" />
          </g>
        ))}
      </g>
    );
  },
  foundation: (c) => (
    <g>
      <rect x="64" y="94" width="72" height="128" rx="14" fill={c} style={{ transition: "fill .4s" }} />
      <rect x="64" y="94" width="72" height="128" rx="14" fill="none" stroke="#fff" strokeWidth="3" opacity="0.4" />
      {shine(74, 108, 8, 96, 0.38)}
      <rect x="84" y="82" width="32" height="14" rx="2" fill={GOLD} />
      <rect x="80" y="26" width="40" height="58" rx="7" fill={INK} />
      {shine(87, 34, 5, 40, 0.16)}
    </g>
  ),
  compact: (c) => (
    <g>
      <circle cx="100" cy="92" r="66" fill={GOLD} />
      <circle cx="100" cy="92" r="55" fill="#FFF0F6" />
      <path d="M62 78 a44 44 0 0 1 44 -34" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <circle cx="100" cy="154" r="66" fill={INK} />
      <circle cx="100" cy="154" r="53" fill={c} style={{ transition: "fill .4s" }} />
      <path d="M66 150 a36 36 0 0 1 36 -30" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
    </g>
  ),
  polish: (c) => (
    <g>
      <rect x="58" y="122" width="84" height="100" rx="20" fill={c} style={{ transition: "fill .4s" }} />
      <rect x="58" y="122" width="84" height="100" rx="20" fill="none" stroke="#fff" strokeWidth="3" opacity="0.35" />
      {shine(70, 136, 8, 68, 0.35)}
      <rect x="86" y="108" width="28" height="16" rx="2" fill={GOLD} />
      <rect x="82" y="18" width="36" height="92" rx="9" fill={INK} />
      {shine(89, 28, 5, 70, 0.16)}
    </g>
  ),
  brush: (c) => (
    <g transform="rotate(-24 100 130)">
      <path d="M84 92 Q70 44 100 14 Q130 44 116 92 Z" fill={c} style={{ transition: "fill .4s" }} />
      <path d="M94 88 Q88 52 100 26" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      <rect x="84" y="90" width="32" height="34" rx="3" fill={GOLD} />
      <rect x="84" y="90" width="32" height="6" fill={GOLD_LIGHT} />
      <path d="M88 124 h24 l-4 96 q-8 8 -16 0 z" fill={INK} />
      {shine(94, 132, 4, 76, 0.16)}
    </g>
  ),
};
