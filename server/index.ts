import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { ZodError } from "zod";
import { migrate, pool, q } from "./db";
import { ensureAdmin, setupAuth } from "./auth";
import { store } from "./routes/store";
import { account } from "./routes/account";
import { admin, UPLOAD_DIR } from "./routes/admin";
import { seedDemo } from "./seed";
import { renderPage } from "./seo";

const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT || 5001);
const HOST = process.env.HOST || (isProd ? "127.0.0.1" : "0.0.0.0");
const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");

async function main() {
  await migrate();
  await ensureAdmin();
  if (process.env.SEED_DEMO === "true") await seedDemo();

  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
              fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
              imgSrc: ["'self'", "data:", "blob:", "https:"],
              connectSrc: ["'self'"],
              upgradeInsecureRequests: null,
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  });

  app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "365d", immutable: true, fallthrough: false }));

  setupAuth(app);

  // A ceiling on how fast one visitor can call the API (stops scraping and brute force).
  app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: 240, standardHeaders: true, legacyHeaders: false,
    message: { message: "Too many requests. Please slow down and try again in a minute." } }));

  // Changes are only accepted from pages of this site, never from another website.
  app.use("/api", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.get("origin");
    if (origin) {
      let originHost = "";
      try { originHost = new URL(origin).host; } catch { /* malformed header */ }
      if (originHost !== req.get("host")) return res.status(403).json({ message: "Request blocked." });
    }
    next();
  });

  // Never let a browser or proxy cache API answers (they can hold personal data).
  app.use("/api", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });

  app.use("/api/auth", account);
  app.use("/api/admin", admin);
  app.use("/api", store);
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found." }));

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /checkout\nDisallow: /account\nDisallow: /order/\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  });
  app.get("/sitemap.xml", async (_req, res) => {
    const [products, categories, brands] = await Promise.all([
      q<{ slug: string }>("SELECT slug FROM products WHERE is_active"),
      q<{ slug: string }>("SELECT slug FROM categories WHERE is_active"),
      q<{ slug: string }>("SELECT slug FROM brands WHERE is_active"),
    ]);
    const urls = [
      "/", "/shop", "/brands", "/offers", "/help/delivery", "/help/faq", "/help/contact",
      ...categories.map((c) => `/shop?category=${c.slug}`),
      ...brands.map((b) => `/shop?brand=${b.slug}`),
      ...products.map((p) => `/product/${p.slug}`),
    ];
    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.map((u) => `  <url><loc>${SITE_URL}${u.replace(/&/g, "&amp;")}</loc><changefreq>${u.startsWith("/product/") ? "weekly" : "daily"}</changefreq><priority>${u === "/" ? "1.0" : u.startsWith("/product/") ? "0.8" : "0.6"}</priority></url>`).join("\n") + `\n</urlset>\n`,
    );
  });

  if (isProd) {
    const publicDir = path.resolve(import.meta.dirname, "public");
    if (!fs.existsSync(publicDir)) throw new Error(`Build not found at ${publicDir}. Run "npm run build" first.`);
    const template = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
    app.use(express.static(publicDir, {
      index: false,
      setHeaders(res, file) {
        // Hashed assets never change; index.html must always be fresh.
        res.setHeader("Cache-Control", file.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache");
      },
    }));
    // Every page gets its own title, description and structured data for Google.
    app.get("/{*path}", async (req, res) => {
      const { html, status } = await renderPage(template, req, SITE_URL);
      res.status(status).setHeader("Cache-Control", "no-cache").type("html").send(html);
    });
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true, hmr: { port: PORT + 1000 } }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      return res.status(400).json({ message: issue?.message ? `${issue.path.join(".") || "Form"}: ${issue.message}` : "Please check the form." });
    }
    if (err?.code === "LIMIT_FILE_SIZE") return res.status(400).json({ message: "That image is too large (12 MB max)." });
    if (err?.type === "entity.parse.failed" || err?.type === "entity.too.large") return res.status(400).json({ message: "The request could not be read." });
    // Database complaints become clear messages instead of a crash.
    if (err?.code === "22P02" || err?.code === "22003") return res.status(404).json({ message: "Not found." });
    if (err?.code === "23505") return res.status(409).json({ message: "That already exists." });
    if (err?.code === "23503") return res.status(409).json({ message: "This is still in use and can't be removed yet." });
    if (err?.status && err.status < 500) return res.status(err.status).json({ message: err.message });
    console.error("[server]", err);
    res.status(500).json({ message: "Something went wrong on our side. Please try again." });
  });

  app.listen(PORT, HOST, () => console.log(`Sima Beauty is running on ${HOST}:${PORT} (${isProd ? "production" : "development"})`));
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
