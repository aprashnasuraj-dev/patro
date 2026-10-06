import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  COMMUNITY_ROUTES,
  INDEXED_CALENDAR_YEARS,
  SITE,
  TOOL_ROUTES,
  calendarRoute,
  calendarYearRoute,
  isIndexableRoute,
} from "./seo-config.mjs";
import { BUILD_DATE, snapshotDate, updateSitemapIndex, urlsetXml } from "./sitemap-utils.mjs";
import { loadCalendarSnapshot, loadHolidayMap } from "./calendar-snapshot.mjs";

const root = process.cwd();
const CANDIDATE_AD_START = 1996;
const CANDIDATE_AD_END = 2035;
const HISTORY_ROOT = resolve(root, "migration/data/public/on_this_day_events");
const indexedYears = new Set(INDEXED_CALENDAR_YEARS.map(Number));
const privatePrefixes = ["/me", "/admin", "/auth", "/api", "/compat-api", "/settings", "/family"];
// PR #78 (or an equivalent future implementation) provides deterministic source-backed
// festival HTML. Keep festival entities gated until that renderer actually exists in the
// combined checkout, so this graph never advertises unshipped routes.
const festivalPublishingEnabled = existsSync(resolve(root, "scripts/prerender-festivals.mjs"));

const cleanSlug = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9\p{L}-]+/gu, "-").replace(/^-+|-+$/g, "");
const adYear = (ad) => Number(String(ad || "").slice(0, 4));
const month2 = (value) => String(Number(value)).padStart(2, "0");
const stableHash = (value) => createHash("sha256").update(value).digest("hex");

async function walkJson(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes:true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkJson(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(path);
  }
  return out.sort();
}

function historyDateParts(row) {
  const text = [row?.ad_date, row?.ad, row?.date].find((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value));
  const parsed = text ? String(text).slice(0, 10).split("-").map(Number) : [null, null, null];
  const month = Number(row?.ad_month ?? row?.month ?? parsed[1]);
  const day = Number(row?.ad_day ?? row?.day ?? parsed[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error(`Invalid history month for ${row?.id || "unknown"}`);
  const maxDay = new Date(Date.UTC(2000, month, 0)).getUTCDate();
  if (!Number.isInteger(day) || day < 1 || day > maxDay) throw new Error(`Invalid history day for ${row?.id || "unknown"}`);
  return { month, day };
}

async function loadHistoryRows() {
  if (!existsSync(HISTORY_ROOT)) return [];
  const rows = [];
  for (const file of await walkJson(HISTORY_ROOT)) {
    const doc = JSON.parse(await readFile(file, "utf8"));
    if (doc?.table !== "on_this_day_events" || !Array.isArray(doc?.rows)) throw new Error(`Invalid On This Day snapshot: ${file}`);
    rows.push(...doc.rows);
  }
  return rows;
}

const rows = await loadCalendarSnapshot();
const holidays = await loadHolidayMap();
const historyRows = await loadHistoryRows();
const candidateRows = rows.filter((row) => {
  const year = adYear(row.ad);
  return year >= CANDIDATE_AD_START && year <= CANDIDATE_AD_END;
});
const byAd = new Map(candidateRows.map((row) => [String(row.ad).slice(0, 10), row]));

const entities = [];
const relationsByDay = new Map();

function add(entity) {
  entities.push({
    aliases: [],
    relations: [],
    ...entity,
  });
}

for (const row of candidateRows) {
  const ad = String(row.ad).slice(0, 10);
  const bsYear = Number(row.bs?.year);
  const bsMonth = Number(row.bs?.month);
  const bsDay = Number(row.bs?.day);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ad) || !Number.isInteger(bsYear) || !Number.isInteger(bsMonth) || !Number.isInteger(bsDay)) continue;
  const indexable = indexedYears.has(bsYear);
  const relations = [
    `calendar-year:${bsYear}`,
    `calendar-month:${bsYear}-${month2(bsMonth)}`,
  ];
  relationsByDay.set(ad, relations);
  add({
    id: `day:${ad}`,
    type: "day",
    canonical: `/date/${ad}`,
    sourceRef: "validated-calendar-snapshot",
    sourceVersion: String(row.source_version || row.version || "repository-calendar-snapshot"),
    coverageStatus: "core-mapped",
    publicationStatus: indexable ? "public" : "candidate",
    indexable,
    facts: { ad, bs: `${bsYear}-${month2(bsMonth)}-${month2(bsDay)}` },
    relations,
  });
}

