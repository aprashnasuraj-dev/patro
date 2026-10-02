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

test("SEO discovery uses production canonical, factual day sitemaps and trust routes", () => {
  const manifest = JSON.parse(read("public/seo-manifest.json"));
  assert.equal(manifest.schema_version, 4);
  assert.equal(manifest.site_url, production);
  assert.equal(manifest.canonical_tool_route_count, 29);
  assert.equal(manifest.indexed_calendar_years.length, 5);
  assert.ok(manifest.indexed_day_route_count >= 1700);
  assert.ok(manifest.indexed_route_count >= 1800);
  assert.match(manifest.preferred_citation, /^Aafnai Patro \(aafnaipatro\.com\), accessed \d{4}-\d{2}-\d{2}$/);

  const index = read("public/sitemap.xml");
  assert.ok(index.includes("<sitemapindex"));
  for (const year of manifest.indexed_calendar_years) {
    assert.ok(manifest.sitemap_files.includes(`sitemap-calendar-${year}.xml`));
    assert.ok(manifest.sitemap_files.includes(`sitemap-days-${year}.xml`));
  }
  for (const name of manifest.sitemap_files) {
    assert.ok(index.includes(`${production}/${name}`), name);
    const path = `public/${name}`;
    assert.ok(existsSync(new URL("../" + path, import.meta.url)), `${name} must be generated before tests`);
    const text = read(path);
    assert.ok(text.includes(production));
    assert.ok(!text.includes(retired));
  }
  const pages = read("public/sitemap-pages.xml");
  for (const route of ["/", "/today", "/methodology", "/corrections", "/convert", "/rashifal", "/time-machine", "/on-this-day", "/fm", "/tv"]) {
    const url = route === "/" ? `${production}/` : `${production}${route}`;
    assert.ok(pages.includes(`<loc>${url}</loc>`), route);
  }
});

test("canonical tools remain complete while private/news/developer surfaces stay out of search discovery", () => {
  const tools = read("public/sitemap-tools.xml");
  assert.equal(canonicalTools.length, 29);
  for (const route of canonicalTools) assert.ok(tools.includes(`<loc>${production}${route}</loc>`), route);
  const pages = read("public/sitemap-pages.xml");
  for (const route of ["/samachar", "/developers", "/tools/api"]) assert.ok(!pages.includes(`<loc>${production}${route}</loc>`), route);
});

test("robots covers 2026 search/AI crawlers and warns about Cloudflare overrides", () => {
  const robots = read("public/robots.txt");
  for (const agent of [
    "OAI-SearchBot", "ChatGPT-User", "GPTBot", "Googlebot", "Google-Extended", "Bingbot",
    "Claude-SearchBot", "Claude-User", "ClaudeBot", "PerplexityBot", "Perplexity-User",
    "Applebot", "Applebot-Extended", "Amazonbot", "DuckDuckBot", "YandexBot", "NaverBot"
  ]) {
    const marker = `User-agent: ${agent}`;
    assert.ok(robots.includes(marker), agent);
    const start = robots.indexOf(marker);
    const stop = robots.indexOf("\n\n", start);
    const block = robots.slice(start, stop < 0 ? undefined : stop);
    for (const path of ["/api/", "/compat-api/", "/me/", "/admin/", "/auth/"]) assert.ok(block.includes(`Disallow: ${path}`), `${agent} ${path}`);
  }
  assert.ok(robots.includes("Cloudflare bot-management settings"));
  assert.ok(robots.includes(`Sitemap: ${production}/sitemap.xml`));
});

