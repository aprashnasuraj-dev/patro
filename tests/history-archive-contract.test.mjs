import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
