import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SITE, isIndexableRoute } from "./seo-config.mjs";
import { BUILD_DATE, snapshotDate, updateSitemapIndex, urlsetXml } from "./sitemap-utils.mjs";

const root = process.cwd();
const datesPath = resolve(root, "migration/data/public/community_dates.json");
const festivalsPath = resolve(root, "migration/data/public/community_festivals.json");
const expectedPath = resolve(root, "cloudflare/d1/expected-public-counts.json");
const outDir = resolve(root, "public/data");

const clean = (value) => String(value ?? "").trim();
const seg = (value) => clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
const iso = (value) => { const text = clean(value).slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ""; };

const datesDoc = JSON.parse(await readFile(datesPath, "utf8"));
const festivalsDoc = JSON.parse(await readFile(festivalsPath, "utf8"));
const expected = JSON.parse(await readFile(expectedPath, "utf8"));
const rows = Array.isArray(datesDoc?.rows) ? datesDoc.rows : [];
const festivalRows = Array.isArray(festivalsDoc?.rows) ? festivalsDoc.rows : [];
const expectedDates = Number(expected?.tables?.community_dates || 0);
const expectedFestivals = Number(expected?.tables?.community_festivals || 0);

if (expectedDates < 1000 || rows.length !== expectedDates) throw new Error(`community_dates inventory mismatch: ${rows.length} != ${expectedDates}`);
if (expectedFestivals < 30 || festivalRows.length !== expectedFestivals) throw new Error(`community_festivals inventory mismatch: ${festivalRows.length} != ${expectedFestivals}`);

const festivals = {};
for (const row of festivalRows) {
  const suite = seg(row?.suite);
  const id = seg(row?.id);
  if (!suite || !id) throw new Error("community_festivals row lacks suite/id");
  const key = `${suite}/${id}`;
  festivals[key] = {
    suite,
    id,
    dev: clean(row?.dev) || null,
    roman: clean(row?.roman) || null,
    en: clean(row?.en) || null,
    summary: clean(row?.summary) || null,
    details: Array.isArray(row?.details) ? row.details.map(clean).filter(Boolean) : [],
    places: Array.isArray(row?.places) ? row.places.map(clean).filter(Boolean) : [],
    communities: Array.isArray(row?.communities) ? row.communities.map(clean).filter(Boolean) : [],
    holiday: clean(row?.holiday) || null,
    announced: typeof row?.announced === "boolean" ? row.announced : null,
    status: clean(row?.status) || null,
    sources: Array.isArray(row?.sources) ? row.sources.map(clean).filter((v) => /^https?:\/\//i.test(v)) : [],
    occurrence_keys: [],
  };
}

const observances = {};
const suites = {};
const occurrenceRoutes = [];
const seen = new Set();
for (const row of rows) {
  const suite = seg(row?.suite);
  const festivalId = seg(row?.festival_id);
  const year = Number(row?.year);
  const main = iso(row?.main || row?.start_ad);
  const start = iso(row?.start_ad || row?.main);
  const end = iso(row?.end_ad || row?.main);
  if (!suite || !festivalId || !Number.isInteger(year) || year < 1900 || year > 2200 || !main) {
    throw new Error(`Invalid community_dates row: ${JSON.stringify(row)}`);
  }
  const festivalKey = `${suite}/${festivalId}`;
  if (!festivals[festivalKey]) throw new Error(`Missing community festival metadata: ${festivalKey}`);
  const key = `${festivalKey}/${year}/${main}`;
  if (seen.has(key)) throw new Error(`Duplicate community observance key: ${key}`);
  seen.add(key);
  observances[key] = {
    suite,
    festival_id: festivalId,
    year,
    main,
    start_ad: start || main,
    end_ad: end || main,
    region: clean(row?.region) || null,
    confidence: clean(row?.confidence) || null,
  };
  festivals[festivalKey].occurrence_keys.push(key);
  (suites[suite] ||= { festival_keys: [] });
  if (!suites[suite].festival_keys.includes(festivalKey)) suites[suite].festival_keys.push(festivalKey);
  const route = `/community-calendar/${suite}/${festivalId}/${year}/${main}`;
  if (isIndexableRoute(route)) occurrenceRoutes.push(route);
}

for (const festival of Object.values(festivals)) festival.occurrence_keys.sort();
for (const suite of Object.values(suites)) suite.festival_keys.sort();

const suiteRoutes = Object.keys(suites).sort().map((suite) => `/community-calendar/${suite}`).filter(isIndexableRoute);
const identityRoutes = Object.keys(festivals).sort().map((key) => `/community-calendar/${key}`).filter(isIndexableRoute);
const routes = [...new Set(["/community-calendar", ...suiteRoutes, ...identityRoutes, ...occurrenceRoutes])];
if (occurrenceRoutes.length !== expectedDates) throw new Error(`Community occurrence route coverage mismatch: ${occurrenceRoutes.length} != ${expectedDates}`);
if (routes.length < expectedDates + expectedFestivals) throw new Error(`Community route inventory unexpectedly small: ${routes.length}`);

const lastmod = (await snapshotDate("migration/data/public/community_dates.json", "migration/data/public/community_festivals.json")) || BUILD_DATE;
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, "community-calendar-index.json"), JSON.stringify({
  schema: 1,
  source_date: lastmod,
  count: occurrenceRoutes.length,
  identity_count: Object.keys(festivals).length,
  suite_count: Object.keys(suites).length,
  suites,
  festivals,
  observances,
}) + "\n", "utf8");
await writeFile(resolve(root, "public/sitemap-community-calendar.xml"), urlsetXml(routes.map((route) => ({ route, lastmod }))), "utf8");
await updateSitemapIndex(resolve(root, "public/sitemap.xml"), [{ file: "sitemap-community-calendar.xml", lastmod }]);