test("agent discovery files, MCP and narrow agent OpenAPI are generated", () => {
  for (const file of ["public/llms.txt","public/llms-full.txt","public/ai.txt","public/.well-known/ai-plugin.json","public/.well-known/agents.json","public/.well-known/agent-openapi.json","public/.well-known/security.txt"]) {
    assert.ok(existsSync(new URL("../" + file, import.meta.url)), file);
  }
  const llms = read("public/llms.txt");
  assert.ok(llms.includes(`${production}/mcp`));
  assert.ok(llms.includes(`${production}/methodology`));
  assert.ok(llms.includes(`${production}/corrections`));
  assert.ok(!llms.includes("MeroPatro"));

  const full = read("public/llms-full.txt");
  assert.ok(full.split("\n").length >= 1700);
  assert.ok(full.includes("Preferred citation:"));
  const ai = read("public/ai.txt");
  assert.ok(ai.includes("Preferred citation:"));
  assert.ok(ai.includes("/.well-known/agents.json"));

  const agents = JSON.parse(read("public/.well-known/agents.json"));
  assert.equal(agents.mcp.url, `${production}/mcp`);
  assert.deepEqual(agents.mcp.tools, ["get_today","convert_date","get_festival"]);
  const plugin = JSON.parse(read("public/.well-known/ai-plugin.json"));
  assert.equal(plugin.api.url, `${production}/.well-known/agent-openapi.json`);
  const openapi = JSON.parse(read("public/.well-known/agent-openapi.json"));
  for (const path of ["/api/agent/v1/today","/api/agent/v1/convert","/api/agent/v1/festival"]) assert.ok(openapi.paths[path], path);
  const security = read("public/.well-known/security.txt");
  assert.ok(security.includes(`Contact: ${production}/contact`));
  assert.ok(security.includes(`Canonical: ${production}/.well-known/security.txt`));
});

test("single-source adapter drives build SEO, D1 runtime pages and MCP", () => {
  const adapter = read("lib/patro.ts");
  const nodeAdapter = read("lib/patro.mjs");
  const snapshot = read("scripts/calendar-snapshot.mjs");
  const source = read("worker/patro-source.ts");
  const gateway = read("worker/agent-gateway.ts");
  const mcp = read("worker/mcp.ts");
  const pages = read("worker/agent-pages.ts");

  for (const name of ["getDay","getDayByAd","getMonth","getYear","getFestivals","getFestival","getSait","getHolidays","convertBsToAd","convertAdToBs","getTodayNepal","getTithiAt"]) assert.ok(adapter.includes(name), name);
  assert.ok(adapter.includes("PATRO_CITIES"));
  assert.ok(adapter.includes("new-york") && adapter.includes("kuwait-city"));
  assert.ok(nodeAdapter.includes("migration/data/public/astronomy_calendar_map"));
  assert.ok(snapshot.includes('../lib/patro.mjs'));
  assert.ok(source.includes('table_name=\'astronomy_calendar_map\''));
  assert.ok(gateway.includes("createPatroAdapter(createD1PatroSource(env))"));
  assert.ok(mcp.includes('const MODERN = "2026-07-28"'));
  assert.ok(mcp.includes('const LEGACY = "2025-11-25"'));
  assert.ok(mcp.includes("get_today") && mcp.includes("convert_date") && mcp.includes("get_festival"));
  for (const route of ["/today","/methodology","/corrections","/festivals/","/countdown/","/panchang/","/sait/","/ics/","/pdf/calendar/","/widget/today","/widget/calendar/"]) assert.ok(pages.includes(route), route);
});

test("build prerenders factual archive-backed HTML and production Worker prefers exact pages", () => {
  const prerender = read("scripts/prerender-seo.mjs");
  const days = read("scripts/prerender-days-seo.mjs");
  const config = read("scripts/seo-config.mjs");
  const pkg = JSON.parse(read("package.json"));
  const entry = read("worker/connected-entry.ts");
  assert.ok(prerender.includes('data-seo-prerender="true"'));
  assert.ok(prerender.includes('"@type": "WebPage"'));
  assert.ok(prerender.includes('"@type": "BreadcrumbList"'));
  assert.ok(prerender.includes('"@type": "WebApplication"'));
  assert.ok(prerender.includes("max-image-preview:large"));
  assert.ok(config.includes("Ashwin Ashoj Asoj"));
  assert.ok(config.includes("PRERENDER_CALENDAR_YEARS"));
  assert.ok(days.includes("loadCalendarSnapshot"));
  assert.ok(days.includes("loadHolidayMap"));
  assert.ok(days.includes("यो मितिको सीधा उत्तर"));
  assert.ok(days.includes("<table>"));
  assert.ok(pkg.scripts.build.indexOf("prerender-days-seo.mjs") < pkg.scripts.build.indexOf("prerender-seo.mjs"));
  assert.ok(entry.includes("exactSpaAssetResponse"));
  assert.ok(entry.includes('import { handleAgentSurface } from "./agent-gateway"'));
  assert.ok(entry.includes('headers.set("x-robots-tag", "noindex, nofollow")'));
});
