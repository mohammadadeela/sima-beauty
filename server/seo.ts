import type { Request } from "express";
import type { Product } from "@shared/types";
import { one, q } from "./db";
import { getSettings } from "./settings";
import { listProducts, PRODUCT_SELECT } from "./catalog";

/**
 * Search-engine and link-preview tags, written into the page on the server.
 * Google, WhatsApp, Instagram and Facebook read these before any JavaScript
 * runs, so every product, category and brand gets its own title, description,
 * picture and structured data (price, stock, rating).
 */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

interface Head { title: string; description: string; path: string; image?: string; noindex?: boolean; status?: number; data?: unknown[] }

const PRIVATE = /^\/(admin|checkout|account|order|wishlist|track)(\/|$)/;
const HELP: Record<string, string> = { delivery: "Delivery and exchange", faq: "Questions", contact: "Contact us", policies: "Privacy and terms" };

async function headFor(req: Request, site: string): Promise<Head> {
  const s = await getSettings();
  const path = req.path.replace(/\/+$/, "") || "/";
  const name = s.storeName;
  const abs = (url: string) => (/^https?:/i.test(url) ? url : site + url);
  const crumbs = (items: [string, string][]) => ({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map(([label, url], i) => ({ "@type": "ListItem", position: i + 1, name: label, item: site + url })),
  });
  const offer = (p: Product) => {
    const price = p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
    const inStock = p.shades.some((x) => x.stock > 0);
    return { "@type": "Offer", url: `${site}/product/${p.slug}`, priceCurrency: "ILS", price: price.toFixed(2), itemCondition: "https://schema.org/NewCondition",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", seller: { "@type": "Organization", name } };
  };

  if (PRIVATE.test(path)) return { title: name, description: s.seoDescription, path, noindex: true };

  if (path === "/") {
    const social = [s.instagram, s.facebook, s.tiktok].filter(Boolean);
    return {
      title: s.seoTitle || name, description: s.seoDescription, path,
      data: [
        { "@context": "https://schema.org", "@type": "OnlineStore", name, url: site, logo: `${site}/favicon.svg`, image: `${site}/og.png`, description: s.seoDescription,
          ...(social.length ? { sameAs: social } : {}), ...(s.phone || s.whatsapp ? { telephone: s.phone || s.whatsapp } : {}),
          ...(s.address ? { address: { "@type": "PostalAddress", streetAddress: s.address } } : {}), currenciesAccepted: "ILS", paymentAccepted: "Cash" },
        { "@context": "https://schema.org", "@type": "WebSite", name, url: site,
          potentialAction: { "@type": "SearchAction", target: `${site}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" } },
      ],
    };
  }

  const product = /^\/product\/([^/]+)$/.exec(path);
  if (product) {
    const p = await one<Product>(`${PRODUCT_SELECT} WHERE p.slug = $1 AND p.is_active`, [decodeURIComponent(product[1])]);
    if (!p) return { title: `Product not available | ${name}`, description: s.seoDescription, path, noindex: true, status: 404 };
    const brand = p.brandName ? `${p.brandName} ` : "";
    const price = p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
    const image = p.images[0] || p.shades.find((x) => x.image)?.image || "/og.png";
    const description = clip(p.description || `${brand}${p.name}, 100% original, ${s.currency}${price}. Delivery to your door and cash on delivery from ${name}.`, 300);
    return {
      title: `${brand}${p.name} | ${name}`, description, path, image,
      data: [
        { "@context": "https://schema.org", "@type": "Product", name: `${brand}${p.name}`, description, image: [abs(image), ...p.images.slice(1, 4).map(abs)], sku: String(p.id),
          ...(p.brandName ? { brand: { "@type": "Brand", name: p.brandName } } : {}), ...(p.categoryName ? { category: p.categoryName } : {}),
          ...(p.shades.length > 1 ? { color: p.shades.map((x) => x.name).filter(Boolean).join(", ") } : {}),
          offers: offer(p),
          ...(p.reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviewCount } } : {}) },
        crumbs([["Shop", "/shop"], ...(p.categoryName ? [[p.categoryName, `/shop?category=${p.categorySlug}`] as [string, string]] : []), [p.name, `/product/${p.slug}`]]),
      ],
    };
  }

  if (path === "/shop") {
    const cat = typeof req.query.category === "string" ? await one<{ name: string; slug: string }>("SELECT name, slug FROM categories WHERE slug = $1 AND is_active", [req.query.category]) : null;
    const brand = typeof req.query.brand === "string" ? await one<{ name: string; slug: string; description: string }>("SELECT name, slug, description FROM brands WHERE slug = $1 AND is_active", [req.query.brand]) : null;
    const label = [brand?.name, cat?.name].filter(Boolean).join(" ") || "All makeup";
    const qs = [cat && `category=${cat.slug}`, brand && `brand=${brand.slug}`].filter(Boolean).join("&");
    const products = await listProducts({ category: cat?.slug, brand: brand?.slug, limit: 24 });
    return {
      title: `${label} | Original makeup | ${name}`,
      description: clip(brand?.description || `Shop 100% original ${label} at ${name}: ${products.slice(0, 4).map((p) => p.name).join(", ")} and more. Fast delivery, cash on delivery.`, 300),
      path: qs ? `/shop?${qs}` : "/shop",
      // filtered or searched lists are for shoppers, not for the index
      noindex: ["q", "family", "max", "sale", "new", "sort"].some((k) => k in req.query),
      data: [
        { "@context": "https://schema.org", "@type": "ItemList", name: label, itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${site}/product/${p.slug}`, name: p.name })) },
        crumbs([["Shop", "/shop"], ...(qs ? [[label, `/shop?${qs}`] as [string, string]] : [])]),
      ],
    };
  }

  if (path === "/brands") {
    const brands = await q<{ name: string }>("SELECT name FROM brands WHERE is_active ORDER BY sort_order, name LIMIT 30");
    return { title: `Brands | ${name}`, description: clip(`Every original brand at ${name}: ${brands.map((b) => b.name).join(", ")}.`, 300), path };
  }
  if (path === "/offers") return { title: `Offers and sale | ${name}`, description: `The latest offers on original makeup at ${name}. Free delivery on orders over ${s.currency}${s.freeShippingOver}.`, path };
  const help = /^\/help(?:\/(\w+))?$/.exec(path);
  if (help) {
    const tab = help[1] && HELP[help[1]] ? help[1] : "delivery";
    return {
      title: `${HELP[tab]} | ${name}`, description: clip(tab === "delivery" ? [...s.shippingPolicy, ...s.exchangePolicy].join(" ") : s.seoDescription, 300), path: `/help/${tab}`,
      data: tab === "faq" ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : undefined,
    };
  }
  return { title: `Page not found | ${name}`, description: s.seoDescription, path, noindex: true, status: 404 };
}

