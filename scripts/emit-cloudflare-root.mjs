import { access, copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const astro = resolve(root, "dist/astro");
const dist = resolve(root, "dist");

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

if (!(await exists(resolve(astro, "index.html")))) {
  throw new Error("cloudflare emit: dist/astro/index.html is missing");
}
await mkdir(dist, { recursive: true });
await copyFile(resolve(astro, "index.html"), resolve(dist, "index.html"));

const rootAssets = [
  "sw.js",
  "manifest.webmanifest",
  "favicon.svg",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "maskable-512.png",
  "robots.txt",
  "sitemap.xml",
  "og-default.svg"
];

for (const file of rootAssets) {
  const source = resolve(astro, file);
  if (await exists(source)) await copyFile(source, resolve(dist, file));
}

console.log("Emitted Cloudflare root SPA shell and PWA assets.");
