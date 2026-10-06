import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SITE } from "./seo-config.mjs";
import { BUILD_DATE, snapshotDate, updateSitemapIndex, urlsetXml } from "./sitemap-utils.mjs";

const root = process.cwd();
const datesPath = resolve(root, "migration/data/public/community_dates.json");
const festivalsPath = resolve(root, "migration/data/public/community_festivals.json");
const expectedPath = resolve(root, "cloudflare/d1/expected-public-counts.json");
const outDir = resolve(root, "public/data");

const datesDoc = JSON.parse(await readFile(datesPath, "utf8"));
const festivalsDoc = JSON.parse(await readFile(festivalsPath, "utf8"));
const expectedDoc = JSON.parse(await readFile(expectedPath, "utf8"));
const dates = Array.isArray(datesDoc?.rows) ? datesDoc.rows : [];
const festivals = Array.isArray(festivalsDoc?.rows) ? festivalsDoc.rows : [];
const expectedCount = Number(expectedDoc?.tables?.community_dates || 0);
if (!expectedCount || dates.length !== expectedCount) throw new Error(`Community date inventory mismatch: ${dates.length} != ${expectedCount}`);
if (expectedCount < 1000) throw new Error(`Community date inventory unexpectedly small: ${expectedCount}`);

const clean = (value) => String(value ?? "").trim();
const safeSegment = (value) => clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
const defs = new Map(festivals.map((row) => [`${clean(row?.suite)}:${clean(row?.id)}`, row]));
const events = {};
const routes = [];
const groups = new Map();

for (const row of dates) {
  const suite = safeSegment(row?.suite);
  const festivalId = safeSegment(row?.festival_id);
  const year = Number(row?.year);
  const main = clean(row?.main || row?.start_ad).slice(0, 10);
  const startAd = clean(row?.start_ad || main).slice(0, 10);
  const endAd = clean(row?.end_ad || startAd).slice(0, 10);
  if (!suite || !festivalId || !Number.isInteger(year) || !/^\d{4}-\d{2}-\d{2}$/.test(main)) {
    throw new Error(`Invalid community date row: ${JSON.stringify(row)}`);
  }
  const def = defs.get(`${suite}:${festivalId}`) || {};
  const route = `/samudaya/${suite}/${festivalId}/${year}/${main}`;
  if (events[route]) throw new Error(`Duplicate community route: ${route}`);
  const event = {
    suite,
    festival_id: festivalId,
    year,
    main,
    start_ad: startAd,
    end_ad: endAd,
    region: row?.region ?? null,
    confidence: clean(row?.confidence) || "unknown",
    dev: clean(def?.dev) || festivalId.replace(/-/g, " "),
    roman: clean(def?.roman) || null,
    en: clean(def?.en) || null,
    summary: clean(def?.summary) || null,
    details: Array.isArray(def?.details) ? def.details.filter(Boolean).map(String) : [],
    places: Array.isArray(def?.places) ? def.places.filter(Boolean).map(String) : [],
    communities: Array.isArray(def?.communities) ? def.communities.filter(Boolean).map(String) : [],
    holiday: clean(def?.holiday) || null,
    status: clean(def?.status) || null,
    announced: typeof def?.announced === "boolean" ? def.announced : null,
    rule: def?.rule && typeof def.rule === "object" ? def.rule : null,
    sources: Array.isArray(def?.sources) ? def.sources.filter((url) => /^https?:\/\//i.test(String(url))).map(String) : [],
    route,
    previous_route: null,
    next_route: null,
  };
  events[route] = event;
  routes.push(route);
  const groupKey = `${suite}:${festivalId}`;
  const group = groups.get(groupKey) || [];
  group.push(event);
  groups.set(groupKey, group);
}

for (const group of groups.values()) {
  group.sort((a, b) => a.main.localeCompare(b.main) || a.year - b.year);
  for (let i = 0; i < group.length; i++) {
    group[i].previous_route = i > 0 ? group[i - 1].route : null;
    group[i].next_route = i + 1 < group.length ? group[i + 1].route : null;
  }
}

if (routes.length !== expectedCount) throw new Error(`Community route count mismatch: ${routes.length} != ${expectedCount}`);
const lastmod = (await snapshotDate("migration/data/public/community_dates.json", "migration/data/public/community_festivals.json")) || BUILD_DATE;
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, "community-event-index.json"), JSON.stringify({ schema: 1, count: routes.length, source_date: lastmod, events }) + "\n", "utf8");
await writeFile(resolve(root, "public/sitemap-community-events.xml"), urlsetXml(routes.map((route) => ({ route, lastmod }))), "utf8");
await updateSitemapIndex(resolve(root, "public/sitemap.xml"), [{ file: "sitemap-community-events.xml", lastmod }]);

const manifestPath = resolve(root, "public/seo-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const previousCommunity = Number(manifest.indexed_community_event_route_count || 0);
const baseCount = Math.max(0, Number(manifest.dynamic_indexable_route_count || 0) - previousCommunity);
manifest.sitemap_files = [...new Set([...(manifest.sitemap_files || []), "sitemap-community-events.xml"])];
manifest.indexed_community_event_route_count = routes.length;
manifest.community_event_index = `${SITE}/data/community-event-index.json`;
manifest.dynamic_indexable_route_count = baseCount + routes.length;
manifest.indexable_url_horizon = {
  ...(manifest.indexable_url_horizon || {}),
  minimum: 22572,
  actual: manifest.dynamic_indexable_route_count,
  community_events: routes.length,
};
if (manifest.dynamic_indexable_route_count < 22572) {
  throw new Error(`Expanded indexable URL horizon below 22,572: ${manifest.dynamic_indexable_route_count}`);
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`Community event route index: ${routes.length} one-record pages from seeded community_dates.`);
console.log(`Expanded factual URL horizon: ${manifest.dynamic_indexable_route_count} (minimum 22,572).`);
