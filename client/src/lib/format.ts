import type { Product, Shade } from "@shared/types";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/** 45 → "₪45", 45.5 → "₪45.50" */
export function money(amount: number, currency = "₪"): string {
  const n = Math.round(amount * 100) / 100;
  return `${currency}${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

export const onSale = (p: Pick<Product, "price" | "salePrice">) => p.salePrice != null && p.salePrice < p.price;
export const finalPrice = (p: Pick<Product, "price" | "salePrice">) => (onSale(p) ? (p.salePrice as number) : p.price);
export const totalStock = (p: Pick<Product, "shades">) => p.shades.reduce((n, s) => n + s.stock, 0);
export const hasShades = (p: Pick<Product, "shades">) => p.shades.length > 1 || !!p.shades[0]?.hex;
export const firstAvailable = (p: Pick<Product, "shades">): Shade | undefined => p.shades.find((s) => s.stock > 0) || p.shades[0];

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function dateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Is this colour light enough to need dark text on top of it? */
export function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return true;
  const n = parseInt(m[1], 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 165;
}

/** Mix a hex colour with white (amount 0–1) for soft tinted backgrounds. */
export function tint(hex: string, amount = 0.82): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#FFEBF3";
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

export function whatsappLink(number: string, text = ""): string {
  return `https://wa.me/${number.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Received", confirmed: "Confirmed", shipped: "On the way", delivered: "Delivered", cancelled: "Cancelled",
};
