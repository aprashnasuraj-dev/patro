import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

test("history archive renderer and hydration use packaged shards without copied summaries", () => {
  const renderer = read("scripts/prerender-history-days.mjs");
  const pages = read("src/AafnaiDetailPages.tsx");
  const router = read("src/PatroRouter.tsx");
  const pkg = JSON.parse(read("package.json"));

  assert.ok(renderer.includes("public/data/on-this-day"));
  assert.ok(renderer.includes("source_url"));
  assert.ok(!renderer.includes("summary_ne"));
  assert.ok(!renderer.includes("summary_en"));
  assert.ok(!renderer.includes("Date.now"));
  assert.ok(!renderer.includes("new Date()"));

  assert.ok(pages.includes('/data/on-this-day/month-${month}.json'));
  assert.ok(pages.includes("historySourceUrl"));
  assert.ok(router.includes("HISTORY_DAY_ROUTE"));
  assert.ok(router.includes("monthDay={historyDay[1]}"));
  assert.ok(pkg.scripts.build.includes("scripts/prerender-history-days.mjs"));
  assert.ok(pkg.scripts["seo:prerender"].includes("scripts/prerender-history-days.mjs"));
});
