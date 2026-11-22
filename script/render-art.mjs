// Renders the 3D product models into images used for products without a photo.
// Only needed again if the models in client/src/components/three/models.ts change:
//   1. npm run dev        2. node script/render-art.mjs
// Needs Playwright and Chrome on the machine (not required on the server).
import fs from "fs";
import path from "path";
import sharp from "sharp";

const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
const out = path.resolve(import.meta.dirname, "../client/public/art");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 700, height: 800 } });
page.on("pageerror", (e) => console.log("page error:", e.message));
await page.goto((process.env.BASE || "http://localhost:5001") + "/render.html");
await page.waitForFunction(() => window.renderArt);
const kinds = await page.evaluate(() => window.ART_KINDS);
for (const kind of kinds) {
  for (const mode of ["base", "shine"]) {
    const url = await page.evaluate(([k, m]) => window.renderArt(k, m), [kind, mode]);
    await sharp(Buffer.from(url.split(",")[1], "base64")).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(out, `${kind}-${mode}.webp`));
  }
  console.log("rendered", kind);
}
await browser.close();
