import type { ArtKind } from "@shared/types";
import { one, pool, tx } from "./db";
import { slugify } from "./catalog";
import { saveSettings } from "./settings";
import { hashPassword } from "./auth";
import { randomBytes } from "crypto";

// A sample catalogue so the store looks alive on day one.
// It only runs when the products table is empty. Replace it from the admin panel.

type S = [name: string, hex: string, family: string];
const LIP: S[] = [
  ["Cherry Bomb", "#C2183F", "red"], ["Rosewood", "#A34A5E", "pink"], ["Nude Silk", "#C98B7B", "nude"],
  ["Coral Crush", "#F0624D", "coral"], ["Berry Noir", "#6E1238", "berry"], ["Pink Pop", "#EC5C93", "pink"],
  ["Mocha", "#8A5346", "brown"], ["Ruby", "#A1122D", "red"],
];
const SKIN: S[] = [
  ["Porcelain", "#F3D9C4", "nude"], ["Ivory", "#EBC9A9", "nude"], ["Sand", "#DDB18A", "nude"],
  ["Honey", "#C99468", "nude"], ["Caramel", "#A9703F", "brown"], ["Mocha", "#7C4A2B", "brown"],
];
const BLUSH: S[] = [["Peach Glow", "#F4A58A", "coral"], ["Rose Petal", "#E98A9E", "pink"], ["Berry Flush", "#B84A6A", "berry"], ["Soft Nude", "#D9A08B", "nude"]];
const NAIL: S[] = [
  ["Classic Red", "#C2183F", "red"], ["Ballet Pink", "#F5C6CF", "pink"], ["Wine", "#5E1230", "berry"],
  ["Coral", "#F26B5B", "coral"], ["Nude", "#D9B3A0", "nude"], ["Chocolate", "#5B3327", "brown"],
];
const pick = (list: S[], ...i: number[]) => i.map((n) => list[n]);

interface P {
  name: string; brand: string; cat: string; art: ArtKind; price: number; sale?: number; finish?: string;
  shades?: S[]; flags?: string; desc: string;
}

const BRANDS = ["Maybelline", "L'Oréal Paris", "NYX", "Essence", "Catrice", "Flormar", "Golden Rose", "Rimmel"];

const CATEGORIES: { name: string; color: string; art: ArtKind }[] = [
  { name: "Lips", color: "#FFB8D2", art: "lipstick" },
  { name: "Eyes", color: "#E7C6F0", art: "mascara" },
  { name: "Face", color: "#FFDCCB", art: "foundation" },
  { name: "Cheeks", color: "#FFC9C2", art: "compact" },
  { name: "Nails", color: "#FFA6C9", art: "polish" },
  { name: "Brushes", color: "#F6DDF0", art: "brush" },
  { name: "Skincare", color: "#E6EAD7", art: "foundation" },
  { name: "Tools", color: "#E3DAF1", art: "brush" },
];

