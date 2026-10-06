import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadCalendarSnapshot } from "./calendar-snapshot.mjs";

const root = process.cwd();
const graphPath = resolve(root, "public/publication-graph.json");
const communityDatesPath = resolve(root, "migration/data/public/community_dates.json");
const nsDaysRoot = resolve(root, "migration/data/public/ns_days");
const communityManifestPath = resolve(root, ".cloudflare/community-r2/manifest.json");
const calendarManifestPath = resolve(root, ".cloudflare/calendar-r2/manifest.json");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const PRIMARY_SUITES = ["lhosar", "tharu", "mithila", "kirat", "hijri"];
const month2 = (value) => String(Number(value)).padStart(2, "0");

async function walkJson(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes:true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkJson(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(path);
  }
  return out.sort();
}
function rowsOf(doc, table) {
  if (doc?.table !== table || !Array.isArray(doc?.rows)) throw new Error(`Invalid ${table} snapshot`);
  return doc.rows;
}

const graph = JSON.parse(await readFile(graphPath, "utf8"));
const communityManifest = JSON.parse(await readFile(communityManifestPath, "utf8"));
const calendarManifest = JSON.parse(await readFile(calendarManifestPath, "utf8"));
if (calendarManifest.row_count !== 77070) throw new Error(`Calendar manifest row_count ${calendarManifest.row_count} != 77070`);
if (!Array.isArray(communityManifest.primary_families) || communityManifest.primary_families.length !== 6) throw new Error("Community manifest must contain exactly six primary families");

const originalEntities = Array.isArray(graph.entities) ? graph.entities : [];
const existingDayRelations = new Map(originalEntities.filter((entity) => entity.type === "day").map((entity) => [entity.id, entity.relations || []]));
// Replace the old limited calendar window atomically. All non-calendar identities are retained.
const entities = originalEntities.filter((entity) => !["day","calendar-year","calendar-month","community-year"].includes(entity.type));
const ids = new Set(entities.map((entity) => entity.id));
const canonicals = new Set(entities.map((entity) => entity.canonical));

const calendarRows = (await loadCalendarSnapshot()).filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(String(row?.ad || "")) && Number.isInteger(Number(row?.bs?.year)) && Number.isInteger(Number(row?.bs?.month)) && Number.isInteger(Number(row?.bs?.day)));
if (calendarRows.length !== 77070) throw new Error(`Publication graph calendar rows ${calendarRows.length} != 77070`);
const byYear = new Map();
for (const row of calendarRows) {
  const year = Number(row.bs.year), month = Number(row.bs.month);
  if (!byYear.has(year)) byYear.set(year, new Map());
  const byMonth = byYear.get(year);
  if (!byMonth.has(month)) byMonth.set(month, []);
  byMonth.get(month).push(row);
}

for (const [year, byMonth] of [...byYear.entries()].sort(([a],[b])=>a-b)) {
  const yearId = `calendar-year:${year}`;
  const monthIds = [...byMonth.keys()].sort((a,b)=>a-b).map((month)=>`calendar-month:${year}-${month2(month)}`);
  entities.push({
    id:yearId,type:"calendar-year",canonical:`/calendar/${year}`,aliases:[],sourceRef:"validated-calendar-snapshot",sourceVersion:calendarManifest.source_version,
    coverageStatus:"archive-mapped",publicationStatus:"public",indexable:true,facts:{ bsYear:year, rowCount:[...byMonth.values()].reduce((n,rows)=>n+rows.length,0) },relations:monthIds,
  });
  ids.add(yearId); canonicals.add(`/calendar/${year}`);
  for (const [month, monthRows] of [...byMonth.entries()].sort(([a],[b])=>a-b)) {
    const monthId = `calendar-month:${year}-${month2(month)}`;
    const dayIds = monthRows.map((row)=>`day:${String(row.ad).slice(0,10)}`);
    entities.push({
      id:monthId,type:"calendar-month",canonical:`/calendar/${year}/${month2(month)}`,aliases:[],sourceRef:"validated-calendar-snapshot",sourceVersion:calendarManifest.source_version,
      coverageStatus:"archive-mapped",publicationStatus:"public",indexable:true,facts:{ bsYear:year, bsMonth:month, rowCount:monthRows.length },relations:[yearId,...dayIds],
    });
    ids.add(monthId); canonicals.add(`/calendar/${year}/${month2(month)}`);
  }
}
for (const row of calendarRows) {
  const ad = String(row.ad).slice(0,10), year=Number(row.bs.year), month=Number(row.bs.month), day=Number(row.bs.day);
  const id=`day:${ad}`;
  const carried=(existingDayRelations.get(id)||[]).filter((rel)=>String(rel).startsWith("festival-occurrence:"));
  entities.push({
    id,type:"day",canonical:`/date/${ad}`,aliases:[],sourceRef:"validated-calendar-snapshot",sourceVersion:calendarManifest.source_version,
    coverageStatus:"archive-mapped",publicationStatus:"public",indexable:true,facts:{ ad, bs:`${year}-${month2(month)}-${month2(day)}` },relations:[`calendar-year:${year}`,`calendar-month:${year}-${month2(month)}`,...carried].sort(),
  });
  ids.add(id); canonicals.add(`/date/${ad}`);
}

