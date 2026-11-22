import { z } from "zod";
import type { Settings } from "@shared/types";
import { pool } from "./db";

/**
 * Default storefront content. Anything the admin saves in the dashboard
 * overrides the matching key here.
 */
export const DEFAULT_SETTINGS: Settings = {
  storeName: "Sima Beauty",
  currency: "₪",

  announcementOn: true,
  announcements: [
    "Free delivery on orders over ₪300",
    "100% original brands",
    "Pay cash when your order arrives",
  ],

  heroTitle: "Wear your shade.",
  heroText: "Original makeup from the brands you love, delivered to your door.",
  heroCta: "Shop lips",
  heroLink: "/shop?category=lips",
  heroShades: [
    { name: "Pink Pop", hex: "#EC5C93" },
    { name: "Cherry Bomb", hex: "#C2183F" },
    { name: "Rosewood", hex: "#B5536C" },
    { name: "Nude Silk", hex: "#C98B7B" },
    { name: "Coral Crush", hex: "#F0624D" },
    { name: "Berry Noir", hex: "#8E1B55" },
  ],

  banners: [
    { title: "The lip edit", text: "Mattes, glosses and liners in every shade.", cta: "Shop lips", link: "/shop?category=lips", image: "", tone: "pink" },
    { title: "Eyes that speak", text: "Mascara, liner and palettes.", cta: "Shop eyes", link: "/shop?category=eyes", image: "", tone: "blush" },
  ],
  shadeMatchOn: true,
  lashOn: true,
  lashTitle: "Lashes, lifted.",
  lashText: "One stroke for length, two for drama.",
  lashCta: "Shop mascara",
  lashLink: "/shop?category=eyes",
  perks: ["Original brands only", "Cash on delivery", "Delivery across the West Bank, Jerusalem and the Interior", "Exchange within one day"],

  dealOn: true,
  dealTitle: "Deal of the day",
  dealEndsAt: "",
  welcomeOn: true,
  welcomeTitle: "10% off your first order",
  welcomeText: "Leave your WhatsApp number or email and unlock your code.",
  welcomeCode: "WELCOME10",
  freeShippingOn: true,
  freeShippingOver: 300,
  giftOn: true,
  giftOver: 200,
  giftText: "Free mini gift",
  bundleOn: true,
  bundleQty: 3,
  bundlePercent: 10,
  lowStockOn: true,
  lowStockAt: 3,

  zones: [
    { id: "westBank", name: "West Bank", price: 20, eta: "1–3 business days" },
    { id: "jerusalem", name: "Jerusalem", price: 30, eta: "2–4 business days" },
    { id: "interior", name: "Interior", price: 75, eta: "3–5 business days" },
  ],
  guestCheckout: true,

  whatsapp: "",
  phone: "",
  email: "",
  address: "",
  hours: "Saturday – Thursday, 10:00 – 20:00",
  instagram: "",
  facebook: "",
  tiktok: "",

  about: "Sima Beauty brings original makeup from trusted brands to your door. Every product is sourced from authorised distributors, checked before it ships, and packed with care.",
  shippingPolicy: [
    "We deliver to all areas of the West Bank, Jerusalem and the Interior.",
    "Delivery cost is calculated at checkout based on your area.",
    "Orders are prepared within one business day and handed to the courier.",
    "You pay in cash when the order arrives.",
  ],
  exchangePolicy: [
    "Products cannot be returned unless they have a manufacturing defect.",
    "Exchanges are accepted within one day of receiving the parcel.",
    "For hygiene reasons, a product can only be exchanged if it is unopened, unused and in its original sealed packaging.",
    "If your product arrives damaged or defective, send us a photo on WhatsApp the same day and we will replace it.",
  ],
  policyNote: "For any question about your order or to request an exchange, message us on WhatsApp.",
  privacyPolicy: [
    "We collect the information you give us when you place an order or create an account: your name, phone number, email and delivery address.",
    "We use it to process and deliver your orders, send order updates, and answer your questions.",
    "We send offers and discounts only if you asked to receive them.",
    "We never sell, rent or trade your personal information. It is shared only with the courier delivering your order.",
    "We use cookies to remember your bag and keep you signed in. You can block cookies in your browser, but some features may stop working.",
    "For any question about your data, contact us and we will be glad to help.",
  ],
  terms: [
    "By using this website you agree to these terms. If you do not agree, please stop using the site.",
    "You must be at least 18 years old to place an order.",
    "All prices are in Israeli New Shekel (₪) and include applicable taxes unless stated otherwise.",
    "We may refuse or cancel an order if there is a pricing error or the product is out of stock.",
    "Products cannot be returned unless they have a manufacturing defect. Exchanges are accepted within one day of receiving the parcel, for unopened products only.",
    "Product colours may look slightly different on your screen because of display settings.",
    "All content on this site belongs to Sima Beauty or the brands shown and may not be copied without written permission.",
    "Sima Beauty is not liable for indirect or incidental damages arising from use of the site or its products. Always check the ingredient list if you have allergies.",
  ],
  faqs: [
    { q: "Are your products original?", a: "Yes. Everything we sell is 100% original and sourced from authorised distributors." },
    { q: "How can I pay?", a: "You pay in cash when your order arrives." },
    { q: "How long does delivery take?", a: "Usually 1–3 business days in the West Bank, 2–4 in Jerusalem and 3–5 in the Interior." },
    { q: "Can I return a product?", a: "Products can only be returned if they have a manufacturing defect." },
    { q: "Can I exchange a product?", a: "Yes, within one day of receiving the parcel, as long as the product is unopened and sealed." },
    { q: "How can I track my order?", a: "Open the Track order page and enter your order number and phone number." },
    { q: "How do I choose the right shade?", a: "Use the shade match on the home page, or message us on WhatsApp and we will help you pick." },
  ],
};

