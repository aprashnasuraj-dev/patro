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

test("SEO surfaces do not inject competitor brand names", async () => {
  const files = [
    "scripts/generate-seo.mjs",
    "worker/index.ts",
    "index.html"
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
