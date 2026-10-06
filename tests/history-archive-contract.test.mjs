import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const production = "https://aafnaipatro.com";

test("permanent history archive keeps 366 gated identities and a deterministic Feb 29 page", () => {
  const graph = JSON.parse(read("public/publication-graph.json"));
  const days = graph.entities.filter((entity) => entity.type === "history-day");
  assert.equal(days.length, 366);
  assert.ok(days.some((entity) => entity.id === "history-day:02-29"));
  assert.ok(days.every((entity) => entity.publicationStatus === "candidate" && entity.indexable === false));

  const leap = read("dist/on-this-day/02-29/index.html");
  assert.ok(leap.includes(`<link rel="canonical" href="${production}/on-this-day/02-29"`));
  assert.ok(leap.includes('content="noindex,follow,max-image-preview:large"'));
  assert.ok(leap.includes('href="/on-this-day/02-28"'));
  assert.ok(leap.includes('href="/on-this-day/03-01"'));
  assert.ok(leap.includes('href="/on-this-day"'));
  assert.ok(leap.includes('href="/convert"'));
});

test("Step 6 keeps all 5,454 history records and labels the 2,147 unverified records", () => {
  const graph = JSON.parse(read("public/publication-graph.json"));
  const events = graph.entities.filter((entity) => entity.type === "history-event");
  assert.equal(events.length, 5454);
  assert.equal(graph.counts.historySourceBacked, 3307);
  assert.equal(graph.counts.historyNeedsFurtherVerification, 2147);
  assert.equal(events.filter((entity) => entity.facts?.verificationStatus === "unverified").length, 2147);
  assert.ok(events.filter((entity) => entity.facts?.verificationStatus === "unverified").every((entity) => entity.facts?.needsFurtherVerification === true && entity.facts?.evidenceDisposition === "needs-source"));
  assert.equal(graph.historyEvidencePolicy?.individualEventPagesPublished, false);
});

test("history archive renderer and hydration use packaged shards without hiding unverified records", () => {
  const renderer = read("scripts/prerender-history-days.mjs");
  const pages = read("src/AafnaiDetailPages.tsx");
  const router = read("src/PatroRouter.tsx");
  const worker = read("worker/connected-entry.ts");
  const pkg = JSON.parse(read("package.json"));

  assert.ok(renderer.includes("public/data/on-this-day"));
  assert.ok(renderer.includes("source_url"));
  assert.ok(renderer.includes("Needs further verification · थप प्रमाणीकरण आवश्यक"));
  assert.ok(!renderer.includes(".filter((entry) => entry.url && entry.title)"));
  assert.ok(!renderer.includes("summary_ne"));
  assert.ok(!renderer.includes("summary_en"));
  assert.ok(!renderer.includes("Date.now"));
  assert.ok(!renderer.includes("new Date()"));

  assert.ok(pages.includes('/data/on-this-day/month-${month}.json'));
  assert.ok(pages.includes("historySourceUrl"));
  assert.ok(pages.includes("historyNeedsFurtherVerification"));
  assert.ok(pages.includes("Needs further verification · थप प्रमाणीकरण आवश्यक"));
  assert.ok(!pages.includes("setData(rows.filter(item=>Boolean(historySourceUrl(item))))"));
  assert.ok(router.includes("HISTORY_DAY_ROUTE"));
  assert.ok(router.includes("monthDay={historyDay[1]}"));
  assert.ok(worker.includes("function isHistoryDayPath"));
  assert.ok(worker.includes("|| isHistoryDayPath(path)"));
  assert.ok(worker.includes('SEARCH_NOINDEX_EXACT.has(path) || isHistoryDayPath(path)'));
  assert.ok(!worker.includes('path.startsWith("/on-this-day/")'), "invalid month/day paths must not receive root SPA fallback");
  assert.ok(pkg.scripts.build.includes("scripts/prerender-history-days.mjs"));
  assert.ok(pkg.scripts["seo:prerender"].includes("scripts/prerender-history-days.mjs"));
});

