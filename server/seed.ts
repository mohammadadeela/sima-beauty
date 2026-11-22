import type { ArtKind } from "@shared/types";
import { one, pool, tx } from "./db";
import { slugify } from "./catalog";
import { saveSettings } from "./settings";

// Opt-in demo dataset for a FRESH, EMPTY database only (SEED_DEMO=true).
// Products, orders, customers and messages below are fictional test fixtures.
// Never use this seed in a database that will hold real customer transactions.

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
  { name: "Skincare", color: "#E4EAD6", art: "foundation" },
  { name: "Accessories", color: "#DDE6FA", art: "brush" },
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
  { name: "Hydrating Face Serum", brand: "Catrice", cat: "Skincare", art: "foundation", price: 65, sale: 54, flags: "fn", desc: "Lightweight hydration serum for a fresh, dewy finish." },
  { name: "Daily Moisturizing Cream", brand: "L'Oréal Paris", cat: "Skincare", art: "foundation", price: 72, flags: "f", desc: "Comforting daily moisturizer for soft and smooth skin." },
  { name: "Gentle Cleansing Gel", brand: "Essence", cat: "Skincare", art: "foundation", price: 34, desc: "A mild cleanser for washing away everyday impurities." },
  { name: "Glow Face Mist", brand: "NYX", cat: "Skincare", art: "gloss", price: 46, sale: 39, flags: "n", desc: "Refreshing spray for a soft, hydrated look." },
  { name: "Makeup Sponge Set", brand: "Flormar", cat: "Accessories", art: "compact", price: 26, flags: "n", desc: "A set of soft makeup sponges for smooth blending." },
  { name: "Lash Curler", brand: "Golden Rose", cat: "Accessories", art: "brush", price: 29, desc: "Comfortable grip lash curler for lifted-looking lashes." },
  { name: "Travel Makeup Brush Kit", brand: "Rimmel", cat: "Accessories", art: "brush", price: 67, sale: 56, flags: "f", desc: "Compact brushes for makeup on the go." },
  { name: "Makeup Organizer Pouch", brand: "Maybelline", cat: "Accessories", art: "compact", price: 48, desc: "A convenient pouch for brushes and everyday beauty essentials." },
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
    const demoItems: { productId: number; shadeId: number; name: string; brand: string;
      shadeName: string; shadeHex: string; art: ArtKind; price: number }[] = [];
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
        const inserted = await c.query("INSERT INTO shades (product_id, name, hex, family, stock, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id", [rows[0].id, s[0], s[1], s[2], stock, n]);
        if (n === 0) demoItems.push({ productId: rows[0].id, shadeId: inserted.rows[0].id,
          name: p.name, brand: p.brand, shadeName: s[0], shadeHex: s[1], art: p.art, price: p.sale ?? p.price });
      }
    }
    await c.query("INSERT INTO discount_codes (code, type, value) VALUES ('WELCOME10', 'percent', 10) ON CONFLICT (code) DO NOTHING");
    await c.query("INSERT INTO discount_codes (code, type, value, min_subtotal) VALUES ('DEMO15', 'percent', 15, 100), ('DEMO5', 'fixed', 5, 30) ON CONFLICT (code) DO NOTHING");

    // Synthetic customers have invalid password hashes; they cannot log in.
    // The .invalid email domain and zero-only numbers cannot reach real people.
    const customers: { id: number; name: string; email: string }[] = [];
    for (let n = 1; n <= 8; n++) {
      const name = `Demo Customer ${String(n).padStart(2, "0")}`;
      const email = `customer${n}@sima-demo.invalid`;
      const { rows } = await c.query(
        `INSERT INTO users (name, email, phone, password_hash, role, created_at)
         VALUES ($1,$2,'0000000000','!demo-no-login!','customer', now() - ($3 || ' days')::interval)
         RETURNING id`, [name, email, String(n * 4)]);
      customers.push({ id: rows[0].id, name, email });
    }

    const statuses = ["pending", "confirmed", "shipped", "delivered", "delivered", "cancelled"];
    for (let n = 0; n < 30; n++) {
      const customer = customers[n % customers.length];
      const status = statuses[n % statuses.length];
      const itemCount = 1 + (n % 3);
      const lines = Array.from({ length: itemCount }, (_, j) => ({
        product: demoItems[(n * 5 + j * 9) % demoItems.length], qty: 1 + ((n + j) % 2),
      }));
      const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
      const shipping = n % 4 === 0 ? 0 : 15;
      const bundleDiscount = itemCount === 3 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const total = Math.round((subtotal - bundleDiscount + shipping) * 100) / 100;
      const createdHoursAgo = n === 0 ? 1 : n * 22;
      const { rows } = await c.query(
        `INSERT INTO orders (order_number, user_id, customer_name, phone, email, city, address,
           notes, zone_name, subtotal, bundle_discount, shipping, total, status, admin_note, created_at)
         VALUES ($1,$2,$3,'0000000000',$4,'Demo City','Demo Address — not for delivery',
           'FAKE TEST ORDER','Demo Shipping Zone',$5,$6,$7,$8,$9,'[DEMO] Fictional order for UI testing',
           now() - ($10 || ' hours')::interval) RETURNING id`,
        [`SB-DEMO-${String(n + 1).padStart(4, "0")}`, customer.id, customer.name,
         customer.email, subtotal, bundleDiscount, shipping, total, status, String(createdHoursAgo)]);
      for (const { product, qty } of lines) {
        await c.query(
          `INSERT INTO order_items (order_id, product_id, shade_id, name, brand_name,
             shade_name, shade_hex, art, price, qty)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [rows[0].id, product.productId, product.shadeId, product.name, product.brand,
           product.shadeName, product.shadeHex, product.art, product.price, qty]);
        if (status !== "cancelled") {
          await c.query("UPDATE shades SET stock = GREATEST(0, stock - $1) WHERE id = $2", [qty, product.shadeId]);
          await c.query("UPDATE products SET sold_count = sold_count + $1 WHERE id = $2", [qty, product.productId]);
        }
      }
    }

    const comments = [
      "Demo: Lovely colour and smooth texture.", "Demo: Easy to use and blends well.",
      "Demo: Great for testing this product page.", "Demo: Soft finish and nice packaging.",
      "Demo: I would recommend this shade.", "Demo: Looks beautiful in daylight.",
    ];
    for (let n = 0; n < 18; n++) {
      const item = demoItems[(n * 3) % demoItems.length];
      await c.query(`INSERT INTO reviews (product_id, name, rating, comment, is_approved, created_at)
        VALUES ($1,$2,$3,$4,$5, now() - ($6 || ' days')::interval)`,
        [item.productId, `Demo Reviewer ${n + 1}`, 3 + (n % 3), comments[n % comments.length], n % 5 !== 0, String(n)]);
    }
    for (let n = 1; n <= 5; n++) {
      await c.query("INSERT INTO subscribers (contact, source) VALUES ($1,'demo') ON CONFLICT (contact) DO NOTHING",
        [`subscriber${n}@sima-demo.invalid`]);
    }
    for (let n = 1; n <= 4; n++) {
      await c.query("INSERT INTO messages (name, contact, message, is_read) VALUES ($1,$2,$3,$4)",
        [`Demo Visitor ${n}`, `visitor${n}@sima-demo.invalid`,
         `Demo inquiry #${n}: Is this shade available? This is test data, not a real message.`, n % 2 === 0]);
    }
  });
  if (!(await one("SELECT key FROM settings WHERE key = 'dealEndsAt'"))) {
    await saveSettings({ dealEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() });
  }
  console.log("[seed] Done: 36 products, 30 demo orders, 8 demo customers, 18 reviews, 5 subscribers, 4 messages.");
}

// Allow "npm run seed" from the command line.
if (process.argv[1] && /seed\.(ts|js)$/.test(process.argv[1])) {
  import("./db").then(async ({ migrate }) => {
    await migrate();
    await seedDemo();
    await pool.end();
  });
}
