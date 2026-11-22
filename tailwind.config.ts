import type { Config } from "tailwindcss";

// Sima Beauty palette. Every colour on the site comes from these tokens,
// so changing one value here re-skins the whole store.
export default {
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#2D0F24", soft: "#5A3350", mute: "#9A7A8F" },
        pink: { DEFAULT: "#E8257D", deep: "#B3125C", glow: "#FF6BAA" },
        blush: { DEFAULT: "#FFD0E2", soft: "#FFEBF3", deep: "#FFA6C9" },
        milk: "#FFF6FA",
        gold: { DEFAULT: "#C9A56B", light: "#EBD3A6", deep: "#9C7A44" },
      },
      fontFamily: {
        display: ['"Bodoni Moda"', "Tajawal", "Didot", '"Bodoni MT"', "Georgia", "serif"],
        sans: ["Figtree", "Tajawal", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: { blob: "2rem" },
      boxShadow: {
        lift: "0 18px 40px -22px rgba(179, 18, 92, 0.45)",
        soft: "0 6px 24px -14px rgba(45, 15, 36, 0.35)",
      },
      keyframes: {
        marquee: { to: { transform: "translateX(-50%)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        shimmer: { to: { backgroundPosition: "200% 0" } },
        pop: { "0%": { transform: "scale(.6)", opacity: "0" }, "60%": { transform: "scale(1.12)" }, "100%": { transform: "scale(1)", opacity: "1" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        marquee: "marquee var(--marquee-speed, 30s) linear infinite",
        floaty: "floaty 5s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        pop: "pop .45s cubic-bezier(.2,.9,.3,1.2) both",
        "spin-slow": "spinSlow 18s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
