import { access, copyFile, cp, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const astroShell = resolve(root, "dist/astro/index.html");
const requiredSpaShells = [
  "tools/index.html",
  "fm/index.html",
  "tv/index.html",
  "explore/index.html",
  "my-diary/index.html",
  "about/index.html",
  "sources/index.html",
  "privacy/index.html",
  "terms/index.html",
  "contact/index.html",
  "404/index.html",
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

if (!(await exists(astroShell))) {
  throw new Error("doctor: dist/astro/index.html is missing; Vite did not produce the canonical SPA shell");
}

const repaired = [];
for (const relative of requiredSpaShells) {
  const target = resolve(root, "dist", relative);
  if (!(await exists(target))) {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(astroShell, target);
    repaired.push(relative);
  }
}

const typingSource = resolve(root, "dist/astro/nepali-typing");
const typingTarget = resolve(root, "dist/nepali-typing");
if (!(await exists(typingTarget)) && (await exists(typingSource))) {
  await cp(typingSource, typingTarget, { recursive: true });
  repaired.push("nepali-typing/*");
}

const missingStatic = [];
for (const relative of requiredStaticPages) {
  if (!(await exists(resolve(root, "dist", relative)))) missingStatic.push(relative);
}

const vercel = JSON.parse(await readFile(resolve(root, "vercel.json"), "utf8"));
const rewrites = vercel.rewrites || [];
const api = rewrites.find((r) => r.source === "/api/v1/:path*");
if (!api || !String(api.destination || "").includes("/functions/v1/router/:path*")) {
  throw new Error("doctor: /api/v1 is not routed to the canonical Supabase router");
}
const jyotish = rewrites.find((r) => r.source === "/api/jyotish-chat");
if (!jyotish || !String(jyotish.destination || "").includes("/functions/v1/router/jyotish-chat")) {
  throw new Error("doctor: Jyotish chat still bypasses the canonical router");
}
for (const [source, destination] of Object.entries({
  "/fm": "/fm/index.html",
  "/tv": "/tv/index.html",
  "/tools": "/tools/index.html",
  "/about": "/about/index.html",
  "/sources": "/sources/index.html"
})) {
  const route = rewrites.find((r) => r.source === source);
  if (!route || route.destination !== destination) throw new Error("doctor: SEO shell rewrite mismatch for " + source);
}
const typing = rewrites.find((r) => r.source === "/tools/nepali-typing");
if (!typing || typing.destination !== "/nepali-typing/index.html") {
  throw new Error("doctor: Nepali typing is not served as a Vercel static asset");
}
if (missingStatic.length) {
  throw new Error("doctor: required static pages missing: " + missingStatic.join(", "));
}

console.log(JSON.stringify({
  ok: true,
  repaired,
  verified: [...requiredSpaShells, ...requiredStaticPages],
  canonicalApi: api.destination,
  jyotish: jyotish.destination,
  typing: typing.destination,
}, null, 2));