/** Fill the page template with the right tags for this address. */
export async function renderPage(template: string, req: Request, site: string): Promise<{ html: string; status: number }> {
  const s = await getSettings();
  let head: Head;
  try {
    head = await headFor(req, site);
  } catch (err) {
    console.error("[seo]", err);
    head = { title: s.storeName, description: s.seoDescription, path: req.path };
  }
  const url = site + head.path;
  const image = /^https?:/i.test(head.image || "") ? head.image! : site + (head.image || "/og.png");
  const tags = [
    `<title>${esc(head.title)}</title>`,
    `<meta name="description" content="${esc(head.description)}" />`,
    s.seoKeywords && `<meta name="keywords" content="${esc(s.seoKeywords)}" />`,
    `<meta name="robots" content="${head.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"}" />`,
    !head.noindex && `<link rel="canonical" href="${esc(url)}" />`,
    s.googleVerification && `<meta name="google-site-verification" content="${esc(s.googleVerification)}" />`,
    `<meta property="og:site_name" content="${esc(s.storeName)}" />`,
    `<meta property="og:type" content="${head.path.startsWith("/product/") ? "product" : "website"}" />`,
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(head.title)}" />`,
    `<meta name="twitter:description" content="${esc(head.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    ...(head.data || []).map(ld),
  ].filter(Boolean).join("\n    ");
  return { html: template.replace("<!--seo-->", tags), status: head.status || 200 };
}
