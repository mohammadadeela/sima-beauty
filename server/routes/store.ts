import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { Order, Review } from "@shared/types";
import { one, q, tx } from "../db";
import { getSettings } from "../settings";
import { listProducts, PRODUCT_SELECT } from "../catalog";
import { buildQuote } from "../pricing";

export const store = Router();

const writeLimit = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { message: "Too many requests. Please try again in a few minutes." } });

// Everything the layout needs, in one request.
store.get("/bootstrap", async (_req, res) => {
  const [settings, categories, brands] = await Promise.all([
    getSettings(),
    q(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active) AS product_count
       FROM categories c WHERE c.is_active ORDER BY c.sort_order, c.id`),
    q(`SELECT b.*, (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id AND p.is_active) AS product_count
       FROM brands b WHERE b.is_active ORDER BY b.sort_order, b.name`),
  ]);
  res.json({ settings, categories, brands });
});

store.get("/products", async (req, res) => {
  const s = (k: string) => (typeof req.query[k] === "string" ? (req.query[k] as string) : undefined);
  const n = (k: string) => (s(k) && !isNaN(Number(s(k))) ? Number(s(k)) : undefined);
  const ids = s("ids")?.split(",").map(Number).filter(Number.isInteger).slice(0, 60);
  const products = await listProducts({
    category: s("category"), brand: s("brand"), search: s("q"), family: s("family"),
    sale: s("sale") === "1", isNew: s("new") === "1", featured: s("featured") === "1", deal: s("deal") === "1",
    min: n("min"), max: n("max"), ids, sort: s("sort"), limit: n("limit"),
  });
  res.json(products);
});

store.get("/products/:slug", async (req, res) => {
  const product = await one<any>(`${PRODUCT_SELECT} WHERE p.slug = $1 AND p.is_active`, [req.params.slug]);
  if (!product) return res.status(404).json({ message: "Product not found." });
  const [reviews, related] = await Promise.all([
    q<Review>("SELECT id, product_id, name, rating, comment, created_at FROM reviews WHERE product_id = $1 AND is_approved ORDER BY created_at DESC LIMIT 50", [product.id]),
    q(`${PRODUCT_SELECT} WHERE p.is_active AND p.id <> $1 AND (p.category_id = $2 OR p.brand_id = $3)
       ORDER BY (p.category_id IS DISTINCT FROM $2), p.sold_count DESC LIMIT 8`, [product.id, product.categoryId, product.brandId]),
  ]);
  res.json({ product, reviews, related });
});

store.post("/products/:id/reviews", writeLimit, async (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2).max(60),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(800).default(""),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: "Please add your name and a rating." });
  const product = await one("SELECT id FROM products WHERE id = $1 AND is_active", [Number(req.params.id)]);
  if (!product) return res.status(404).json({ message: "Product not found." });
  await q("INSERT INTO reviews (product_id, user_id, name, rating, comment) VALUES ($1,$2,$3,$4,$5)",
    [product.id, req.user?.id ?? null, body.data.name, body.data.rating, body.data.comment]);
  res.json({ message: "Thank you. Your review will appear once it is approved." });
});

const lineSchema = z.object({ shadeId: z.number().int(), qty: z.number().int().min(1).max(20) });

// Generous for normal shopping, but stops anyone guessing discount codes by the thousand.
const quoteLimit = rateLimit({ windowMs: 5 * 60 * 1000, limit: 150, standardHeaders: true, legacyHeaders: false,
  message: { message: "Too many requests. Please try again in a few minutes." } });

store.post("/quote", quoteLimit, async (req, res) => {
  const body = z.object({
    lines: z.array(lineSchema).max(60), code: z.string().max(40).optional(), zoneId: z.string().max(40).optional(),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: "Invalid bag." });
  res.json(await buildQuote(body.data, await getSettings()));
});

const orderSchema = z.object({
  lines: z.array(lineSchema).min(1).max(60),
  code: z.string().max(40).optional(),
  zoneId: z.string().min(1).max(40),
  customerName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/),
  email: z.union([z.string().trim().email().max(120), z.literal("")]).default(""),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().min(3).max(300),
  notes: z.string().trim().max(500).default(""),
  expectedTotal: z.number().optional(),
});

store.post("/orders", writeLimit, async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    const labels: Record<string, string> = {
      customerName: "Please enter your full name.", phone: "Please enter a valid phone number.",
      email: "Please enter a valid email, or leave it empty.", city: "Please enter your city.",
      address: "Please enter your delivery address.", zoneId: "Please choose a delivery area.", lines: "Your bag is empty.",
    };
    return res.status(400).json({ message: labels[field] || "Please check your details.", field });
  }
  const data = parsed.data;
  const settings = await getSettings();
  if (!req.user && !settings.guestCheckout) return res.status(401).json({ message: "Please sign in to place an order." });
  const zone = settings.zones.find((z) => z.id === data.zoneId);
  if (!zone) return res.status(400).json({ message: "Please choose a delivery area.", field: "zoneId" });

  try {
    const order = await tx(async (client) => {
      // Lock the shade rows so two customers can't buy the last piece at once.
      const quote = await buildQuote(data, settings, client, true);
      const asked = data.lines.reduce((n, l) => n + l.qty, 0);
      if (!quote.lines.length || quote.removed > 0 || quote.itemCount < asked) {
        throw Object.assign(new Error("Some items in your bag just sold out. We updated your bag."), { status: 409 });
      }
      if (data.expectedTotal != null && Math.abs(data.expectedTotal - quote.total) > 0.01) {
        throw Object.assign(new Error("Prices changed while you were checking out. Please review your order."), { status: 409 });
      }
      const { rows } = await client.query(
        `INSERT INTO orders (order_number, user_id, customer_name, phone, email, city, address, notes, zone_name,
           subtotal, bundle_discount, code_discount, discount_code, shipping, total, gift)
         VALUES ('tmp-' || gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
        [req.user?.id ?? null, data.customerName, data.phone, data.email, data.city, data.address, data.notes, zone.name,
         quote.subtotal, quote.bundleDiscount, quote.codeDiscount, quote.discountCode, quote.shipping, quote.total, quote.gift],
      );
      const id: number = rows[0].id;
      const orderNumber = `SB-${10000 + id}`;
      await client.query("UPDATE orders SET order_number = $1 WHERE id = $2", [orderNumber, id]);
      for (const l of quote.lines) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, shade_id, name, brand_name, shade_name, shade_hex, image, art, price, qty)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [id, l.productId, l.shadeId, l.name, l.brandName, l.hasShades ? l.shadeName : "", l.shadeHex, l.image, l.art, l.price, l.qty],
        );
        await client.query("UPDATE shades SET stock = stock - $1 WHERE id = $2", [l.qty, l.shadeId]);
        await client.query("UPDATE products SET sold_count = sold_count + $1 WHERE id = $2", [l.qty, l.productId]);
      }
      if (quote.discountCode) {
        await client.query("UPDATE discount_codes SET used_count = used_count + 1 WHERE code = $1", [quote.discountCode]);
      }
      return { orderNumber, total: quote.total };
    });
    res.json(order);
  } catch (err: any) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    throw err;
  }
});

