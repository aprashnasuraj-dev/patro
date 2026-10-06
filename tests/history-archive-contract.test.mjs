import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const production = "https://aafnaipatro.com";

test("permanent history archive keeps 366 stable identities and a deterministic Feb 29 page", () => {
  const graph = JSON.parse(read("public/publication-graph.json"));
  const days = graph.entities.filter((entity) => entity.type === "history-day");
  assert.equal(days.length, 366);
  assert.ok(days.some((entity) => entity.id === "history-day:02-29"));

  const leap = read("dist/on-this-day/02-29/index.html");
  assert.ok(leap.includes(`<link rel="canonical" href="${production}/on-this-day/02-29"`));
  assert.ok(leap.includes('href="/on-this-day/02-28"'));
  assert.ok(leap.includes('href="/on-this-day/03-01"'));
  assert.ok(leap.includes('href="/on-this-day"'));
  assert.ok(leap.includes('href="/convert"'));
});

test("history archive preserves all 5,454 source records and evidence labels", () => {
  const graph = JSON.parse(read("public/publication-graph.json"));
  const events = graph.entities.filter((entity) => entity.type === "history-event");
  assert.equal(events.length, 5454);
  assert.equal(graph.counts.historySourceBacked, 3307);
  assert.equal(graph.counts.historyNeedsFurtherVerification, 2147);
  assert.equal(events.filter((entity) => entity.facts?.verificationStatus === "unverified").length, 2147);
  assert.equal(graph.historyEvidencePolicy?.individualEventPagesPublished, false);
});

test("history renderer uses packaged shards and never hides unverified records", () => {
  const renderer = read("scripts/prerender-history-days.mjs");
  const pages = read("src/AafnaiDetailPages.tsx");
  const router = read("src/PatroRouter.tsx");
  const pkg = JSON.parse(read("package.json"));
  assert.ok(renderer.includes("public/data/on-this-day"));
  assert.ok(renderer.includes("source_url"));
  assert.ok(renderer.includes("Needs further verification · थप प्रमाणीकरण आवश्यक"));
  assert.ok(!renderer.includes(".filter((entry) => entry.url && entry.title)"));
  assert.ok(pages.includes('/data/on-this-day/month-${month}.json'));
  assert.ok(router.includes("HISTORY_DAY_ROUTE"));
  assert.ok(pkg.scripts.build.includes("scripts/prerender-history-days.mjs"));
});

test("festival pages are source-backed page schema, not synthetic Schema.org Event spam", () => {
  const renderer = read("scripts/prerender-festivals.mjs");
  assert.ok(renderer.includes('"@type":"CollectionPage"'));
  assert.ok(renderer.includes('"@type":"WebPage"'));
  assert.ok(!renderer.includes('"@type":"Event"'));
  const festivalsRoot = resolve(new URL("../dist/festivals", import.meta.url).pathname);
  const slugs = readdirSync(festivalsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  assert.ok(slugs.length > 0, "expected source-backed festival pages");
});

test("calendar R2 manifest is complete and every year shard survives as packaged fallback", () => {
  const manifest = JSON.parse(read(".cloudflare/calendar-r2/manifest.json"));
  assert.equal(manifest.row_count, 77070);
  assert.equal(manifest.ad_start, "1826-04-11");
  assert.equal(manifest.ad_end, "2037-04-13");
  assert.match(manifest.source_version, /^sha256:[a-f0-9]{64}$/);
  assert.ok(Array.isArray(manifest.ad_years) && manifest.ad_years.length > 200);
  assert.ok(Array.isArray(manifest.bs_years) && manifest.bs_years.length > 200);
  assert.equal(manifest.files.length, manifest.ad_years.length + manifest.bs_years.length);
  assert.ok(manifest.files.every((row) => row.key?.startsWith("datasets/calendar/v1/") && row.static?.startsWith("/data/calendar/") && row.row_count > 0));
  assert.equal(existsSync(resolve(new URL("../dist/data/calendar/ad/2026.json", import.meta.url).pathname)), true, "AD 2026 static fallback must ship");
  assert.equal(existsSync(resolve(new URL("../dist/data/calendar/bs", import.meta.url).pathname)), true, "BS static fallback must ship");
});

test("community R2 manifest contains exactly six archive families", () => {
  const manifest = JSON.parse(read(".cloudflare/community-r2/manifest.json"));
  assert.deepEqual(manifest.primary_families, ["nepal-sambat", "lhosar", "tharu", "mithila", "kirat", "hijri"]);
  assert.match(manifest.source_version, /^sha256:[a-f0-9]{64}$/);
  assert.ok(manifest.archive_route_count > 0);
  assert.equal(manifest.files.length, manifest.archive_route_count);
});

test("immutable calendar archive rendering is R2 first, static second, never D1 per page", () => {
  const loader = read("worker/calendar-archive.ts");
  const pages = read("worker/public-archive-pages.ts");
  const fast = read("worker/calendar-fast.ts");
  const exports = read("worker/data-export.ts");
  const seed = read(".github/workflows/seed-history-r2.yml");
  assert.ok(loader.includes('CALENDAR_PREFIX = "datasets/calendar/v1"'));
  assert.ok(loader.includes('backend: "r2"'));
  assert.ok(loader.includes('backend: "static-fallback"'));
  assert.ok(loader.includes('"retry-after": "300"'));
  assert.ok(!pages.includes("env.DB"));
  assert.ok(fast.includes("loadCalendarShard"));
  assert.ok(exports.includes("loadCalendarShard"));
  assert.ok(seed.includes("manifest.files"));
  assert.ok(seed.includes("--remote --force"));
});