const PRODUCTS: P[] = [
  { name: "Velvet Matte Lipstick", brand: "Maybelline", cat: "Lips", art: "lipstick", price: 45, finish: "Matte", shades: LIP, flags: "fn", desc: "Rich colour in one swipe with a soft matte finish that stays comfortable all day." },
  { name: "Satin Colour Lipstick", brand: "L'Oréal Paris", cat: "Lips", art: "lipstick", price: 59, sale: 47, finish: "Satin", shades: pick(LIP, 0, 1, 2, 4, 7), flags: "fd", desc: "Creamy satin lipstick with a smooth, hydrating feel and full coverage." },
  { name: "Butter Shine Lip Gloss", brand: "NYX", cat: "Lips", art: "gloss", price: 39, finish: "Glossy", shades: pick(LIP, 2, 5, 3, 1), flags: "fn", desc: "Non-sticky gloss with a juicy shine and a sheer wash of colour." },
  { name: "Soft Matte Lip Cream", brand: "NYX", cat: "Lips", art: "gloss", price: 42, finish: "Matte", shades: pick(LIP, 0, 2, 4, 6, 1), flags: "f", desc: "A weightless liquid lipstick that dries to a velvety matte." },
  { name: "Precision Lip Liner", brand: "Essence", cat: "Lips", art: "liner", price: 18, finish: "Matte", shades: pick(LIP, 2, 1, 0, 6), desc: "Creamy lip pencil that defines and stops colour from feathering." },
  { name: "Longwear Liquid Lipstick", brand: "Flormar", cat: "Lips", art: "gloss", price: 36, sale: 29, finish: "Matte", shades: pick(LIP, 7, 4, 3, 5), desc: "Transfer-resistant colour that lasts through meals." },
  { name: "Hydra Lip Tint", brand: "Catrice", cat: "Lips", art: "gloss", price: 33, finish: "Sheer", shades: pick(LIP, 5, 3, 1), flags: "n", desc: "A buildable tint that leaves lips soft and naturally flushed." },
  { name: "Creamy Lipstick", brand: "Golden Rose", cat: "Lips", art: "lipstick", price: 28, finish: "Cream", shades: pick(LIP, 0, 1, 2, 3, 6), desc: "Everyday creamy lipstick with vitamin E." },

  { name: "Sky High Volume Mascara", brand: "Maybelline", cat: "Eyes", art: "mascara", price: 62, sale: 52, flags: "fd", desc: "Lengthens and lifts every lash with a flexible brush that reaches corner to corner." },
  { name: "Lash Paradise Mascara", brand: "L'Oréal Paris", cat: "Eyes", art: "mascara", price: 65, flags: "f", desc: "Feathery soft volume and length without clumps." },
  { name: "Lash Princess Mascara", brand: "Essence", cat: "Eyes", art: "mascara", price: 29, flags: "fn", desc: "Dramatic false-lash effect at a tiny price." },
  { name: "Epic Ink Eyeliner", brand: "NYX", cat: "Eyes", art: "liner", price: 49, shades: [["Black", "#17131A", ""], ["Brown", "#4A2F26", "brown"]], flags: "f", desc: "Waterproof liquid liner with a fine brush tip for sharp wings." },
  { name: "Nude Eyeshadow Palette", brand: "Catrice", cat: "Eyes", art: "palette", price: 79, sale: 63, finish: "Matte & shimmer", flags: "fn", desc: "Nine everyday nudes in matte and shimmer finishes." },
  { name: "Sunset Eyeshadow Palette", brand: "NYX", cat: "Eyes", art: "palette", price: 95, finish: "Matte & shimmer", flags: "n", desc: "Sixteen warm shades from peach to deep burgundy." },
  { name: "Kajal Eye Pencil", brand: "Golden Rose", cat: "Eyes", art: "liner", price: 16, shades: [["Black", "#17131A", ""], ["Blue", "#22408C", ""], ["Green", "#1F5B43", ""]], desc: "Soft kohl pencil that glides on and smudges beautifully." },
  { name: "Brow Definer Pencil", brand: "Rimmel", cat: "Eyes", art: "liner", price: 32, shades: [["Blonde", "#A88462", "brown"], ["Medium Brown", "#6B4A36", "brown"], ["Dark Brown", "#3F2B22", "brown"]], desc: "Slanted tip pencil with a spoolie for natural, full brows." },

  { name: "Fit Me Matte Foundation", brand: "Maybelline", cat: "Face", art: "foundation", price: 69, finish: "Matte", shades: SKIN, flags: "f", desc: "Lightweight foundation that mattifies and blurs pores for a natural finish." },
  { name: "True Match Foundation", brand: "L'Oréal Paris", cat: "Face", art: "foundation", price: 89, sale: 75, finish: "Natural", shades: pick(SKIN, 0, 1, 2, 3, 4), flags: "f", desc: "Matches skin tone and texture with a skin-like finish." },
  { name: "HD Liquid Concealer", brand: "Catrice", cat: "Face", art: "gloss", price: 35, finish: "Natural", shades: pick(SKIN, 0, 1, 2, 3), flags: "fn", desc: "High-coverage concealer that hides dark circles without creasing." },
  { name: "Setting Powder", brand: "Rimmel", cat: "Face", art: "compact", price: 42, finish: "Matte", shades: [["Translucent", "#F4E3D3", "nude"]], desc: "Controls shine for up to five hours and sets makeup in place." },
  { name: "Pore Filler Primer", brand: "NYX", cat: "Face", art: "foundation", price: 58, desc: "Silky primer that smooths skin and helps makeup last longer." },

  { name: "Baked Blush", brand: "Flormar", cat: "Cheeks", art: "compact", price: 39, finish: "Satin", shades: BLUSH, flags: "f", desc: "Silky baked blush for a healthy, natural flush." },
  { name: "Glow Highlighter", brand: "Essence", cat: "Cheeks", art: "compact", price: 27, finish: "Shimmer", shades: [["Champagne", "#EBD3A6", "nude"], ["Rose Gold", "#E7B4A6", "pink"]], flags: "n", desc: "Finely milled highlighter for a soft-focus glow." },
  { name: "Sun Bronzer", brand: "Rimmel", cat: "Cheeks", art: "compact", price: 44, sale: 36, finish: "Matte", shades: [["Light", "#C99468", "brown"], ["Medium", "#A9703F", "brown"]], desc: "Buildable matte bronzer for a sun-kissed look." },

  { name: "Gel Shine Nail Polish", brand: "Essence", cat: "Nails", art: "polish", price: 14, finish: "Gel shine", shades: NAIL, flags: "f", desc: "High-shine colour that lasts up to seven days. No lamp needed." },
  { name: "Rich Colour Nail Lacquer", brand: "Golden Rose", cat: "Nails", art: "polish", price: 12, finish: "Glossy", shades: pick(NAIL, 0, 2, 4, 3), desc: "Wide-brush polish with full coverage in two coats." },

  { name: "Powder Brush", brand: "Flormar", cat: "Brushes", art: "brush", price: 34, desc: "Large, fluffy brush for powder and bronzer." },
  { name: "Blending Brush", brand: "Catrice", cat: "Brushes", art: "brush", price: 22, flags: "n", desc: "Tapered brush that blends eyeshadow seamlessly." },
  { name: "Hydrating Face Serum", brand: "L'Oréal Paris", cat: "Skincare", art: "foundation", price: 79, flags: "fn", desc: "Lightweight hydrating face serum for everyday skincare routines." },
  { name: "Daily Moisture Cream", brand: "Catrice", cat: "Skincare", art: "compact", price: 54, sale: 44, flags: "f", desc: "Soft everyday moisture cream with a comforting finish." },
  { name: "Gentle Cleansing Gel", brand: "Essence", cat: "Skincare", art: "foundation", price: 39, desc: "A gentle gel cleanser for a fresh-feeling face." },
  { name: "Glow Face Mist", brand: "Flormar", cat: "Skincare", art: "gloss", price: 42, flags: "n", desc: "Refreshing mist that adds a dewy glow to your daily routine." },
  { name: "Makeup Sponge Set", brand: "Essence", cat: "Tools", art: "compact", price: 25, flags: "f", desc: "A soft blending sponge set for smooth, even application." },
  { name: "Precision Brush Set", brand: "Flormar", cat: "Tools", art: "brush", price: 89, sale: 72, flags: "f", desc: "Five versatile brushes for eyes, cheeks, and face makeup." },
  { name: "Eyelash Curler", brand: "Rimmel", cat: "Tools", art: "liner", price: 29, desc: "A comfortable eyelash curler for a lifted lash look." },
  { name: "Compact Makeup Mirror", brand: "Golden Rose", cat: "Tools", art: "compact", price: 35, flags: "n", desc: "A travel-friendly mirror for quick makeup touchups." },
];