const calendarYears = [...new Set(candidateRows.map((row) => Number(row.bs?.year)).filter(Number.isInteger))].sort((a,b) => a-b);
for (const year of calendarYears) {
  const indexable = indexedYears.has(year);
  add({
    id: `calendar-year:${year}`,
    type: "calendar-year",
    canonical: calendarYearRoute(year),
    sourceRef: "validated-calendar-snapshot",
    sourceVersion: "repository-calendar-snapshot",
    coverageStatus: "mapped",
    publicationStatus: indexable ? "public" : "candidate",
    indexable,
  });
  for (let month = 1; month <= 12; month++) {
    const hasMonth = candidateRows.some((row) => Number(row.bs?.year) === year && Number(row.bs?.month) === month);
    if (!hasMonth) continue;
    add({
      id: `calendar-month:${year}-${month2(month)}`,
      type: "calendar-month",
      canonical: calendarRoute(year, month),
      sourceRef: "validated-calendar-snapshot",
      sourceVersion: "repository-calendar-snapshot",
      coverageStatus: "mapped",
      publicationStatus: indexable ? "public" : "candidate",
      indexable,
      relations: [`calendar-year:${year}`],
    });
  }
}

const festivals = new Map();
for (const [ad, items] of holidays.entries()) {
  const row = byAd.get(ad);
  if (!row) continue;
  const bsYear = Number(row.bs?.year);
  for (const item of items) {
    const slug = cleanSlug(item.slug);
    if (!slug) continue;
    const festival = festivals.get(slug) || { slug, names:new Set(), occurrences:new Map() };
    if (item.name) festival.names.add(String(item.name));
    const occurrence = festival.occurrences.get(bsYear) || { dates:new Set(), sources:new Set() };
    occurrence.dates.add(ad);
    if (item.source) occurrence.sources.add(String(item.source));
    festival.occurrences.set(bsYear, occurrence);
    festivals.set(slug, festival);
    relationsByDay.get(ad)?.push(`festival-occurrence:${slug}:${bsYear}`);
  }
}

for (const festival of [...festivals.values()].sort((a,b) => a.slug.localeCompare(b.slug))) {
  const occurrenceIds = [...festival.occurrences.keys()].sort((a,b)=>a-b).map((year) => `festival-occurrence:${festival.slug}:${year}`);
  add({
    id: `festival:${festival.slug}`,
    type: "festival",
    canonical: `/festivals/${festival.slug}`,
    sourceRef: "validated-holiday-map",
    sourceVersion: "repository-holiday-snapshot",
    coverageStatus: "source-backed",
    publicationStatus: festivalPublishingEnabled ? "public" : "candidate",
    indexable: festivalPublishingEnabled,
    label: [...festival.names][0] || festival.slug,
    relations: occurrenceIds,
  });
  for (const [year, occurrence] of [...festival.occurrences.entries()].sort(([a],[b])=>a-b)) {
    const dates = [...occurrence.dates].sort();
    add({
      id: `festival-occurrence:${festival.slug}:${year}`,
      type: "festival-occurrence",
      canonical: `/festivals/${festival.slug}/${year}`,
      sourceRef: "validated-holiday-map",
      sourceVersion: stableHash(JSON.stringify({ dates, sources:[...occurrence.sources].sort() })).slice(0, 16),
      coverageStatus: "source-backed",
      publicationStatus: festivalPublishingEnabled ? "public" : "candidate",
      indexable: festivalPublishingEnabled,
      facts: { bsYear: year, dates },
      relations: [`festival:${festival.slug}`, ...dates.map((date) => `day:${date}`)],
    });
  }
}

