import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import multer from "multer";
import sharp from "sharp";
import { z } from "zod";
import { ART_KINDS, ORDER_STATUSES, type DashboardStats } from "@shared/types";
import { one, q, tx } from "../db";
import { requireAdmin } from "../auth";
import { getSettings, saveSettings } from "../settings";
import { listProducts, PRODUCT_SELECT, uniqueSlug } from "../catalog";
import { loadOrders } from "./store";

export const admin = Router();
admin.use(requireAdmin);

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ───────────────────────────── Dashboard ─────────────────────────────

admin.get("/stats", async (_req, res) => {
  const settings = await getSettings();
  const sum = async (since: string) =>
    (await one<{ orders: number; revenue: number }>(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue FROM orders
       WHERE status <> 'cancelled' AND created_at >= ${since}`))!;
  const [today, week, month, counts, daily, topProducts, lowStock, recentOrders] = await Promise.all([
    sum("date_trunc('day', now())"), sum("now() - interval '7 days'"), sum("now() - interval '30 days'"),
    one<any>(`SELECT
      (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers,
      (SELECT COUNT(*) FROM products WHERE is_active) AS products,
      (SELECT COUNT(*) FROM messages WHERE NOT is_read) AS unread_messages,
      (SELECT COUNT(*) FROM reviews WHERE NOT is_approved) AS pending_reviews`),
    q(`SELECT to_char(d, 'YYYY-MM-DD') AS day,
         COALESCE(SUM(o.total), 0) AS revenue, COUNT(o.id) AS orders
       FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d
       LEFT JOIN orders o ON date_trunc('day', o.created_at) = d AND o.status <> 'cancelled'
       GROUP BY d ORDER BY d`),
    q(`SELECT i.name, SUM(i.qty) AS qty, SUM(i.qty * i.price) AS revenue
       FROM order_items i JOIN orders o ON o.id = i.order_id AND o.status <> 'cancelled'
       WHERE o.created_at >= now() - interval '30 days'
       GROUP BY i.name ORDER BY qty DESC LIMIT 5`),
    q(`SELECT p.id AS product_id, p.name, s.name AS shade_name, s.stock
       FROM shades s JOIN products p ON p.id = s.product_id AND p.is_active
       WHERE s.stock <= $1 ORDER BY s.stock, p.name LIMIT 12`, [settings.lowStockAt]),
    loadOrders("", [], 6),
  ]);
  const stats: DashboardStats = { today, week, month, ...counts, daily, topProducts, lowStock, recentOrders };
  res.json(stats);
});

// ───────────────────────────── Uploads ─────────────────────────────

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 10 } });

// Every photo is resized and converted to WebP so the store stays fast.
admin.post("/upload", upload.array("files", 10), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) return res.status(400).json({ message: "Choose at least one image." });
  const urls: string[] = [];
  for (const file of files) {
    if (!file.mimetype.startsWith("image/")) return res.status(400).json({ message: "Only image files can be uploaded." });
    const name = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}.webp`;
    try {
      await sharp(file.buffer).rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 }).toFile(path.join(UPLOAD_DIR, name));
    } catch {
      return res.status(400).json({ message: `"${file.originalname}" could not be read as an image.` });
    }
    urls.push(`/uploads/${name}`);
  }
  res.json({ urls });
});

// ───────────────────────────── Products ─────────────────────────────