export async function seedDemo() {
  if (await one("SELECT id FROM products LIMIT 1")) return;
  console.log("[seed] Adding the sample catalogue…");
  await tx(async (c) => {
    const brandId: Record<string, number> = {};
    for (const [i, name] of BRANDS.entries()) {
      const { rows } = await c.query("INSERT INTO brands (name, slug, sort_order) VALUES ($1,$2,$3) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id", [name, slugify(name), i]);
      brandId[name] = rows[0].id;
    }
    const catId: Record<string, number> = {};
    for (const [i, cat] of CATEGORIES.entries()) {
      const { rows } = await c.query("INSERT INTO categories (name, slug, color, art, sort_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id", [cat.name, slugify(cat.name), cat.color, cat.art, i]);
      catId[cat.name] = rows[0].id;
    }
    for (const [i, p] of PRODUCTS.entries()) {
      const flags = p.flags || "";
      const { rows } = await c.query(
        `INSERT INTO products (name, slug, brand_id, category_id, description, how_to_use, price, sale_price, art, finish,
           is_featured, is_new, is_deal, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now() - ($14 || ' hours')::interval) RETURNING id`,
        [p.name, slugify(`${p.brand} ${p.name}`), brandId[p.brand], catId[p.cat], p.desc,
         "Apply to clean skin. Build up for more intensity.", p.price, p.sale ?? null, p.art, p.finish || "",
         flags.includes("f"), flags.includes("n"), flags.includes("d"), String(i)],
      );
      const shades: S[] = p.shades || [["", "", ""]];
      for (const [n, s] of shades.entries()) {
        // A few low-stock and sold-out shades so every state of the store can be seen.
        const stock = n === 3 && i % 4 === 0 ? 0 : n === 1 && i % 3 === 0 ? 2 : 12 + ((i * 7 + n * 5) % 20);
        await c.query("INSERT INTO shades (product_id, name, hex, family, stock, sort_order) VALUES ($1,$2,$3,$4,$5,$6)", [rows[0].id, s[0], s[1], s[2], stock, n]);
      }
    }
    await c.query("INSERT INTO discount_codes (code, type, value) VALUES ('WELCOME10', 'percent', 10) ON CONFLICT (code) DO NOTHING");
    await c.query("INSERT INTO discount_codes (code, type, value) VALUES ('BEAUTY15', 'percent', 15) ON CONFLICT (code) DO NOTHING");
    await c.query("INSERT INTO discount_codes (code, type, value, min_subtotal) VALUES ('GLOW20', 'fixed', 20, 150) ON CONFLICT (code) DO NOTHING");

    // Fictional-only records for testing the admin dashboard. No real customer data.
    const placeholderHash = await hashPassword(randomBytes(32).toString("hex"));
    const customers: { id: number; name: string; email: string; phone: string }[] = [];
    for (let i = 1; i <= 8; i++) {
      const name = `Demo Customer ${i}`;
      const email = `demo-customer-${i}@example.invalid`;
      const phone = `0000000${String(i).padStart(3, "0")}`;
      const { rows } = await c.query(
        `INSERT INTO users (name, email, phone, password_hash, role, created_at)
         VALUES ($1,$2,$3,$4,'customer',now() - ($5 || ' days')::interval) RETURNING id`,
        [name, email, phone, placeholderHash, String(i)],
      );
      customers.push({ id: rows[0].id, name, email, phone });
    }
    const { rows: catalog } = await c.query(
      `SELECT p.id, p.name, p.art, p.price, p.sale_price, b.name AS brand_name,
              s.id AS shade_id, s.name AS shade_name, s.hex AS shade_hex
         FROM products p LEFT JOIN brands b ON b.id = p.brand_id
         JOIN LATERAL (SELECT id, name, hex FROM shades WHERE product_id=p.id ORDER BY id LIMIT 1) s ON TRUE
         ORDER BY p.id`,
    );
    const statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    const areas = ["Ramallah", "Al-Bireh", "Nablus", "Hebron", "Bethlehem", "Jenin"];
    for (let i = 1; i <= 30; i++) {
      const customer = customers[(i - 1) % customers.length];
      const status = statuses[i % statuses.length];
      const item1 = catalog[(i * 3) % catalog.length];
      const item2 = catalog[(i * 7 + 1) % catalog.length];
      const price1 = Number(item1.sale_price ?? item1.price);
      const price2 = Number(item2.sale_price ?? item2.price);
      const qty1 = 1 + (i % 3 === 0 ? 1 : 0);
      const qty2 = 1;
      const subtotal = price1 * qty1 + price2 * qty2;
      const shipping = i % 4 === 0 ? 30 : 20;
      const { rows } = await c.query(
        `INSERT INTO orders (order_number, user_id, customer_name, phone, email, city, address, zone_name,
           subtotal, shipping, total, status, admin_note, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now() - ($14 || ' hours')::interval)
         RETURNING id`,
        [`SB-DEMO-${String(i).padStart(4, "0")}`, customer.id, customer.name, customer.phone,
         customer.email, areas[i % areas.length], "Demo address — not a real delivery", "West Bank",
         subtotal, shipping, subtotal + shipping, status, "TEST DATA — do not dispatch", String(i * 8)],
      );
      const orderId = rows[0].id;
      for (const [product, price, qty] of [[item1, price1, qty1], [item2, price2, qty2]] as const) {
        await c.query(
          `INSERT INTO order_items (order_id, product_id, shade_id, name, brand_name, shade_name, shade_hex, art, price, qty)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [orderId, product.id, product.shade_id, product.name, product.brand_name || "",
           product.shade_name || "", product.shade_hex || "", product.art, price, qty],
        );
        if (status !== "cancelled") {
          await c.query("UPDATE products SET sold_count = sold_count + $1 WHERE id = $2", [qty, product.id]);
        }
      }
    }
    const comments = [
      "Lovely texture and shade selection.", "Great for everyday use.",
      "Soft finish, works well for my routine.", "Good value for a test order.",
      "The colour looks beautiful.", "Easy to apply and comfortable.",
    ];
    for (let i = 0; i < 18; i++) {
      const customer = customers[i % customers.length];
      const product = catalog[(i * 2) % catalog.length];
      await c.query(
        `INSERT INTO reviews (product_id, user_id, name, rating, comment, is_approved, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,now() - ($7 || ' days')::interval)`,
        [product.id, customer.id, customer.name, 3 + (i % 3), comments[i % comments.length], i % 5 !== 0, String(i)],
      );
    }
    for (let i = 1; i <= 7; i++) {
      await c.query("INSERT INTO subscribers (contact, source) VALUES ($1, 'demo') ON CONFLICT DO NOTHING",
        [`demo-subscriber-${i}@example.invalid`]);
    }
    for (let i = 1; i <= 5; i++) {
      await c.query("INSERT INTO messages (name, contact, message, is_read) VALUES ($1,$2,$3,$4)",
        [`Demo Contact ${i}`, `demo-message-${i}@example.invalid`, `This is a fictional test enquiry number ${i}.`, i % 2 === 0]);
    }
  });
  if (!(await one("SELECT key FROM settings WHERE key = 'dealEndsAt'"))) {
    await saveSettings({ dealEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() });
  }
  console.log("[seed] Done.");
}

// Allow "npm run seed" from the command line.
if (process.argv[1] && /seed\.(ts|js)$/.test(process.argv[1])) {
  import("./db").then(async ({ migrate }) => {
    await migrate();
    await seedDemo();
    await pool.end();
  });
}
