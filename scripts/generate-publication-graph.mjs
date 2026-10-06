import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  COMMUNITY_ROUTES,
  INDEXED_CALENDAR_YEARS,
  TOOL_ROUTES,
  calendarRoute,
  calendarYearRoute,
} from "./seo-config.mjs";
import { loadCalendarSnapshot, loadHolidayMap } from "./calendar-snapshot.mjs";

const root = process.cwd();
const CANDIDATE_AD_START = 1996;
const CANDIDATE_AD_END = 2035;
const indexedYears = new Set(INDEXED_CALENDAR_YEARS.map(Number));
const privatePrefixes = ["/me", "/admin", "/auth", "/api", "/compat-api", "/settings", "/family"];

const cleanSlug = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9\p{L}-]+/gu, "-").replace(/^-+|-+$/g, "");
const adYear = (ad) => Number(String(ad || "").slice(0, 4));
const month2 = (value) => String(Number(value)).padStart(2, "0");
const stableHash = (value) => createHash("sha256").update(value).digest("hex");

const rows = await loadCalendarSnapshot();
const holidays = await loadHolidayMap();
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
    publicationStatus: "candidate",
    indexable: false,
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
      publicationStatus: "candidate",
      indexable: false,
      facts: { bsYear: year, dates },
      relations: [`festival:${festival.slug}`, ...dates.map((date) => `day:${date}`)],
    });
  }
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
  sourceDigest: stableHash(canonicalPayload),
  counts: {
    total: entities.length,
    indexable: entities.filter((entity) => entity.indexable).length,
    candidate: entities.filter((entity) => entity.publicationStatus === "candidate").length,
    days: entities.filter((entity) => entity.type === "day").length,
    festivalIdentities: entities.filter((entity) => entity.type === "festival").length,
    festivalOccurrences: entities.filter((entity) => entity.type === "festival-occurrence").length,
    tools: entities.filter((entity) => entity.type === "tool").length,
    communities: entities.filter((entity) => entity.type === "community").length,
  },
  entities,
};

await mkdir(resolve(root, "public"), { recursive:true });
await writeFile(resolve(root, "public/publication-graph.json"), JSON.stringify(graph, null, 2) + "\n", "utf8");
console.log(`Publication graph: ${graph.counts.total} entities (${graph.counts.days} days; ${graph.counts.indexable} indexable, ${graph.counts.candidate} gated candidates).`);
