import type { Product } from "@shared/types";
import { q } from "./db";

/** One SELECT that returns a product with its brand, category, shades and rating. */
export const PRODUCT_SELECT = `
  SELECT p.*,
    b.name AS brand_name, b.slug AS brand_slug,
    c.name AS category_name, c.slug AS category_slug,
    COALESCE((SELECT json_agg(s ORDER BY s.sort_order, s.id) FROM shades s WHERE s.product_id = p.id), '[]') AS shades,
    COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.product_id = p.id AND r.is_approved), 0) AS rating,
    (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.is_approved) AS review_count
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  LEFT JOIN categories c ON c.id = p.category_id
`;

export interface ProductFilter {
  category?: string; brand?: string; search?: string; family?: string;
  sale?: boolean; isNew?: boolean; featured?: boolean; deal?: boolean;
  min?: number; max?: number; ids?: number[];
  sort?: string; limit?: number; includeInactive?: boolean;
}

const SORTS: Record<string, string> = {
  popular: "p.sold_count DESC, p.is_featured DESC, p.id DESC",
  new: "p.created_at DESC, p.id DESC",
  "price-asc": "COALESCE(p.sale_price, p.price) ASC",
  "price-desc": "COALESCE(p.sale_price, p.price) DESC",
  name: "p.name ASC",
};

export async function listProducts(f: ProductFilter = {}): Promise<Product[]> {
  const where: string[] = [];
  const params: any[] = [];
  const add = (sql: string, value: any) => { params.push(value); where.push(sql.replace("?", `$${params.length}`)); };

  if (!f.includeInactive) where.push("p.is_active");
  if (f.category) add("c.slug = ?", f.category);
  if (f.brand) add("b.slug = ?", f.brand);
  if (f.search) {
    params.push(`%${f.search.trim()}%`);
    const n = `$${params.length}`;
    where.push(`(p.name ILIKE ${n} OR b.name ILIKE ${n} OR c.name ILIKE ${n} OR p.finish ILIKE ${n}
      OR EXISTS (SELECT 1 FROM shades s WHERE s.product_id = p.id AND s.name ILIKE ${n}))`);
  }
  if (f.family) add("EXISTS (SELECT 1 FROM shades s WHERE s.product_id = p.id AND s.family = ?)", f.family);
  if (f.sale) where.push("p.sale_price IS NOT NULL AND p.sale_price < p.price");
  if (f.isNew) where.push("p.is_new");
  if (f.featured) where.push("p.is_featured");
  if (f.deal) where.push("p.is_deal");
  if (f.min != null) add("COALESCE(p.sale_price, p.price) >= ?", f.min);
  if (f.max != null) add("COALESCE(p.sale_price, p.price) <= ?", f.max);
  if (f.ids) add("p.id = ANY(?::int[])", f.ids);

  const order = SORTS[f.sort || "popular"] || SORTS.popular;
  const limit = Math.min(Math.max(f.limit || 200, 1), 500);
  return q<Product>(
    `${PRODUCT_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order} LIMIT ${limit}`,
    params,
  );
}

export function slugify(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item";
}

/** Find a slug that is not taken yet in the given table. */
export async function uniqueSlug(table: "products" | "categories" | "brands", name: string, ignoreId?: number): Promise<string> {
  const base = slugify(name);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const rows = await q(`SELECT id FROM ${table} WHERE slug = $1 AND id <> $2`, [slug, ignoreId ?? 0]);
    if (!rows.length) return slug;
  }
  return `${base}-${Date.now()}`;
}
