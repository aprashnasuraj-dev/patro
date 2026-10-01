import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const production = "https://aafnaipatro.com";
const retired = "patro-blush.vercel.app";

test("SEO discovery files use the production canonical only", () => {
  const files = [
    "public/robots.txt",
    "public/sitemap.xml",
    "public/sitemap-pages.xml",
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

test("sitemap index is segmented into pages, community and calendar", () => {
  const index = read("public/sitemap.xml");
  assert.ok(index.includes("<sitemapindex"));
  for (const name of ["sitemap-pages.xml", "sitemap-community.xml", "sitemap-calendar.xml"]) {
    assert.ok(index.includes(`${production}/${name}`), name);
  }

  const pages = read("public/sitemap-pages.xml");
  for (const route of ["/", "/tools/astro", "/convert", "/rashifal", "/samachar", "/fm", "/tv", "/developers"]) {
    assert.ok(pages.includes(`<loc>${production}${route}</loc>`), route);
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
  assert.deepEqual(manifest.sitemap_files, ["sitemap-pages.xml", "sitemap-community.xml", "sitemap-calendar.xml"]);
  assert.ok(manifest.indexed_route_count >= 60);

  const llms = read("public/llms.txt");
  assert.ok(llms.includes("आफ्नै पात्रो"));
  assert.ok(llms.includes(`${production}/tv`));
  assert.ok(llms.includes(`${production}/samachar`));
});
