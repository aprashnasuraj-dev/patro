import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFile(path.join(root, relative), "utf8");

test("SEO generator emits segmented sitemaps, robots policy and llms.txt", async () => {
  const source = await read("scripts/generate-seo.mjs");
  for (const marker of [
    "sitemap-pages.xml",
    "sitemap-community.xml",
    "sitemap-calendar.xml",
    "public/llms.txt",
    "/aaja",
    "/tools/tithi",
    "/samudaya/lhosar"
  ]) assert.ok(source.includes(marker), marker);
});

test("Cloudflare root preserves Search Console verification and discovery assets", async () => {
  const emitter = await read("scripts/emit-cloudflare-root.mjs");
  for (const marker of [
    "googlee3f9fe18a8806baf.html",
    "llms.txt",
    "sitemap-pages.xml",
    "sitemap-community.xml",
    "sitemap-calendar.xml"
  ]) assert.ok(emitter.includes(marker), marker);
});

test("edge SEO uses canonical origin override and rich crawl directives", async () => {
  const worker = await read("worker/index.ts");
  assert.ok(worker.includes("PUBLIC_SITE_URL?: string"));
  assert.ok(worker.includes("max-image-preview:large"));
  assert.ok(worker.includes('alternateName: "Mero Patro"'));
  assert.ok(worker.includes('"@type": "Dataset"'));
  assert.ok(worker.includes("normalizedSearchTarget"));
  assert.ok(worker.includes('return Response.redirect(canonical.toString(), 308)'));
});

test("Cloudflare Pages static routes receive route-specific SEO without UI replacement", async () => {
  const pages = await read("functions/[[path]].js");
  assert.ok(pages.includes("rewriteStaticHtml"));
  assert.ok(pages.includes('"/fm": ["FM Radio · MeroPatro"'));
  assert.ok(pages.includes('"/tv": ["Live TV · MeroPatro"'));
  assert.ok(pages.includes('"/samudaya/lhosar"'));
  assert.ok(pages.includes("max-image-preview:large"));
  assert.ok(pages.includes('await next()'));
  assert.ok(pages.includes('return Response.redirect(canonical.toString(), 308)'));
});

test("Worker and Pages preview deployments canonicalize to the current production host", async () => {
  const [workerConfig, pagesConfig] = await Promise.all([
    read("wrangler.toml"),
    read("wrangler.pages.jsonc")
  ]);
  assert.ok(workerConfig.includes('PUBLIC_SITE_URL = "https://patro-blush.vercel.app"'));
  assert.equal(JSON.parse(pagesConfig).vars.PUBLIC_SITE_URL, "https://patro-blush.vercel.app");
});

test("SEO surfaces do not inject competitor brand names", async () => {
  const files = [
    "scripts/generate-seo.mjs",
    "worker/index.ts",
    "functions/[[path]].js",
    "index.html",
    "public/llms.txt"
  ];
  const forbidden = [/Hamro\s*Patro/i, /Nepali\s*Patro/i];
  for (const file of files) {
    const body = await read(file);
    for (const pattern of forbidden) {
      assert.equal(pattern.test(body), false, `${file} contains forbidden SEO brand phrase ${pattern}`);
    }
  }
});

test("base HTML keeps semantic brand and agent discovery metadata", async () => {
  const html = await read("index.html");
  assert.ok(html.includes('lang="ne"'));
  assert.ok(html.includes('rel="describedby" href="/llms.txt"'));
  assert.ok(html.includes("SoftwareApplication"));
  assert.ok(html.includes("max-image-preview:large"));
});

test("tracked sitemap index points to the three generated sitemap segments", async () => {
  const [index, pages, community, calendar, robots] = await Promise.all([
    read("public/sitemap.xml"),
    read("public/sitemap-pages.xml"),
    read("public/sitemap-community.xml"),
    read("public/sitemap-calendar.xml"),
    read("public/robots.txt")
  ]);
  for (const file of ["sitemap-pages.xml", "sitemap-community.xml", "sitemap-calendar.xml"]) {
    assert.ok(index.includes(file), file);
  }
  assert.ok(pages.includes("/aaja"));
  assert.ok(community.includes("/samudaya/lhosar"));
  assert.ok(calendar.includes("/calendar/2083/01"));
  assert.ok(robots.includes("Sitemap: https://patro-blush.vercel.app/sitemap.xml"));
});

test("Vercel SEO-sensitive SPA routes use route-specific generated shells", async () => {
  const [vercelRaw, emitter, doctor] = await Promise.all([
    read("vercel.json"),
    read("scripts/emit-tool-shell.mjs"),
    read("scripts/doctor.mjs")
  ]);
  const vercel = JSON.parse(vercelRaw);
  const rewrites = new Map((vercel.rewrites || []).map((row) => [row.source, row.destination]));
  for (const [route, target] of [
    ["/tools", "/tools/index.html"],
    ["/fm", "/fm/index.html"],
    ["/tv", "/tv/index.html"],
    ["/explore", "/explore/index.html"],
    ["/about", "/about/index.html"],
    ["/sources", "/sources/index.html"],
    ["/jyotish/janma-patro", "/jyotish/janma-patro/index.html"]
  ]) {
    assert.equal(rewrites.get(route), target, route);
    assert.ok(emitter.includes('"' + route + '"'), "missing shell metadata for " + route);
  }
  assert.ok(doctor.includes('"fm/index.html"'));
  assert.ok(doctor.includes('"tv/index.html"'));
});

test("local Lighthouse server does not weaken production canonical metadata", async () => {
  const [server, index] = await Promise.all([
    read("scripts/serve-dist.mjs"),
    read("index.html")
  ]);
  assert.ok(server.includes("Lighthouse treats a homepage canonical"));
  assert.ok(index.includes('rel="canonical" href="https://patro-blush.vercel.app/"'));
});

test("calendar accessibility does not misuse ARIA gridcell without row semantics", async () => {
  const calendar = await read("src/components/CalendarGrid.tsx");
  assert.equal(calendar.includes('role="gridcell"'), false);
  assert.equal(calendar.includes('role="grid"'), false);
  assert.ok(calendar.includes('role="group"'));
  assert.ok(calendar.includes('aria-pressed={cell.iso===selectedDate}'));
});

test("reference theme has explicit contrast fixes for audited calendar, utility and FM selectors", async () => {
  const css = await read("src/reference-ui.css");
  for (const marker of [
    ".inline-error{",
    ".segmented-control button.active{",
    ".calendar-card .weekday-row span{",
    ".utility-directory-card .utility-directory-copy > strong{",
    ".station-badge{",
    ".station-copy .station-meta{"
  ]) assert.ok(css.includes(marker), marker);
});

test("client SEO keeps exactly one canonical and uses localhost only for local audits", async () => {
  const [componentSeo, routeSeo] = await Promise.all([
    read("src/components/seo/SeoMeta.tsx"),
    read("src/seo.ts")
  ]);
  assert.ok(componentSeo.includes("querySelectorAll('link[rel=\"canonical\"]')"));
  assert.ok(componentSeo.includes("localAuditHost()"));
  assert.ok(routeSeo.includes("canonicalBase=localAudit?location.origin:BASE"));
  assert.ok(routeSeo.includes("canonicals.slice(1).forEach"));
});

test("global media provider lazy-loads HLS instead of adding it to every page startup", async () => {
  const provider = await read("src/media/MediaProvider.tsx");
  assert.equal(provider.includes('import Hls from "hls.js"'), false);
  assert.ok(provider.includes('await import("hls.js")'));
});
