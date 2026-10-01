import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const production = "https://aafnaipatro.com";
const retired = "patro-blush.vercel.app";

const canonicalTools = [
  "/tools/astro",
  "/tools/nepali-typing",
  "/tools/preeti-converter",
  "/tools/bstoad",
  "/tools/adtobs",
  "/tools/calc",
  "/tools/age",
  "/tools/clock",
  "/tools/forex",
  "/tools/gold",
  "/tools/emi",
  "/tools/vat",
  "/tools/units",
  "/tools/words",
  "/tools/incometax",
  "/tools/landconverter",
  "/tools/nepaliqr",
  "/tools/fuelprice",
  "/tools/tithi-reminder",
  "/tools/sait",
  "/tools/baby-names",
  "/tools/janmadin-akhbar",
  "/tools/future-letter",
  "/tools/spell-check",
  "/tools/voice-typing",
  "/tools/ocr",
  "/tools/name-check",
  "/tools/read-aloud",
  "/tools/patro-bot"
];

test("SEO discovery files use the production canonical only", () => {
  const files = [
    "public/robots.txt",
    "public/sitemap.xml",
    "public/sitemap-pages.xml",
    "public/sitemap-tools.xml",
    "public/sitemap-community.xml",
    "public/sitemap-calendar.xml",
    "public/llms.txt",
    "public/seo-manifest.json"
  ];
  for (const file of files) {
    const text = read(file);
    assert.ok(text.includes(production), `${file} must reference ${production}`);
    assert.ok(!text.includes(retired), `${file} must not reference ${retired}`);
  }
});

test("sitemap index is segmented into pages, tools, community and calendar", () => {
  const index = read("public/sitemap.xml");
  assert.ok(index.includes("<sitemapindex"));
  for (const name of ["sitemap-pages.xml", "sitemap-tools.xml", "sitemap-community.xml", "sitemap-calendar.xml"]) {
    assert.ok(index.includes(`${production}/${name}`), name);
  }

  const pages = read("public/sitemap-pages.xml");
  for (const route of ["/", "/convert", "/rashifal", "/samachar", "/time-machine", "/on-this-day", "/fm", "/tv", "/developers"]) {
    assert.ok(pages.includes(`<loc>${production}${route}</loc>`), route);
  }

  const tools = read("public/sitemap-tools.xml");
  assert.equal(canonicalTools.length, 29);
  for (const route of canonicalTools) {
    assert.ok(tools.includes(`<loc>${production}${route}</loc>`), route);
  }
  for (const alias of ["/tools/tax", "/tools/land", "/tools/qr", "/tools/fuel"]) {
    assert.ok(!tools.includes(`<loc>${production}${alias}</loc>`), `alias must not be indexed: ${alias}`);
  }

  const community = read("public/sitemap-community.xml");
  for (const route of ["/nepal-sambat/mandala", "/samudaya/lhosar", "/samudaya/tharu", "/samudaya/mithila", "/samudaya/kirat", "/samudaya/hijri", "/samudaya/chakra"]) {
    assert.ok(community.includes(`<loc>${production}${route}</loc>`), route);
  }
});

test("robots and machine-readable manifest preserve public/private boundaries", () => {
  const robots = read("public/robots.txt");
  assert.ok(robots.includes("Disallow: /api/"));
  assert.ok(robots.includes("Disallow: /me/"));
  assert.ok(robots.includes("Disallow: /admin/"));
  assert.ok(robots.includes(`Sitemap: ${production}/sitemap.xml`));

  const manifest = JSON.parse(read("public/seo-manifest.json"));
  assert.equal(manifest.schema_version, 2);
  assert.equal(manifest.site_url, production);
  assert.equal(manifest.llms_txt, `${production}/llms.txt`);
  assert.equal(manifest.canonical_tool_route_count, 29);
  assert.deepEqual(manifest.sitemap_files, ["sitemap-pages.xml", "sitemap-tools.xml", "sitemap-community.xml", "sitemap-calendar.xml"]);
  assert.ok(manifest.indexed_route_count >= 90);

  const llms = read("public/llms.txt");
  assert.ok(llms.includes("आफ्नै पात्रो"));
  assert.ok(llms.includes(`${production}/tv`));
  assert.ok(llms.includes(`${production}/samachar`));
  assert.ok(llms.includes(`${production}/time-machine`));
  assert.ok(llms.includes(`${production}/tools/patro-bot`));
});