// History gets stable identities in the graph now, but no new indexable pages are emitted here.
// This lets a later renderer publish only evidence-qualified records without changing identity,
// while the current /on-this-day feature continues to use its existing packaged/R2 archive.
const historyEventsByDay = new Map();
const normalizedHistory = historyRows.map((row) => {
  const id = String(row?.id || "").trim();
  if (!id) throw new Error("On This Day record missing stable id");
  const { month, day } = historyDateParts(row);
  const mmdd = `${month2(month)}-${month2(day)}`;
  const eventId = `history-event:${id}`;
  const list = historyEventsByDay.get(mmdd) || [];
  list.push(eventId);
  historyEventsByDay.set(mmdd, list);
  return { row, id, month, day, mmdd, eventId };
});
const historyDatasetVersion = stableHash(JSON.stringify(normalizedHistory.map(({ id, mmdd, row }) => [id, mmdd, row?.year ?? null, row?.updated_at ?? null]))).slice(0, 24);

const leapStart = Date.UTC(2000, 0, 1);
const leapEnd = Date.UTC(2000, 11, 31);
for (let time = leapStart; time <= leapEnd; time += 86_400_000) {
  const date = new Date(time);
  const mmdd = `${month2(date.getUTCMonth() + 1)}-${month2(date.getUTCDate())}`;
  add({
    id: `history-day:${mmdd}`,
    type: "history-day",
    canonical: `/on-this-day/${mmdd}`,
    sourceRef: "on-this-day-snapshot",
    sourceVersion: historyDatasetVersion || "empty-history-snapshot",
    coverageStatus: "archive-mapped",
    publicationStatus: "candidate",
    indexable: false,
    facts: { monthDay:mmdd, eventCount:(historyEventsByDay.get(mmdd) || []).length },
    relations: [...(historyEventsByDay.get(mmdd) || [])].sort(),
  });
}

for (const { row, id, mmdd, eventId } of normalizedHistory.sort((a,b) => a.eventId.localeCompare(b.eventId))) {
  const sourceUrl = typeof row?.source_url === "string" && /^https?:\/\//i.test(row.source_url) ? row.source_url : null;
  const eventYear = Number(row?.year);
  const versionPayload = {
    id,
    mmdd,
    year:Number.isFinite(eventYear) ? eventYear : null,
    sourceUrl,
    updatedAt:row?.updated_at || null,
  };
  add({
    id: eventId,
    type: "history-event",
    canonical: `/on-this-day/event/${encodeURIComponent(id)}`,
    sourceRef: "on-this-day-snapshot",
    sourceVersion: stableHash(JSON.stringify(versionPayload)).slice(0, 16),
    coverageStatus: sourceUrl ? "source-cited" : "archive-record",
    publicationStatus: "candidate",
    indexable: false,
    facts: {
      monthDay:mmdd,
      year:Number.isFinite(eventYear) ? eventYear : null,
      sourceCited:Boolean(sourceUrl),
    },
    relations: [`history-day:${mmdd}`],
  });
}

for (const route of COMMUNITY_ROUTES) {
  const slug = route.split("/").filter(Boolean).at(-1) || "community";
  add({
    id: `community:${slug}`,
    type: "community",
    canonical: route,
    sourceRef: "community-route-registry",
    sourceVersion: "repository-route-registry",
    coverageStatus: "registered",
    publicationStatus: "public",
    indexable: true,
  });
}

