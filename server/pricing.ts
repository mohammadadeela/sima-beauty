import type { CartLine, DiscountCode, Quote, Settings } from "@shared/types";
import { q, one } from "./db";

const round = (n: number) => Math.round(n * 100) / 100;

type Runner = Parameters<typeof q>[2];

/**
 * The single place where an order total is calculated. The bag, the checkout
 * page and the final order all call this, so the customer never sees one
 * price and gets charged another.
 */
export async function buildQuote(
  input: { lines: CartLine[]; code?: string; zoneId?: string },
  settings: Settings,
  runner?: Runner,
  lock = false,
): Promise<Quote> {
  const wanted = new Map<number, number>();
  for (const l of input.lines || []) {
    const id = Number(l.shadeId);
    const qty = Math.floor(Number(l.qty));
    if (!Number.isInteger(id) || !(qty > 0)) continue;
    wanted.set(id, Math.min((wanted.get(id) || 0) + qty, 20));
  }

  const ids = [...wanted.keys()];
  const rows = ids.length
    ? await q<any>(
        `SELECT s.id AS shade_id, s.name AS shade_name, s.hex AS shade_hex, s.stock, s.image AS shade_image,
                p.id AS product_id, p.slug, p.name, p.price, p.sale_price, p.images, p.art,
                COALESCE(b.name, '') AS brand_name,
                (SELECT COUNT(*) FROM shades x WHERE x.product_id = p.id) AS shade_count
         FROM shades s
         JOIN products p ON p.id = s.product_id AND p.is_active
         LEFT JOIN brands b ON b.id = p.brand_id
         WHERE s.id = ANY($1::int[])
         ORDER BY s.id ${lock ? "FOR UPDATE OF s" : ""}`,
        [ids],
        runner,
      )
    : [];

  let removed = ids.length - rows.length;
  const lines: Quote["lines"] = [];
  for (const r of rows) {
    const qty = Math.min(wanted.get(r.shadeId) || 0, r.stock);
    if (qty <= 0) { removed++; continue; }
    const onSale = r.salePrice != null && r.salePrice < r.price;
    lines.push({
      shadeId: r.shadeId, productId: r.productId, slug: r.slug, name: r.name, brandName: r.brandName,
      shadeName: r.shadeName, shadeHex: r.shadeHex,
      image: r.shadeImage || r.images?.[0] || "", art: r.art,
      price: onSale ? r.salePrice : r.price, compareAt: onSale ? r.price : null,
      qty, stock: r.stock, hasShades: r.shadeCount > 1 || !!r.shadeHex,
    });
  }

  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = round(lines.reduce((n, l) => n + l.price * l.qty, 0));

  // "Buy any N, save X%"
  const bundleActive = settings.bundleOn && settings.bundleQty > 1 && settings.bundlePercent > 0;
  const bundleDiscount = bundleActive && itemCount >= settings.bundleQty ? round(subtotal * settings.bundlePercent / 100) : 0;
  const toBundle = bundleActive && itemCount > 0 ? Math.max(settings.bundleQty - itemCount, 0) : 0;

  // Discount code
  let codeDiscount = 0, discountCode = "", codeError = "";
  const rawCode = (input.code || "").trim().toUpperCase();
  if (rawCode && lines.length) {
    const code = await one<DiscountCode>("SELECT * FROM discount_codes WHERE UPPER(code) = $1", [rawCode], runner);
    const base = subtotal - bundleDiscount;
    if (!code || !code.isActive) codeError = "This code is not valid.";
    else if (code.expiresAt && new Date(code.expiresAt) < new Date()) codeError = "This code has expired.";
    else if (code.maxUses != null && code.usedCount >= code.maxUses) codeError = "This code has been fully used.";
    else if (subtotal < code.minSubtotal) codeError = `Spend ${settings.currency}${code.minSubtotal} or more to use this code.`;
    else {
      discountCode = code.code;
      codeDiscount = round(Math.min(code.type === "percent" ? base * code.value / 100 : code.value, base));
    }
  }

  const afterDiscounts = round(subtotal - bundleDiscount - codeDiscount);

  // Delivery
  const zone = settings.zones.find((z) => z.id === input.zoneId);
  const freeActive = settings.freeShippingOn && settings.freeShippingOver > 0;
  const freeShipping = freeActive && lines.length > 0 && afterDiscounts >= settings.freeShippingOver;
  const toFreeShipping = freeActive && lines.length ? Math.max(round(settings.freeShippingOver - afterDiscounts), 0) : 0;
  const shipping = !zone || freeShipping ? 0 : zone.price;

  // Free gift
  const giftActive = settings.giftOn && settings.giftOver > 0 && !!settings.giftText;
  const gift = giftActive && lines.length && afterDiscounts >= settings.giftOver ? settings.giftText : "";
  const toGift = giftActive && lines.length ? Math.max(round(settings.giftOver - afterDiscounts), 0) : 0;

  return {
    lines, itemCount, subtotal, bundleDiscount, codeDiscount, discountCode, codeError,
    shipping, freeShipping, toFreeShipping, gift, toGift, toBundle,
    total: round(afterDiscounts + shipping), removed,
  };
}
