import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const spaShell = resolve(root, "dist/index.html");
const requiredSpaShells = [
  "tools/index.html",
  "settings/community/index.html",
  "admin/community-suites/index.html",
  "jyotish/janma-patro/index.html",
  "jyotish/matchmaking/index.html",
];
const requiredStaticPages = [
  "samudaya/index.html",
  "samudaya/lhosar/index.html",
  "samudaya/tharu/index.html",
  "samudaya/mithila/index.html",
  "samudaya/kirat/index.html",
  "samudaya/hijri/index.html",
  "samudaya/chakra/index.html",
  "nepal-sambat/mandala/index.html",
  "nepali-typing/index.html",
];

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

if (!(await exists(spaShell))) {
  throw new Error("doctor: dist/index.html is missing; Vite did not produce the canonical root SPA shell");
}

const shellHtml = await readFile(spaShell, "utf8");
if (!/\/assets\//.test(shellHtml) || /\/astro\/assets\//.test(shellHtml)) {
  throw new Error("doctor: root SPA bundle must load from /assets/, never /astro/assets/");
}

const repaired = [];
for (const relative of requiredSpaShells) {
  const target = resolve(root, "dist", relative);
  if (!(await exists(target))) {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(spaShell, target);
    repaired.push(relative);
  }
}

const missingStatic = [];
for (const relative of requiredStaticPages) {
  if (!(await exists(resolve(root, "dist", relative)))) missingStatic.push(relative);
}

const vercel = JSON.parse(await readFile(resolve(root, "vercel.json"), "utf8"));
const rewrites = vercel.rewrites || [];
const api = rewrites.find((r) => r.source === "/api/v1/:path*");
if (!api || !String(api.destination || "").includes("/functions/v1/router/:path*")) {
  throw new Error("doctor: /api/v1 is not routed to the canonical Supabase router on the legacy Vercel fallback");
}
const jyotish = rewrites.find((r) => r.source === "/api/jyotish-chat");
if (!jyotish || !String(jyotish.destination || "").includes("/functions/v1/router/jyotish-chat")) {
  throw new Error("doctor: Jyotish chat still bypasses the canonical router on the legacy Vercel fallback");
}
if (missingStatic.length) {
  throw new Error("doctor: required static pages missing: " + missingStatic.join(", "));
}

console.log(JSON.stringify({
  ok: true,
  repaired,
  verified: [...requiredSpaShells, ...requiredStaticPages],
  canonicalShell: "dist/index.html",
  assetBase: "/assets/",
  canonicalApi: api.destination,
  jyotish: jyotish.destination,
}, null, 2));
