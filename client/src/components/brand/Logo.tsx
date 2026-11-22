import { cx } from "@/lib/format";

/** The two lip shapes on their own. Also used as the small brand mark. */
export function Lips({ fill = "#E8257D" }: { fill?: string }) {
  return (
    <g stroke="none" fill={fill}>
      <path d="M58 40 C62 30 68 19 75 19 C80 19 83 23 86 27 C89 23 92 19 97 19 C104 19 110 30 114 40 C104 36.5 96 36.5 86 38.5 C76 36.5 68 36.5 58 40 Z" />
      <path d="M60 44 C70 41 78 42 86 43.5 C94 42 102 41 112 44 C106 56 96 63 86 63 C76 63 66 56 60 44 Z" />
      <path d="M71 51 C76 55 84 56 90 55" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

/**
 * The Sima wordmark, drawn by hand as one SVG so it looks the same everywhere.
 * The "m" is a pair of lips: the name carries a kiss in the middle.
 * Its size follows the font size of whatever it sits in.
 */
export function Logo({ className, tone = "ink", tagline = true }: { className?: string; tone?: "ink" | "light"; tagline?: boolean }) {
  const pink = tone === "light" ? "#FF8FBE" : "#E8257D";
  return (
    <span className={cx("inline-flex select-none flex-col items-center leading-none", tone === "light" ? "text-milk" : "text-ink", className)}>
      <svg viewBox="0 0 156 70" className="h-[1em] w-auto overflow-visible" fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Sima Beauty">
        <path d="M30 29 C28 23 22 20 17 20 C10 20 6 24 6 30 C6 37 12 39 18 40 C24 41 30 44 30 50 C30 56 25 60 17 60 C11 60 6 57 4 52" />
        <path d="M44 23 V60" />
        <circle cx="44" cy="8" r="4.8" fill={pink} stroke="none" />
        <Lips fill={pink} />
        <circle cx="134" cy="40" r="16" />
        <path d="M150 23 V60" />
      </svg>
      {tagline && <span className="mt-[0.22em] pl-[0.55em] font-sans text-[0.2em] font-semibold tracking-[0.55em] opacity-70">BEAUTY</span>}
    </span>
  );
}