const productSchema = z.object({
  name: z.string().trim().min(2).max(140),
  brandId: z.number().int().nullable(),
  categoryId: z.number().int().nullable(),
  description: z.string().max(4000).default(""),
  howToUse: z.string().max(4000).default(""),
  ingredients: z.string().max(6000).default(""),
  price: z.number().min(0).max(100000),
  salePrice: z.number().min(0).max(100000).nullable(),
  images: z.array(z.string().max(300)).max(12).default([]),
  art: z.enum(ART_KINDS as [string, ...string[]]),
  finish: z.string().trim().max(40).default(""),
  isActive: z.boolean(), isFeatured: z.boolean(), isNew: z.boolean(), isDeal: z.boolean(),
  shades: z.array(z.object({
    id: z.number().int().optional(),
    name: z.string().trim().max(60).default(""),
    hex: z.string().trim().regex(/^(#[0-9a-fA-F]{6})?$/).default(""),
    family: z.string().trim().max(20).default(""),
    stock: z.number().int().min(0).max(100000),
    image: z.string().max(300).nullable().default(null),
  })).min(1).max(80),
});

admin.get("/products", async (_req, res) => {
  res.json(await listProducts({ includeInactive: true, sort: "new", limit: 500 }));
});

async function saveProduct(id: number | null, body: unknown) {
  const p = productSchema.parse(body);
  const slug = await uniqueSlug("products", p.name, id ?? undefined);
  return tx(async (c) => {
    const values = [p.name, slug, p.brandId, p.categoryId, p.description, p.howToUse, p.ingredients, p.price,
      p.salePrice && p.salePrice < p.price ? p.salePrice : null, JSON.stringify(p.images), p.art, p.finish,
      p.isActive, p.isFeatured, p.isNew, p.isDeal];
    let productId = id;
    if (productId) {
      await c.query(
        `UPDATE products SET name=$1, slug=$2, brand_id=$3, category_id=$4, description=$5, how_to_use=$6, ingredients=$7,
           price=$8, sale_price=$9, images=$10::jsonb, art=$11, finish=$12, is_active=$13, is_featured=$14, is_new=$15, is_deal=$16
         WHERE id=$17`, [...values, productId]);
    } else {
      const { rows } = await c.query(
        `INSERT INTO products (name, slug, brand_id, category_id, description, how_to_use, ingredients, price, sale_price,
           images, art, finish, is_active, is_featured, is_new, is_deal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16) RETURNING id`, values);
      productId = rows[0].id as number;
    }
    // Keep existing shade rows (orders point at them); add new ones; remove deleted ones.
    const keep = p.shades.filter((s) => s.id).map((s) => s.id);
    await c.query("DELETE FROM shades WHERE product_id = $1 AND NOT (id = ANY($2::int[]))", [productId, keep]);
    for (const [i, s] of p.shades.entries()) {
      const sv = [s.name, s.hex, s.family, s.stock, s.image, i];
      if (s.id) await c.query("UPDATE shades SET name=$1, hex=$2, family=$3, stock=$4, image=$5, sort_order=$6 WHERE id=$7 AND product_id=$8", [...sv, s.id, productId]);
      else await c.query("INSERT INTO shades (name, hex, family, stock, image, sort_order, product_id) VALUES ($1,$2,$3,$4,$5,$6,$7)", [...sv, productId]);
    }
    return productId;
  });
}

admin.post("/products", async (req, res) => {
  const id = await saveProduct(null, req.body);
  res.json(await one(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]));
});
admin.put("/products/:id", async (req, res) => {
  const id = await saveProduct(Number(req.params.id), req.body);
  res.json(await one(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]));
});
// Quick switches from the product list (show/hide, bestseller, new, deal).
admin.patch("/products/:id", async (req, res) => {
  const body = z.object({ isActive: z.boolean(), isFeatured: z.boolean(), isNew: z.boolean(), isDeal: z.boolean() }).partial().parse(req.body);
  const map: Record<string, string> = { isActive: "is_active", isFeatured: "is_featured", isNew: "is_new", isDeal: "is_deal" };
  for (const [k, v] of Object.entries(body)) await q(`UPDATE products SET ${map[k]} = $1 WHERE id = $2`, [v, Number(req.params.id)]);
  res.json({ ok: true });
});
admin.delete("/products/:id", async (req, res) => {
  await q("DELETE FROM products WHERE id = $1", [Number(req.params.id)]);
  res.json({ ok: true });
});

