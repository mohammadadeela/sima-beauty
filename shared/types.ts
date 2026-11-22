// Types shared by the server and the browser.

export type ArtKind =
  | "lipstick" | "gloss" | "liner" | "mascara" | "palette"
  | "foundation" | "compact" | "polish" | "brush";

export const ART_KINDS: ArtKind[] = [
  "lipstick", "gloss", "liner", "mascara", "palette", "foundation", "compact", "polish", "brush",
];

export const SHADE_FAMILIES = ["nude", "pink", "red", "berry", "coral", "brown"] as const;
export type ShadeFamily = (typeof SHADE_FAMILIES)[number];

export interface Category {
  id: number; name: string; slug: string; image: string | null;
  color: string; art: ArtKind; sortOrder: number; isActive: boolean;
  productCount?: number;
}

export interface Brand {
  id: number; name: string; slug: string; logo: string | null;
  description: string; isFeatured: boolean; sortOrder: number; isActive: boolean;
  productCount?: number;
}

export interface Shade {
  id: number; productId: number; name: string; hex: string;
  family: string; stock: number; image: string | null; sortOrder: number;
}

export interface Product {
  id: number; name: string; slug: string;
  brandId: number | null; categoryId: number | null;
  brandName?: string | null; brandSlug?: string | null;
  categoryName?: string | null; categorySlug?: string | null;
  description: string; howToUse: string; ingredients: string;
  price: number; salePrice: number | null;
  images: string[]; art: ArtKind; finish: string;
  isActive: boolean; isFeatured: boolean; isNew: boolean; isDeal: boolean;
  soldCount: number; createdAt: string;
  shades: Shade[];
  rating: number; reviewCount: number;
}

export interface Review {
  id: number; productId: number; name: string; rating: number;
  comment: string; isApproved: boolean; createdAt: string; productName?: string;
}

export interface User {
  id: number; name: string; email: string; phone: string;
  role: "customer" | "admin"; isBlocked: boolean; createdAt: string;
  orderCount?: number; totalSpent?: number;
}

export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  id: number; orderId: number; productId: number | null; shadeId: number | null;
  name: string; brandName: string; shadeName: string; shadeHex: string;
  image: string; art: ArtKind; price: number; qty: number;
}

export interface Order {
  id: number; orderNumber: string; userId: number | null;
  customerName: string; phone: string; email: string;
  city: string; address: string; notes: string;
  zoneName: string;
  subtotal: number; bundleDiscount: number; codeDiscount: number;
  discountCode: string; shipping: number; total: number;
  gift: string; status: OrderStatus; adminNote: string; createdAt: string;
  items: OrderItem[];
}

export interface DiscountCode {
  id: number; code: string; type: "percent" | "fixed"; value: number;
  minSubtotal: number; maxUses: number | null; usedCount: number;
  expiresAt: string | null; isActive: boolean;
}

export interface Zone { id: string; name: string; price: number; eta: string }
export interface Faq { q: string; a: string }
export interface Banner { title: string; text: string; cta: string; link: string; image: string; tone: "pink" | "ink" | "blush" | "gold" }
export interface HeroShade { name: string; hex: string }

/** Everything the admin can edit about the storefront, as one typed object. */
export interface Settings {
  storeName: string;
  currency: string;
  // search engines
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  googleVerification: string;
  // announcement bar
  announcementOn: boolean;
  announcements: string[];
  // landing hero
  heroTitle: string;
  heroText: string;
  heroCta: string;
  heroLink: string;
  heroShades: HeroShade[];
  // home blocks
  banners: Banner[];
  shadeMatchOn: boolean;
  lashOn: boolean;
  lashTitle: string;
  lashText: string;
  lashCta: string;
  lashLink: string;
  perks: string[];
  // offers
  dealOn: boolean;
  dealTitle: string;
  dealEndsAt: string;
  welcomeOn: boolean;
  welcomeTitle: string;
  welcomeText: string;
  welcomeCode: string;
  freeShippingOn: boolean;
  freeShippingOver: number;
  giftOn: boolean;
  giftOver: number;
  giftText: string;
  bundleOn: boolean;
  bundleQty: number;
  bundlePercent: number;
  lowStockOn: boolean;
  lowStockAt: number;
  // checkout
  zones: Zone[];
  guestCheckout: boolean;
  // contact
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  // content pages
  about: string;
  shippingPolicy: string[];
  exchangePolicy: string[];
  policyNote: string;
  privacyPolicy: string[];
  terms: string[];
  faqs: Faq[];
}

export interface CartLine { shadeId: number; qty: number }

export interface Quote {
  lines: {
    shadeId: number; productId: number; slug: string; name: string; brandName: string;
    shadeName: string; shadeHex: string; image: string; art: ArtKind;
    price: number; compareAt: number | null; qty: number; stock: number; hasShades: boolean;
  }[];
  itemCount: number;
  subtotal: number;
  bundleDiscount: number;
  codeDiscount: number;
  discountCode: string;
  codeError: string;
  shipping: number;
  freeShipping: boolean;
  toFreeShipping: number;
  gift: string;
  toGift: number;
  toBundle: number;
  total: number;
  removed: number;
}

export interface DashboardStats {
  today: { orders: number; revenue: number };
  week: { orders: number; revenue: number };
  month: { orders: number; revenue: number };
  pending: number;
  customers: number;
  products: number;
  daily: { day: string; revenue: number; orders: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  lowStock: { productId: number; name: string; shadeName: string; stock: number }[];
  recentOrders: Order[];
  unreadMessages: number;
  pendingReviews: number;
}
