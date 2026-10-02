import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const production = "https://aafnaipatro.com";
const retired = "patro-blush.vercel.app";

const canonicalTools = [
  "/tools/astro", "/tools/nepali-typing", "/tools/preeti-converter", "/tools/bstoad", "/tools/adtobs",
  "/tools/calc", "/tools/age", "/tools/clock", "/tools/forex", "/tools/gold", "/tools/emi", "/tools/vat",
  "/tools/units", "/tools/words", "/tools/incometax", "/tools/landconverter", "/tools/nepaliqr", "/tools/fuelprice",
  "/tools/tithi-reminder", "/tools/sait", "/tools/baby-names", "/tools/janmadin-akhbar", "/tools/future-letter",
  "/tools/spell-check", "/tools/voice-typing", "/tools/ocr", "/tools/name-check", "/tools/read-aloud", "/tools/patro-bot"
];

test("SEO discovery uses only the production canonical and a segmented sitemap index", () => {
  const manifest = JSON.parse(read("public/seo-manifest.json"));
  assert.equal(manifest.schema_version, 3);
  assert.equal(manifest.site_url, production);
  assert.equal(manifest.canonical_tool_route_count, 29);
  assert.equal(manifest.indexed_calendar_years.length, 5);
  assert.ok(manifest.indexed_route_count >= 95);

  const index = read("public/sitemap.xml");
  assert.ok(index.includes("<sitemapindex"));
  for (const name of manifest.sitemap_files) {
    assert.ok(index.includes(`${production}/${name}`), name);
    const path = `public/${name}`;
    assert.ok(existsSync(new URL("../" + path, import.meta.url)), `${name} must be generated before tests`);
    const text = read(path);
    assert.ok(text.includes(production), `${name} must reference production`);
    assert.ok(!text.includes(retired), `${name} must not reference retired Vercel host`);
  }
});

test("canonical tool inventory remains complete and API/docs/news are not search targets", () => {
  const tools = read("public/sitemap-tools.xml");
  assert.equal(canonicalTools.length, 29);
  for (const route of canonicalTools) assert.ok(tools.includes(`<loc>${production}${route}</loc>`), route);

  const pages = read("public/sitemap-pages.xml");
  for (const route of ["/", "/convert", "/rashifal", "/time-machine", "/on-this-day", "/fm", "/tv"]) {
    const url = route === "/" ? `${production}/` : `${production}${route}`;
    assert.ok(pages.includes(`<loc>${url}</loc>`), route);
  }
  for (const route of ["/samachar", "/developers", "/tools/api"]) {
    assert.ok(!pages.includes(`<loc>${production}${route}</loc>`), `${route} must remain functional but noindex/out of sitemap`);
  }
});

test("robots explicitly allow search/answer crawlers while blocking private and machine surfaces", () => {
  const robots = read("public/robots.txt");
  for (const agent of ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "Googlebot", "Google-Extended", "Bingbot", "Claude-SearchBot", "PerplexityBot"]) {
    assert.ok(robots.includes(`User-agent: ${agent}`), agent);
  }
  for (const path of ["/api/", "/compat-api/", "/me/", "/admin/", "/auth/"]) {
    assert.ok(robots.includes(`Disallow: ${path}`), path);
  }
  assert.ok(robots.includes(`Sitemap: ${production}/sitemap.xml`));

  const llms = read("public/llms.txt");
  assert.ok(llms.includes("आफ्नै पात्रो"));
  assert.ok(llms.includes("Nepali Calendar"));
  assert.ok(llms.includes(`${production}/convert`));
  assert.ok(!llms.includes(`${production}/api/v1/`), "frontend AI discovery must not advertise API endpoints");
  assert.ok(!llms.includes(`[Developer documentation]`), "developer/API pages must not be citation targets");
});

test("build prerenders semantic HTML and Worker serves exact route HTML before SPA fallback", () => {
  const prerender = read("scripts/prerender-seo.mjs");
  const config = read("scripts/seo-config.mjs");
  const entry = read("worker/connected-entry.ts");
  assert.ok(prerender.includes('data-seo-prerender="true"'));
  assert.ok(prerender.includes('"@type": "WebPage"'));
  assert.ok(prerender.includes('"@type": "BreadcrumbList"'));
  assert.ok(prerender.includes('"@type": "WebApplication"'));
  assert.ok(prerender.includes("max-image-preview:large"));
  assert.ok(prerender.includes("Ashwin Ashoj Asoj") || config.includes("Ashwin Ashoj Asoj"));
  assert.ok(config.includes("PRERENDER_CALENDAR_YEARS"));
  assert.ok(entry.includes("exactSpaAssetResponse"));
  assert.ok(entry.indexOf("exactSpaAssetResponse") < entry.lastIndexOf("rootSpaResponse"), "exact prerender lookup must exist before root fallback");
  assert.ok(entry.includes('SEARCH_NOINDEX_EXACT = new Set(["/samachar", "/developers", "/tools/api", "/offline"])'));
});

test("connected Worker preserves route-aware Aafnai Patro metadata and machine noindex", () => {
  const seo = read("worker/connected-seo.ts");
  const entry = read("worker/connected-entry.ts");
  assert.ok(entry.includes('import { rewriteConnectedSeo } from "./connected-seo"'));
  assert.ok(seo.includes('const BRAND="आफ्नै पात्रो"'));
  assert.ok(seo.includes('const BRAND_EN="Aafnai Patro"'));
  assert.ok(!seo.includes("MeroPatro"), "production SEO must not use the retired brand");
  assert.ok(entry.includes('headers.set("x-robots-tag", "noindex, nofollow")'));
  for (const route of canonicalTools) {
    const slug = route.slice("/tools/".length);
    assert.ok(seo.includes(slug), `connected SEO missing canonical tool: ${slug}`);
  }
});