// ───────────────────────── Categories & brands ─────────────────────────

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60), image: z.string().max(300).nullable().default(null),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/), art: z.enum(ART_KINDS as [string, ...string[]]),
  sortOrder: z.number().int().default(0), isActive: z.boolean().default(true),
});
admin.get("/categories", async (_req, res) => {
  res.json(await q(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count FROM categories c ORDER BY c.sort_order, c.id`));
});
admin.post("/categories", async (req, res) => {
  const c = categorySchema.parse(req.body);
  res.json(await one("INSERT INTO categories (name, slug, image, color, art, sort_order, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [c.name, await uniqueSlug("categories", c.name), c.image, c.color, c.art, c.sortOrder, c.isActive]));
});
admin.put("/categories/:id", async (req, res) => {
  const c = categorySchema.parse(req.body);
  const id = Number(req.params.id);
  res.json(await one("UPDATE categories SET name=$1, slug=$2, image=$3, color=$4, art=$5, sort_order=$6, is_active=$7 WHERE id=$8 RETURNING *",
    [c.name, await uniqueSlug("categories", c.name, id), c.image, c.color, c.art, c.sortOrder, c.isActive, id]));
});
admin.delete("/categories/:id", async (req, res) => {
  await q("DELETE FROM categories WHERE id = $1", [Number(req.params.id)]);
  res.json({ ok: true });
});

const brandSchema = z.object({
  name: z.string().trim().min(1).max(60), logo: z.string().max(300).nullable().default(null),
  description: z.string().max(600).default(""), isFeatured: z.boolean().default(true),
  sortOrder: z.number().int().default(0), isActive: z.boolean().default(true),
});
admin.get("/brands", async (_req, res) => {
  res.json(await q(`SELECT b.*, (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id) AS product_count FROM brands b ORDER BY b.sort_order, b.name`));
});
admin.post("/brands", async (req, res) => {
  const b = brandSchema.parse(req.body);
  res.json(await one("INSERT INTO brands (name, slug, logo, description, is_featured, sort_order, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [b.name, await uniqueSlug("brands", b.name), b.logo, b.description, b.isFeatured, b.sortOrder, b.isActive]));
});
admin.put("/brands/:id", async (req, res) => {
  const b = brandSchema.parse(req.body);
  const id = Number(req.params.id);
  res.json(await one("UPDATE brands SET name=$1, slug=$2, logo=$3, description=$4, is_featured=$5, sort_order=$6, is_active=$7 WHERE id=$8 RETURNING *",
    [b.name, await uniqueSlug("brands", b.name, id), b.logo, b.description, b.isFeatured, b.sortOrder, b.isActive, id]));
});
admin.delete("/brands/:id", async (req, res) => {
  await q("DELETE FROM brands WHERE id = $1", [Number(req.params.id)]);
  res.json({ ok: true });
});

// ───────────────────────────── Orders ─────────────────────────────

admin.get("/orders", async (req, res) => {
  const where: string[] = [];
  const params: any[] = [];
  const status = String(req.query.status || "");
  if ((ORDER_STATUSES as readonly string[]).includes(status)) { params.push(status); where.push(`o.status = $${params.length}`); }
  const search = String(req.query.q || "").trim();
  if (search) {
    params.push(`%${search}%`);
    where.push(`(o.order_number ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.phone ILIKE $${params.length})`);
  }
  res.json(await loadOrders(where.length ? "WHERE " + where.join(" AND ") : "", params, 300));
});

admin.patch("/orders/:id", async (req, res) => {
  const body = z.object({ status: z.enum(ORDER_STATUSES).optional(), adminNote: z.string().max(1000).optional() }).parse(req.body);
  const id = Number(req.params.id);
  await tx(async (c) => {
    const { rows } = await c.query("SELECT status FROM orders WHERE id = $1 FOR UPDATE", [id]);
    if (!rows.length) throw Object.assign(new Error("Order not found."), { status: 404 });
    const before: string = rows[0].status;
    if (body.status && body.status !== before) {
      // Cancelling puts the pieces back on the shelf; un-cancelling takes them again.
      const sign = body.status === "cancelled" ? 1 : before === "cancelled" ? -1 : 0;
      if (sign) {
        await c.query(`UPDATE shades s SET stock = GREATEST(s.stock + $1 * i.qty, 0) FROM order_items i WHERE i.order_id = $2 AND i.shade_id = s.id`, [sign, id]);
        await c.query(`UPDATE products p SET sold_count = GREATEST(p.sold_count - $1 * i.qty, 0) FROM order_items i WHERE i.order_id = $2 AND i.product_id = p.id`, [sign, id]);
      }
      await c.query("UPDATE orders SET status = $1 WHERE id = $2", [body.status, id]);
    }
    if (body.adminNote != null) await c.query("UPDATE orders SET admin_note = $1 WHERE id = $2", [body.adminNote, id]);
  });
  res.json((await loadOrders("WHERE o.id = $1", [id], 1))[0]);
});

// ───────────────────────── Discount codes ─────────────────────────

const codeSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,24}$/),
  type: z.enum(["percent", "fixed"]), value: z.number().min(0.01).max(100000),
  minSubtotal: z.number().min(0).default(0), maxUses: z.number().int().min(1).nullable().default(null),
  expiresAt: z.string().nullable().default(null), isActive: z.boolean().default(true),
}).refine((c) => c.type !== "percent" || c.value <= 100, { message: "A percentage can't be more than 100." });

admin.get("/codes", async (_req, res) => res.json(await q("SELECT * FROM discount_codes ORDER BY id DESC")));
admin.post("/codes", async (req, res) => {
  const c = codeSchema.parse(req.body);
  if (await one("SELECT id FROM discount_codes WHERE code = $1", [c.code])) return res.status(409).json({ message: "This code already exists." });
  res.json(await one("INSERT INTO discount_codes (code, type, value, min_subtotal, max_uses, expires_at, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [c.code, c.type, c.value, c.minSubtotal, c.maxUses, c.expiresAt || null, c.isActive]));
});
admin.put("/codes/:id", async (req, res) => {
  const c = codeSchema.parse(req.body);
  const id = Number(req.params.id);
  if (await one("SELECT id FROM discount_codes WHERE code = $1 AND id <> $2", [c.code, id])) return res.status(409).json({ message: "This code already exists." });
  res.json(await one("UPDATE discount_codes SET code=$1, type=$2, value=$3, min_subtotal=$4, max_uses=$5, expires_at=$6, is_active=$7 WHERE id=$8 RETURNING *",
    [c.code, c.type, c.value, c.minSubtotal, c.maxUses, c.expiresAt || null, c.isActive, id]));
});
admin.delete("/codes/:id", async (req, res) => {
  await q("DELETE FROM discount_codes WHERE id = $1", [Number(req.params.id)]);
  res.json({ ok: true });
});

// ───────────────────────────── Reviews ─────────────────────────────

admin.get("/reviews", async (_req, res) => {
  res.json(await q(`SELECT r.*, p.name AS product_name FROM reviews r JOIN products p ON p.id = r.product_id ORDER BY r.is_approved, r.created_at DESC LIMIT 300`));
});
admin.patch("/reviews/:id", async (req, res) => {
  await q("UPDATE reviews SET is_approved = $1 WHERE id = $2", [!!req.body?.isApproved, Number(req.params.id)]);
  res.json({ ok: true });
});
admin.delete("/reviews/:id", async (req, res) => {
  await q("DELETE FROM reviews WHERE id = $1", [Number(req.params.id)]);
  res.json({ ok: true });
});

// ───────────────────── Customers, subscribers, messages ─────────────────────

admin.get("/customers", async (_req, res) => {
  res.json(await q(`SELECT u.id, u.name, u.email, u.phone, u.role, u.is_blocked, u.created_at,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status <> 'cancelled') AS order_count,
      COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.user_id = u.id AND o.status <> 'cancelled'), 0) AS total_spent
    FROM users u ORDER BY u.created_at DESC LIMIT 500`));
});
admin.patch("/customers/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user!.id) return res.status(400).json({ message: "You can't block your own account." });
  const blocked = !!req.body?.isBlocked;
  await q("UPDATE users SET is_blocked = $1 WHERE id = $2", [blocked, id]);
  if (blocked) await q(`DELETE FROM "session" WHERE (sess ->> 'userId')::int = $1`, [id]);
  res.json({ ok: true });
});
admin.get("/subscribers", async (_req, res) => res.json(await q("SELECT * FROM subscribers ORDER BY created_at DESC LIMIT 2000")));
admin.delete("/subscribers/:id", async (req, res) => {
  await q("DELETE FROM subscribers WHERE id = $1", [Number(req.params.id)]);
  res.json({ ok: true });
});
admin.get("/messages", async (_req, res) => res.json(await q("SELECT * FROM messages ORDER BY created_at DESC LIMIT 300")));
admin.patch("/messages/:id", async (req, res) => {
  await q("UPDATE messages SET is_read = $1 WHERE id = $2", [!!req.body?.isRead, Number(req.params.id)]);
  res.json({ ok: true });
});
admin.delete("/messages/:id", async (req, res) => {
  await q("DELETE FROM messages WHERE id = $1", [Number(req.params.id)]);
  res.json({ ok: true });
});

// ───────────────────────────── Settings ─────────────────────────────

admin.put("/settings", async (req, res) => {
  res.json(await saveSettings(req.body ?? {}));
});