const manifestPath = resolve(root, "public/seo-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.sitemap_files = [...new Set([...(manifest.sitemap_files || []), "sitemap-community-calendar.xml"])];
manifest.indexed_community_calendar_route_count = routes.length;
manifest.community_observance_count = occurrenceRoutes.length;
manifest.community_festival_identity_count = Object.keys(festivals).length;
manifest.community_suite_count = Object.keys(suites).length;
manifest.community_calendar_index = `${SITE}/data/community-calendar-index.json`;

const calendarHubCount = Number(manifest.indexed_calendar_year_route_count || 0) * 13;
manifest.dynamic_indexable_route_count = Number(manifest.indexed_day_route_count || 0)
  + calendarHubCount
  + Number(manifest.indexed_history_event_route_count || 0)
  + Number(manifest.indexed_time_machine_route_count || 0)
  + Number(manifest.indexed_festival_route_count || 0)
  + Number(manifest.indexed_community_calendar_route_count || 0);
manifest.indexable_url_horizon = {
  minimum: 22500,
  actual: manifest.dynamic_indexable_route_count,
  day_routes: Number(manifest.indexed_day_route_count || 0),
  calendar_hubs: calendarHubCount,
  history_events: Number(manifest.indexed_history_event_route_count || 0),
  time_machine_events: Number(manifest.indexed_time_machine_route_count || 0),
  festival_routes: Number(manifest.indexed_festival_route_count || 0),
  community_calendar_routes: Number(manifest.indexed_community_calendar_route_count || 0),
};
if (manifest.dynamic_indexable_route_count < 22500) throw new Error(`Indexable URL horizon below 22,500: ${manifest.dynamic_indexable_route_count}`);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`Community calendar: ${occurrenceRoutes.length} factual observances + ${identityRoutes.length} festival identities + ${suiteRoutes.length} suite hubs + 1 hub = ${routes.length} routes.`);
console.log(`Indexable factual URL horizon: ${manifest.dynamic_indexable_route_count} (minimum 22,500).`);
