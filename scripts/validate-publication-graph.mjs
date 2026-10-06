import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const graph = JSON.parse(await readFile(resolve(root, "public/publication-graph.json"), "utf8"));
const entities = Array.isArray(graph.entities) ? graph.entities : [];
if (graph.schemaVersion !== 1) throw new Error(`Unsupported publication graph schema: ${graph.schemaVersion}`);
if (entities.length < 19_000) throw new Error(`Publication graph unexpectedly small after history identity mapping: ${entities.length}`);
if (Number(graph.counts?.days || 0) < 14_000) throw new Error(`Expected a 1996-2035 mapped day candidate cohort; got ${graph.counts?.days || 0}`);
if (Number(graph.counts?.historyDays || 0) !== 366) throw new Error(`Expected 366 reusable month/day history identities; got ${graph.counts?.historyDays || 0}`);
if (Number(graph.counts?.historyEvents || 0) !== 5454) throw new Error(`Expected all 5,454 canonical On This Day records; got ${graph.counts?.historyEvents || 0}`);
if (graph.historyPublishingEnabled !== false) throw new Error("History event/day candidates must remain non-published until a dedicated renderer is gated");

const ids = new Set();
const canonicals = new Map();
const aliases = new Map();
const forbidden = graph.privatePrefixes || ["/me", "/admin", "/auth", "/api", "/compat-api"];
let previousId = "";

function validIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const [y,m,d] = String(value).split("-").map(Number);
  const check = new Date(Date.UTC(y,m-1,d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m-1 && check.getUTCDate() === d;
}

function validMonthDay(value) {
  if (!/^\d{2}-\d{2}$/.test(String(value))) return false;
  const [month, day] = String(value).split("-").map(Number);
  if (month < 1 || month > 12) return false;
  const maxDay = new Date(Date.UTC(2000, month, 0)).getUTCDate();
  return day >= 1 && day <= maxDay;
}

for (const entity of entities) {
  if (!entity || typeof entity !== "object") throw new Error("Entity must be an object");
  for (const field of ["id","type","canonical","sourceRef","sourceVersion","coverageStatus","publicationStatus"]) {
    if (!String(entity[field] || "").trim()) throw new Error(`Entity ${entity.id || "<unknown>"} missing ${field}`);
  }
  if (ids.has(entity.id)) throw new Error(`Duplicate entity id: ${entity.id}`);
  ids.add(entity.id);
  if (previousId && previousId.localeCompare(entity.id) > 0) throw new Error(`Entity graph is not deterministically sorted: ${previousId} before ${entity.id}`);
  previousId = entity.id;

  if (!entity.canonical.startsWith("/") || entity.canonical.includes("?") || entity.canonical.includes("#")) {
    throw new Error(`Invalid canonical for ${entity.id}: ${entity.canonical}`);
  }
  if (forbidden.some((prefix) => entity.canonical === prefix || entity.canonical.startsWith(prefix + "/"))) {
    throw new Error(`Private/machine route emitted as public entity: ${entity.canonical}`);
  }
  if (canonicals.has(entity.canonical)) throw new Error(`Canonical collision: ${entity.canonical} used by ${canonicals.get(entity.canonical)} and ${entity.id}`);
  canonicals.set(entity.canonical, entity.id);

  if (entity.indexable && entity.publicationStatus !== "public") {
    throw new Error(`Indexable entity is not public: ${entity.id}`);
  }
  if (entity.type === "day") {
    const ad = entity.facts?.ad;
    if (!validIsoDate(ad)) throw new Error(`Invalid day date: ${entity.id}`);
    if (entity.id !== `day:${ad}` || entity.canonical !== `/date/${ad}`) throw new Error(`Day identity/canonical mismatch: ${entity.id}`);
  }
  if (entity.type === "history-day") {
    const monthDay = entity.facts?.monthDay;
    if (!validMonthDay(monthDay)) throw new Error(`Invalid history month/day: ${entity.id}`);
    if (entity.id !== `history-day:${monthDay}` || entity.canonical !== `/on-this-day/${monthDay}`) throw new Error(`History-day identity/canonical mismatch: ${entity.id}`);
    if (entity.indexable || entity.publicationStatus !== "candidate") throw new Error(`History-day published before renderer gate: ${entity.id}`);
  }
  if (entity.type === "history-event") {
    const stableId = entity.id.slice("history-event:".length);
    const monthDay = entity.facts?.monthDay;
    if (!stableId || !validMonthDay(monthDay)) throw new Error(`Invalid history event identity: ${entity.id}`);
    if (entity.canonical !== `/on-this-day/event/${encodeURIComponent(stableId)}`) throw new Error(`History-event canonical mismatch: ${entity.id}`);
    if (entity.indexable || entity.publicationStatus !== "candidate") throw new Error(`History event published before evidence/render gate: ${entity.id}`);
    if (!(entity.relations || []).includes(`history-day:${monthDay}`)) throw new Error(`History event missing month/day relation: ${entity.id}`);
  }

  for (const alias of entity.aliases || []) {
    if (typeof alias !== "string" || !alias.startsWith("/") || alias.includes("?") || alias.includes("#")) throw new Error(`Invalid alias on ${entity.id}`);
    if (aliases.has(alias)) throw new Error(`Alias collision: ${alias}`);
    aliases.set(alias, entity.id);
  }
}

for (const [alias, entityId] of aliases) {
  if (canonicals.has(alias) && canonicals.get(alias) !== entityId) throw new Error(`Alias ${alias} collides with canonical of ${canonicals.get(alias)}`);
}

for (const entity of entities) {
  for (const relation of entity.relations || []) {
    if (!ids.has(relation)) throw new Error(`Broken relation from ${entity.id} to ${relation}`);
  }
}

const publicTools = entities.filter((entity) => entity.type === "tool" && entity.publicationStatus === "public");
const candidateTools = entities.filter((entity) => entity.type === "tool" && entity.publicationStatus === "candidate");
if (publicTools.length !== 29 || Number(graph.counts?.publicTools || 0) !== 29) {
  throw new Error(`Observed canonical public tool baseline changed: entities=${publicTools.length}, count=${graph.counts?.publicTools}`);
}
if (candidateTools.length !== 4 || Number(graph.counts?.candidateTools || 0) !== 4 || Number(graph.counts?.tools || 0) !== 33) {
  throw new Error(`33-tool identity reconciliation changed: total=${graph.counts?.tools}, public=${publicTools.length}, candidates=${candidateTools.length}`);
}
const expectedToolCandidates = ["tool:api", "tool:card", "tool:diaspora", "tool:tithi"];
const actualToolCandidates = candidateTools.map((entity) => entity.id).sort();
if (JSON.stringify(actualToolCandidates) !== JSON.stringify(expectedToolCandidates)) {
  throw new Error(`Unexpected gated tool identities: ${actualToolCandidates.join(",")}`);
}
for (const entity of candidateTools) {
  if (entity.indexable || entity.coverageStatus !== "legacy-source-identity" || entity.sourceRef !== "migration-tool-catalog") {
    throw new Error(`Gated tool escaped reconciliation policy: ${entity.id}`);
  }
}
if (Number(graph.counts?.communities || 0) < 6) throw new Error(`Expected all six community hubs; got ${graph.counts?.communities}`);
if (!(Number(graph.counts?.historyEventsWithSource || 0) > 0)) throw new Error("History source-evidence classification unexpectedly empty");

console.log(`Publication graph valid: ${entities.length} entities; ${graph.counts.indexable} indexable; ${graph.counts.candidate} candidates; ${graph.counts.historyEvents} history events; ${publicTools.length}+${candidateTools.length} tool identities; ${graph.counts.communities} communities.`);