const communityDatesDoc = JSON.parse(await readFile(communityDatesPath, "utf8"));
const communityDates = rowsOf(communityDatesDoc, "community_dates");
const nsDays = [];
for (const file of await walkJson(nsDaysRoot)) nsDays.push(...rowsOf(JSON.parse(await readFile(file, "utf8")), "ns_days"));
const additions = [];
function addArchive({ family, year, route, sourceRef, rowCount, parentId }) {
  const id = `community-year:${family}:${year}`;
  if (ids.has(id) || canonicals.has(route)) throw new Error(`Community archive identity collision: ${id} ${route}`);
  if (!ids.has(parentId)) throw new Error(`Community archive parent missing: ${parentId}`);
  additions.push({
    id,type:"community-year",canonical:route,aliases:[],sourceRef,sourceVersion:communityManifest.source_version,
    coverageStatus:"archive-mapped",publicationStatus:"public",indexable:true,facts:{ family, year, rowCount },relations:[parentId],
  });
  ids.add(id); canonicals.add(route);
}
for (const suite of PRIMARY_SUITES) {
  const years = new Map();
  for (const row of communityDates) {
    if (row?.suite !== suite) continue;
    const year = Number(row?.year); if (!Number.isInteger(year)) continue;
    years.set(year, (years.get(year) || 0) + 1);
  }
  if (!years.size) throw new Error(`No community archive years for ${suite}`);
  for (const [year,rowCount] of [...years.entries()].sort(([a],[b])=>a-b)) addArchive({family:suite,year,route:`/samudaya/${suite}/${year}`,sourceRef:"community-dates-snapshot",rowCount,parentId:`community:${suite}`});
}
const nsByYear = new Map();
for (const row of nsDays) {
  const year = Number(row?.ns_year ?? row?.year); if (!Number.isInteger(year)) continue;
  nsByYear.set(year, (nsByYear.get(year) || 0) + 1);
}
if (!nsByYear.size) throw new Error("No Nepal Sambat archive years");
for (const [year,rowCount] of [...nsByYear.entries()].sort(([a],[b])=>a-b)) addArchive({family:"nepal-sambat",year,route:`/nepal-sambat/${year}`,sourceRef:"nepal-sambat-days-snapshot",rowCount,parentId:"community:mandala"});

for (const addition of additions) {
  const parent = entities.find((entity) => entity.id === addition.relations[0]);
  parent.relations = [...new Set([...(parent.relations || []), addition.id])].sort();
  entities.push(addition);
}
entities.sort((a,b) => String(a.id).localeCompare(String(b.id)));
graph.entities = entities;
graph.candidateWindow = null;
graph.indexedCalendarYears = [...byYear.keys()].sort((a,b)=>a-b);
graph.calendarArchivePolicy = { version:1, rowCount:77070, adStart:calendarManifest.ad_start, adEnd:calendarManifest.ad_end, sourceVersion:calendarManifest.source_version, runtime:"cloudflare-r2", d1NormalReadPath:false };
graph.communityArchivePolicy = { version:1, primaryFamilies:["nepal-sambat", ...PRIMARY_SUITES], aggregateOnly:["chakra"], sourceVersion:communityManifest.source_version, rule:"Publish source-backed year archives only; never synthesize community × day cross-products or fixed-offset native dates." };
graph.counts.total = entities.length;
graph.counts.indexable = entities.filter((entity) => entity.indexable).length;
graph.counts.candidate = entities.filter((entity) => entity.publicationStatus === "candidate").length;
graph.counts.days = calendarRows.length;
graph.counts.calendarYears = byYear.size;
graph.counts.calendarMonths = [...byYear.values()].reduce((n,months)=>n+months.size,0);
graph.counts.communityYears = additions.length;
graph.sourceDigest = sha(JSON.stringify(entities));
// Compact output keeps the 77k-day canonical graph below static single-file size limits.
await writeFile(graphPath, JSON.stringify(graph) + "\n", "utf8");
console.log(`Archive reconciliation: ${calendarRows.length} public calendar days, ${byYear.size} BS years, ${additions.length} community year archives across six primary families.`);
