import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = process.cwd();
const graphPath = resolve(root, "public/publication-graph.json");
const historyRoot = resolve(root, "migration/data/public/on_this_day_events");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const safeHttp = (value) => typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : "";
const titleOf = (row) => String(row?.title_ne || row?.title_en || row?.event_ne || row?.event_en || row?.title || row?.name || "").trim();
const yearOf = (row) => {
  const year = Number(row?.ad_year ?? row?.year);
  return Number.isInteger(year) ? year : null;
};
const verificationOf = (row) => String(row?.verification_status || "").trim().toLowerCase() || "unverified";
const normalizeTitle = (value) => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\p{P}\p{S}]+/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

async function walkJson(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkJson(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(path);
  }
  return out.sort();
}

async function loadRows() {
  if (!existsSync(historyRoot)) return [];
  const rows = [];
  for (const file of await walkJson(historyRoot)) {
    const doc = JSON.parse(await readFile(file, "utf8"));
    if (doc?.table !== "on_this_day_events" || !Array.isArray(doc?.rows)) throw new Error(`Invalid On This Day snapshot: ${file}`);
    rows.push(...doc.rows);
  }
  return rows;
}

function dispositionFor({ verificationStatus, sourceUrl, title, duplicateOf }) {
  // User-facing archive policy: unverified records stay visible and are explicitly marked
  // as needing further verification. They are never dropped merely because a source is absent.
  if (verificationStatus === "unverified" || !sourceUrl) return "needs-source";
  if (duplicateOf) return "duplicate";
  if (!title) return "uncertain";
  if (verificationStatus === "source-backed") return "publishable";
  return "uncertain";
}

const graph = JSON.parse(await readFile(graphPath, "utf8"));
const rows = await loadRows();
const entities = Array.isArray(graph.entities) ? graph.entities : [];
const historyEntities = entities.filter((entity) => entity?.type === "history-event");
if (rows.length !== historyEntities.length) throw new Error(`History evidence row/entity mismatch: rows=${rows.length}, entities=${historyEntities.length}`);

const rowById = new Map();
for (const row of rows) {
  const id = String(row?.id || "").trim();
  if (!id || rowById.has(id)) throw new Error(`Missing/duplicate history record id: ${id || "<empty>"}`);
  rowById.set(id, row);
}

const duplicateOwner = new Map();
const duplicateOfById = new Map();
for (const row of [...rows].sort((a, b) => String(a?.id || "").localeCompare(String(b?.id || "")))) {
  const id = String(row.id);
  const title = normalizeTitle(titleOf(row));
  if (!title) continue;
  const month = Number(row?.ad_month ?? row?.month);
  const day = Number(row?.ad_day ?? row?.day);
  const year = yearOf(row);
  const type = String(row?.event_type || "").trim().toLowerCase();
  const key = [month, day, year ?? "", type, title].join("|");
  if (!duplicateOwner.has(key)) duplicateOwner.set(key, id);
  else duplicateOfById.set(id, duplicateOwner.get(key));
}

const counts = { publishable: 0, "needs-source": 0, duplicate: 0, uncertain: 0 };
let sourceBacked = 0;
let unverified = 0;
let withSource = 0;

for (const entity of historyEntities) {
  const id = String(entity.id).slice("history-event:".length);
  const row = rowById.get(id);
  if (!row) throw new Error(`History graph entity has no source record: ${entity.id}`);
  const verificationStatus = verificationOf(row);
  const sourceUrl = safeHttp(row?.source_url);
  const title = titleOf(row);
  const year = yearOf(row);
  const duplicateOf = duplicateOfById.get(id) || null;
  const evidenceDisposition = dispositionFor({ verificationStatus, sourceUrl, title, duplicateOf });
  counts[evidenceDisposition]++;
  if (verificationStatus === "source-backed") sourceBacked++;
  if (verificationStatus === "unverified") unverified++;
  if (sourceUrl) withSource++;

  entity.coverageStatus = evidenceDisposition === "publishable" ? "source-cited" : evidenceDisposition;
  entity.facts = {
    ...(entity.facts || {}),
    year,
    sourceCited: Boolean(sourceUrl),
    verificationStatus,
    evidenceDisposition,
    needsFurtherVerification: verificationStatus === "unverified" || !sourceUrl,
    duplicateOf: duplicateOf ? `history-event:${duplicateOf}` : null,
  };
  entity.sourceVersion = sha(JSON.stringify({
    id,
    monthDay: entity.facts.monthDay,
    year,
    verificationStatus,
    evidenceDisposition,
    sourceUrl: sourceUrl || null,
    duplicateOf,
    updatedAt: row?.updated_at || null,
  })).slice(0, 16);
}

graph.historyEvidencePolicy = {
  version: 1,
  rule: "Keep every canonical archive record visible. Records marked unverified or lacking a valid HTTP(S) source are labeled 'Needs further verification'; they are not hidden or deleted.",
  dispositions: ["publishable", "needs-source", "duplicate", "uncertain"],
  individualEventPagesPublished: false,
};
graph.counts.historyEventsWithSource = withSource;
graph.counts.historySourceBacked = sourceBacked;
graph.counts.historyNeedsFurtherVerification = unverified;
graph.counts.historyEvidence = counts;
graph.sourceDigest = sha(JSON.stringify(entities));

await writeFile(graphPath, JSON.stringify(graph, null, 2) + "\n", "utf8");
console.log(`History evidence classified: ${rows.length} total; ${sourceBacked} source-backed; ${unverified} needs further verification; dispositions=${JSON.stringify(counts)}.`);
