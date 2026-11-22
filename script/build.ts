import { build } from "esbuild";
import { execFileSync } from "child_process";
import path from "path";
import fs from "fs";

// Builds into a staging folder, then swaps it in. The running site keeps
// serving the old build until the new one is complete.
const root = path.resolve(import.meta.dirname, "..");
const live = path.join(root, "dist");
const staging = path.join(root, ".dist-next");

fs.rmSync(staging, { recursive: true, force: true });
try {
  console.log("1/2 Building the storefront…");
  execFileSync(path.join(root, "node_modules", ".bin", "vite"), ["build", "--outDir", path.join(staging, "public"), "--emptyOutDir"], { stdio: "inherit", cwd: root });

  console.log("2/2 Building the server…");
  await build({
    entryPoints: [path.join(root, "server/index.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: path.join(staging, "index.cjs"),
    packages: "external",
    alias: { "@shared": path.join(root, "shared") },
    define: { "import.meta.dirname": "__dirname" },
    logLevel: "warning",
  });

  for (const f of ["index.cjs", "public/index.html"]) {
    if (!fs.existsSync(path.join(staging, f))) throw new Error(`Build output missing: ${f}`);
  }
  fs.rmSync(live, { recursive: true, force: true });
  fs.renameSync(staging, live);
  console.log("Build complete.");
} catch (err) {
  fs.rmSync(staging, { recursive: true, force: true });
  throw err;
}