const text = (max: number) => z.string().max(max);
const amount = z.number().min(0).max(1_000_000);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
/** Links may only point inside the store ("/shop") or to a normal web address. */
const link = z.string().max(300).refine((v) => v === "" || /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v), "Links must start with / or https://");
const webLink = z.string().max(300).refine((v) => v === "" || /^https?:\/\//i.test(v), "Use a full address starting with https://");
const image = z.string().max(300).refine((v) => v === "" || v.startsWith("/uploads/") || /^https:\/\//i.test(v), "Upload the image instead of pasting it.");

/** The exact shape every setting must have. Anything else is rejected. */
const settingsSchema = z.object({
  storeName: text(60).min(1), currency: text(4).min(1),
  announcementOn: z.boolean(), announcements: z.array(text(140)).max(8),
  heroTitle: text(80), heroText: text(220), heroCta: text(40), heroLink: link,
  heroShades: z.array(z.object({ name: text(40), hex })).min(1).max(8),
  banners: z.array(z.object({ title: text(60), text: text(160), cta: text(40), link, image, tone: z.enum(["pink", "ink", "blush", "gold"]) })).max(4),
  shadeMatchOn: z.boolean(), lashOn: z.boolean(), lashTitle: text(60), lashText: text(160), lashCta: text(40), lashLink: link,
  perks: z.array(text(120)).max(10),
  dealOn: z.boolean(), dealTitle: text(60), dealEndsAt: z.string().max(40).refine((v) => v === "" || !isNaN(Date.parse(v)), "Invalid date"),
  welcomeOn: z.boolean(), welcomeTitle: text(80), welcomeText: text(200), welcomeCode: text(24),
  freeShippingOn: z.boolean(), freeShippingOver: amount,
  giftOn: z.boolean(), giftOver: amount, giftText: text(60),
  bundleOn: z.boolean(), bundleQty: z.number().int().min(2).max(50), bundlePercent: z.number().min(0).max(90),
  lowStockOn: z.boolean(), lowStockAt: z.number().int().min(1).max(1000),
  zones: z.array(z.object({ id: z.string().min(1).max(40), name: text(60).min(1), price: amount, eta: text(60) })).min(1).max(20),
  guestCheckout: z.boolean(),
  whatsapp: text(24), phone: text(24), email: z.union([z.string().email().max(120), z.literal("")]), address: text(200), hours: text(120),
  instagram: webLink, facebook: webLink, tiktok: webLink,
  about: text(4000),
  shippingPolicy: z.array(text(600)).max(30), exchangePolicy: z.array(text(600)).max(30), policyNote: text(400),
  privacyPolicy: z.array(text(800)).max(40), terms: z.array(text(800)).max(40),
  faqs: z.array(z.object({ q: text(200), a: text(1200) })).max(60),
});

let cache: Settings | null = null;

export async function getSettings(): Promise<Settings> {
  if (cache) return cache;
  const { rows } = await pool.query("SELECT key, value FROM settings");
  const stored: Record<string, unknown> = {};
  for (const r of rows) {
    // A value that no longer fits the expected shape falls back to its default.
    const shape = (settingsSchema.shape as Record<string, z.ZodTypeAny>)[r.key];
    if (shape && shape.safeParse(r.value).success) stored[r.key] = r.value;
  }
  cache = { ...DEFAULT_SETTINGS, ...stored } as Settings;
  return cache;
}

/** Save only the keys that were sent. Unknown keys are dropped; wrong shapes are refused. */
export async function saveSettings(input: unknown): Promise<Settings> {
  const patch = settingsSchema.partial().parse(input);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(value)],
    );
  }
  cache = null;
  return getSettings();
}