test("Step 3 renders festivals as people/community observances, not Schema.org Events", () => {
  const renderer = read("scripts/prerender-festivals.mjs");
  assert.ok(renderer.includes('"@type":"CollectionPage"'));
  assert.ok(renderer.includes('"@type":"WebPage"'));
  assert.ok(renderer.includes("घर, परिवार"));
  assert.ok(renderer.includes("community/people observances"));
  assert.ok(!renderer.includes('"@type":"Event"'));
  assert.ok(!renderer.includes("EventScheduled"));

  const festivalsRoot = resolve(new URL("../dist/festivals", import.meta.url).pathname);
  const slugs = readdirSync(festivalsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  let occurrenceHtml = "";
  for (const slug of slugs) {
    const slugRoot = resolve(festivalsRoot, slug);
    const year = readdirSync(slugRoot, { withFileTypes: true }).find((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name));
    if (year) {
      occurrenceHtml = readFileSync(resolve(slugRoot, year.name, "index.html"), "utf8");
      break;
    }
  }
  assert.ok(occurrenceHtml, "expected at least one prerendered festival occurrence page");
  assert.ok(occurrenceHtml.includes('"@type":"WebPage"'));
  assert.ok(!occurrenceHtml.includes('"@type":"Event"'));
});

test("Step 10 calendar R2 manifest is complete, deterministic and absent from deploy static bulk", () => {
  const manifest = JSON.parse(read(".cloudflare/calendar-r2/manifest.json"));
  assert.equal(manifest.row_count, 77070);
  assert.equal(manifest.ad_start, "1826-04-11");
  assert.equal(manifest.ad_end, "2037-04-13");
  assert.match(manifest.source_version, /^sha256:[a-f0-9]{64}$/);
  assert.ok(Array.isArray(manifest.ad_years) && manifest.ad_years.length > 200);
  assert.ok(Array.isArray(manifest.bs_years) && manifest.bs_years.length > 200);
  assert.equal(manifest.files.length, manifest.ad_years.length + manifest.bs_years.length);
  assert.ok(manifest.files.every((row) => row.key?.startsWith("datasets/calendar/v1/") && row.row_count > 0));
  assert.equal(existsSync(resolve(new URL("../dist/data/calendar", import.meta.url).pathname)), false, "bulk calendar shards must not survive into dist");
});

test("Step 4/10 community R2 manifest contains exactly six archive families", () => {
  const manifest = JSON.parse(read(".cloudflare/community-r2/manifest.json"));
  assert.deepEqual(manifest.primary_families, ["nepal-sambat", "lhosar", "tharu", "mithila", "kirat", "hijri"]);
  assert.match(manifest.source_version, /^sha256:[a-f0-9]{64}$/);
  assert.ok(manifest.archive_route_count > 0);
  assert.equal(manifest.files.length, manifest.archive_route_count);
  for (const family of manifest.primary_families) {
    const rows = manifest.files.filter((row) => row.family === family);
    assert.ok(rows.length > 0, `missing archive years for ${family}`);
    assert.ok(rows.every((row) => row.key.startsWith("datasets/community/v1/") && row.route.startsWith(family === "nepal-sambat" ? "/nepal-sambat/" : `/samudaya/${family}/`)));
  }
  assert.ok(!manifest.primary_families.includes("chakra"));
});

test("immutable public archive rendering is R2-first and fail-closed instead of D1-per-page", () => {
  const pages = read("worker/public-archive-pages.ts");
  const year = read("worker/year-page.ts");
  const gateway = read("worker/agent-gateway.ts");
  const seed = read(".github/workflows/seed-history-r2.yml");

  assert.ok(pages.includes('const CALENDAR_PREFIX = "datasets/calendar/v1"'));
  assert.ok(pages.includes('const COMMUNITY_PREFIX = "datasets/community/v1"'));
  assert.ok(pages.includes('"x-patro-backend":"cloudflare-r2-public-archive"'));
  assert.ok(!pages.includes("createD1PatroSource"));
  assert.ok(!pages.includes("env.DB"));
  assert.ok(year.includes("Calendar R2 archive unavailable"));
  assert.ok(year.includes('"x-patro-backend":"r2-required"'));
  assert.ok(gateway.indexOf("publicArchivePageResponse") < gateway.indexOf("agentPageResponse"));
  assert.ok(seed.includes("manifest.files"));
  assert.ok(!seed.includes("seq 2016 2035"));
  assert.ok(!seed.includes("seq 2072 2092"));
});
