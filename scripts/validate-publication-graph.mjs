import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const graph = JSON.parse(await readFile(resolve(root, "public/publication-graph.json"), "utf8"));
const entities = Array.isArray(graph.entities) ? graph.entities : [];
if (graph.schemaVersion !== 1) throw new Error(`Unsupported publication graph schema: ${graph.schemaVersion}`);
if (entities.length < 10_000) throw new Error(`Publication graph unexpectedly small: ${entities.length}`);
if (Number(graph.counts?.days || 0) < 14_000) throw new Error(`Expected a 1996-2035 mapped day candidate cohort; got ${graph.counts?.days || 0}`);

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

if (Number(graph.counts?.tools || 0) !== 29) {
  throw new Error(`Canonical tool registry changed from the verified 29-tool baseline: ${graph.counts?.tools}`);
}
if (Number(graph.counts?.communities || 0) < 6) throw new Error(`Expected all six community hubs; got ${graph.counts?.communities}`);

console.log(`Publication graph valid: ${entities.length} entities; ${graph.counts.indexable} indexable; ${graph.counts.candidate} candidates; ${graph.counts.tools} tools; ${graph.counts.communities} communities.`);