export async function loadOrders(where: string, params: any[], limit = 100): Promise<Order[]> {
  return q<Order>(
    `SELECT o.*, COALESCE((SELECT json_agg(i ORDER BY i.id) FROM order_items i WHERE i.order_id = o.id), '[]') AS items
     FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ${limit}`,
    params,
  );
}

const digits = (s: string) => s.replace(/\D/g, "");

// Guests track an order with its number plus the phone used at checkout.
store.get("/orders/track", writeLimit, async (req, res) => {
  const number = String(req.query.number || "").trim().toUpperCase();
  const phone = digits(String(req.query.phone || ""));
  if (!number || phone.length < 7) return res.status(400).json({ message: "Enter your order number and phone number." });
  const [order] = await loadOrders("WHERE UPPER(o.order_number) = $1", [number.startsWith("SB-") ? number : `SB-${number}`], 1);
  if (!order || digits(order.phone).slice(-7) !== phone.slice(-7)) {
    return res.status(404).json({ message: "We couldn't find an order with those details." });
  }
  const { adminNote, userId, ...safe } = order;
  res.json(safe);
});

store.post("/subscribe", writeLimit, async (req, res) => {
  const contact = String(req.body?.contact || "").trim().slice(0, 120);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isPhone = /^[+\d][\d\s-]{6,18}$/.test(contact);
  if (!isEmail && !isPhone) return res.status(400).json({ message: "Enter a valid WhatsApp number or email." });
  await q("INSERT INTO subscribers (contact, source) VALUES ($1, $2) ON CONFLICT (contact) DO NOTHING",
    [contact.toLowerCase(), String(req.body?.source || "site").slice(0, 30)]);
  const settings = await getSettings();
  res.json({ code: settings.welcomeOn ? settings.welcomeCode : "" });
});

store.post("/contact", writeLimit, async (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2).max(80), contact: z.string().trim().min(5).max(120), message: z.string().trim().min(3).max(2000),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: "Please fill in your name, contact and message." });
  await q("INSERT INTO messages (name, contact, message) VALUES ($1,$2,$3)", [body.data.name, body.data.contact, body.data.message]);
  res.json({ message: "Message sent. We will get back to you soon." });
});
