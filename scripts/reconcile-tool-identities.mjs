import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const graphPath = resolve(root, "public/publication-graph.json");
const catalogPath = resolve(root, "migration/data/public/tool_catalog.json");
const graph = JSON.parse(await readFile(graphPath, "utf8"));
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const entities = Array.isArray(graph.entities) ? graph.entities : [];
const catalogRows = Array.isArray(catalog?.rows) ? catalog.rows : [];
const sha = (value) => createHash("sha256").update(value).digest("hex");

const existingToolSlugs = new Set(
  entities
    .filter((entity) => entity?.type === "tool" && entity?.publicationStatus === "public")
    .map((entity) => String(entity.id || "").replace(/^tool:/, "")),
);

// The public /tools inspection found 29 canonical tools. The checked-in tool catalog also
// carries older/source-backed identities that are not part of that public 29. Reconcile only
// enabled, non-private, non-hub /tools identities here. They remain candidate-only until a
// distinct working public task survives parity review; this prevents inflating the count with
// aliases, private surfaces or invented names.
const candidateRows = catalogRows.filter((row) => {
  const slug = String(row?.slug || "").trim();
  const target = String(row?.target_path || "").trim();
  if (!slug || row?.enabled !== true || existingToolSlugs.has(slug)) return false;
  if (!target.startsWith("/tools/")) return false;
  if (row?.metadata?.private === true || row?.metadata?.kind === "hub") return false;
  return true;
});

const expectedCandidates = ["api", "card", "diaspora", "tithi"];
const actualCandidates = candidateRows.map((row) => String(row.slug)).sort();
if (JSON.stringify(actualCandidates) !== JSON.stringify(expectedCandidates)) {
  throw new Error(`Tool identity reconciliation changed: expected ${expectedCandidates.join(",")}; got ${actualCandidates.join(",")}`);
}

const byId = new Map(entities.map((entity) => [entity.id, entity]));
const byCanonical = new Map(entities.map((entity) => [entity.canonical, entity.id]));
for (const row of candidateRows) {
  const slug = String(row.slug);
  const id = `tool:${slug}`;
  const canonical = String(row.target_path);
  if (byId.has(id)) throw new Error(`Tool identity already exists: ${id}`);
  if (byCanonical.has(canonical)) throw new Error(`Candidate tool canonical collides with ${byCanonical.get(canonical)}: ${canonical}`);
  const sourceVersion = sha(JSON.stringify({
    tool_id:row.tool_id,
    slug,
    target_path:canonical,
    title:row.title,
    updated_at:row.updated_at,
  })).slice(0, 16);
  entities.push({
    id,
    type:"tool",
    canonical,
    aliases:[],
    sourceRef:"migration-tool-catalog",
    sourceVersion,
    coverageStatus:"legacy-source-identity",
    publicationStatus:"candidate",
    indexable:false,
    facts:{
      reconciliationStatus:"distinct-public-task-parity-required",
      catalogEnabled:true,
    },
    relations:[],
  });
}

entities.sort((a,b) => String(a.id).localeCompare(String(b.id)));
graph.entities = entities;
graph.toolReconciliation = {
  policy:"29 observed public canonicals + 4 enabled non-private legacy/source identities. Candidate identities are not published or indexed until distinct task parity is proven.",
  publicCanonicalCount:entities.filter((entity) => entity.type === "tool" && entity.publicationStatus === "public").length,
  candidateCount:entities.filter((entity) => entity.type === "tool" && entity.publicationStatus === "candidate").length,
  candidateIds:actualCandidates.map((slug) => `tool:${slug}`),
};
graph.counts.total = entities.length;
graph.counts.indexable = entities.filter((entity) => entity.indexable).length;
graph.counts.candidate = entities.filter((entity) => entity.publicationStatus === "candidate").length;
graph.counts.tools = entities.filter((entity) => entity.type === "tool").length;
graph.counts.publicTools = graph.toolReconciliation.publicCanonicalCount;
graph.counts.candidateTools = graph.toolReconciliation.candidateCount;
graph.sourceDigest = sha(JSON.stringify(entities));

await writeFile(graphPath, JSON.stringify(graph, null, 2) + "\n", "utf8");
console.log(`Tool identity reconciliation: ${graph.counts.publicTools} public + ${graph.counts.candidateTools} gated = ${graph.counts.tools} source-backed identities.`);
