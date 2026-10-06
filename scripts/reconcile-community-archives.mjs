import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = process.cwd();
const graphPath = resolve(root, "public/publication-graph.json");
const communityDatesPath = resolve(root, "migration/data/public/community_dates.json");
const nsDaysRoot = resolve(root, "migration/data/public/ns_days");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const PRIMARY_SUITES = ["lhosar", "tharu", "mithila", "kirat", "hijri"];

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
const entities = Array.isArray(graph.entities) ? graph.entities : [];
const ids = new Set(entities.map((entity) => entity.id));
const canonicals = new Set(entities.map((entity) => entity.canonical));
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
    id,
    type:"community-year",
    canonical:route,
    aliases:[],
    sourceRef,
    sourceVersion:sha(`${family}|${year}|${rowCount}`).slice(0,16),
    coverageStatus:"archive-mapped",
    publicationStatus:"public",
    indexable:true,
    facts:{ family, year, rowCount },
    relations:[parentId],
  });
  ids.add(id); canonicals.add(route);
}

for (const suite of PRIMARY_SUITES) {
  const byYear = new Map();
  for (const row of communityDates) {
    if (row?.suite !== suite) continue;
    const year = Number(row?.year);
    if (!Number.isInteger(year)) continue;
    byYear.set(year, (byYear.get(year) || 0) + 1);
  }
  if (!byYear.size) throw new Error(`No community archive years for ${suite}`);
  for (const [year, rowCount] of [...byYear.entries()].sort(([a],[b]) => a-b)) {
    addArchive({ family:suite, year, route:`/samudaya/${suite}/${year}`, sourceRef:"community-dates-snapshot", rowCount, parentId:`community:${suite}` });
  }
}

const nsByYear = new Map();
for (const row of nsDays) {
  const year = Number(row?.ns_year ?? row?.year);
  if (!Number.isInteger(year)) continue;
  nsByYear.set(year, (nsByYear.get(year) || 0) + 1);
}
if (!nsByYear.size) throw new Error("No Nepal Sambat archive years");
for (const [year, rowCount] of [...nsByYear.entries()].sort(([a],[b]) => a-b)) {
  addArchive({ family:"nepal-sambat", year, route:`/nepal-sambat/${year}`, sourceRef:"nepal-sambat-days-snapshot", rowCount, parentId:"community:mandala" });
}

for (const addition of additions) {
  const parentId = addition.relations[0];
  const parent = entities.find((entity) => entity.id === parentId);
  parent.relations = [...new Set([...(parent.relations || []), addition.id])].sort();
  entities.push(addition);
}
entities.sort((a,b) => String(a.id).localeCompare(String(b.id)));
graph.entities = entities;
graph.communityArchivePolicy = {
  version:1,
  primaryFamilies:["nepal-sambat", ...PRIMARY_SUITES],
  aggregateOnly:["chakra"],
  rule:"Publish source-backed year archives only; never synthesize community × day cross-products or fixed-offset native dates.",
};
graph.counts.total = entities.length;
graph.counts.indexable = entities.filter((entity) => entity.indexable).length;
graph.counts.candidate = entities.filter((entity) => entity.publicationStatus === "candidate").length;
graph.counts.communityYears = additions.length;
graph.sourceDigest = sha(JSON.stringify(entities));
await writeFile(graphPath, JSON.stringify(graph, null, 2) + "\n", "utf8");
console.log(`Community archive reconciliation: ${additions.length} public year archives across six primary families.`);