for (const route of TOOL_ROUTES) {
  const slug = route.split("/").filter(Boolean).at(-1) || "tool";
  add({
    id: `tool:${slug}`,
    type: "tool",
    canonical: route,
    sourceRef: "tool-route-registry",
    sourceVersion: "repository-route-registry",
    coverageStatus: "registered",
    publicationStatus: "public",
    indexable: true,
  });
}

for (const entity of entities) {
  if (entity.type === "day") entity.relations = [...new Set(relationsByDay.get(entity.facts.ad) || entity.relations)].sort();
  else entity.relations = [...new Set(entity.relations || [])].sort();
}
entities.sort((a,b) => a.id.localeCompare(b.id));

const canonicalPayload = JSON.stringify(entities);
const graph = {
  schemaVersion: 1,
  identityPolicy: "Stable entity IDs are independent of display state. Equivalent UI state is not a new public entity.",
  privacyPolicy: "Private notes, letters, uploads, account state, saved results and arbitrary filters are excluded.",
  candidateWindow: { adStart: CANDIDATE_AD_START, adEnd: CANDIDATE_AD_END },
  indexedCalendarYears: [...indexedYears].sort((a,b)=>a-b),
  privatePrefixes,
  festivalPublishingEnabled,
  historyPublishingEnabled:false,
  sourceDigest: stableHash(canonicalPayload),
  counts: {
    total: entities.length,
    indexable: entities.filter((entity) => entity.indexable).length,
    candidate: entities.filter((entity) => entity.publicationStatus === "candidate").length,
    days: entities.filter((entity) => entity.type === "day").length,
    festivalIdentities: entities.filter((entity) => entity.type === "festival").length,
    festivalOccurrences: entities.filter((entity) => entity.type === "festival-occurrence").length,
    historyDays: entities.filter((entity) => entity.type === "history-day").length,
    historyEvents: entities.filter((entity) => entity.type === "history-event").length,
    historyEventsWithSource: entities.filter((entity) => entity.type === "history-event" && entity.facts?.sourceCited).length,
    tools: entities.filter((entity) => entity.type === "tool").length,
    communities: entities.filter((entity) => entity.type === "community").length,
  },
  entities,
};

await mkdir(resolve(root, "public"), { recursive:true });
await writeFile(resolve(root, "public/publication-graph.json"), JSON.stringify(graph, null, 2) + "\n", "utf8");

if (festivalPublishingEnabled) {
  const festivalRoutes = [...new Set(entities
    .filter((entity) => entity.indexable && (entity.type === "festival" || entity.type === "festival-occurrence"))
    .map((entity) => entity.canonical)
    .filter((route) => isIndexableRoute(route)))];
  // Every festival URL is a self-canonical, index,follow prerender (verified in verify-seo-build.mjs).
  await writeFile(resolve(root, "public/sitemap-festivals.xml"), urlsetXml(festivalRoutes), "utf8");

  const festivalLastmod = (await snapshotDate("migration/data/public/holidays.json", "migration/data/public/official_panchang_facts.json")) || BUILD_DATE;
  await updateSitemapIndex(resolve(root, "public/sitemap.xml"), [{ file:"sitemap-festivals.xml", lastmod:festivalLastmod }]);

  const seoManifestPath = resolve(root, "public/seo-manifest.json");
  const seoManifest = JSON.parse(await readFile(seoManifestPath, "utf8"));
  seoManifest.sitemap_files = [...new Set([...(seoManifest.sitemap_files || []), "sitemap-festivals.xml"])];
  seoManifest.indexed_festival_route_count = festivalRoutes.length;
  seoManifest.publication_graph = `${SITE}/publication-graph.json`;
  await writeFile(seoManifestPath, JSON.stringify(seoManifest, null, 2) + "\n", "utf8");
}

console.log(`Publication graph: ${graph.counts.total} entities (${graph.counts.days} calendar days; ${graph.counts.historyEvents} history events; ${graph.counts.indexable} indexable, ${graph.counts.candidate} gated candidates; festival publishing ${festivalPublishingEnabled ? "enabled" : "gated"}).`);
