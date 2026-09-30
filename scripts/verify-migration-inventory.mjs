import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const expected = JSON.parse(await readFile(resolve(root, "cloudflare/d1/expected-public-counts.json"), "utf8"));
const inventory = JSON.parse(await readFile(resolve(root, "cloudflare/d1/supabase-table-inventory.json"), "utf8"));
const runtimeManifest = JSON.parse(await readFile(resolve(root, "cloudflare/source-runtime-manifest.json"), "utf8"));

const failures = [];

for (const [slug, item] of Object.entries(runtimeManifest.canonical_functions || {})) {
  if (item.repo_exact !== true) failures.push(`${slug}: live source is not marked repo_exact`);
  for (const path of [
    `migration/cloudflare/supabase/function-source/${slug}/index.ts`,
    `cloudflare/converted-functions/${slug}/index.ts`
  ]) {
    try {
      const source = await readFile(resolve(root, path), "utf8");
      if (path.includes("/converted-functions/")) {
        if (source.includes("Deno.serve(")) failures.push(`${slug}: converted output still contains Deno.serve`);
        if (source.includes("Deno.env.get")) failures.push(`${slug}: converted output still contains Deno.env.get`);
        if (/["']npm:/.test(source)) failures.push(`${slug}: converted output still contains npm: specifier`);
      }
    } catch {
      failures.push(`${slug}: missing required migration artifact ${path}`);
    }
  }
}

if (Object.keys(runtimeManifest.canonical_functions || {}).length !== 11) failures.push("expected 11 canonical live Edge Functions in source-runtime-manifest.json");
const entries = Object.entries(inventory.tables || {});
if (entries.length !== inventory.table_count) failures.push(`inventory table_count=${inventory.table_count}, actual entries=${entries.length}`);

for (const [table, rows] of Object.entries(expected.tables)) {
  const item = inventory.tables?.[table];
  if (!item) failures.push(`expected D1 table missing from inventory: ${table}`);
  else {
    if (item.strategy !== "d1_bootstrap_public_reference") failures.push(`${table}: strategy=${item.strategy}`);
    if (item.source_rows !== rows) failures.push(`${table}: expected-public-counts=${rows}, inventory source_rows=${item.source_rows}`);
  }
}

for (const [table, item] of entries) {
  if (!["d1_bootstrap_public_reference","supabase_compat_private_until_auth_cutover","rebuild_on_cloudflare_runtime"].includes(item.strategy)) {
    failures.push(`${table}: unknown strategy ${item.strategy}`);
  }
  if (item.strategy === "d1_bootstrap_public_reference" && !(table in expected.tables)) {
    failures.push(`${table}: marked for D1 bootstrap but absent from expected-public-counts.json`);
  }
}

for (const required of ["astronomy_calendar_map","miti_rashifal_publications","time_machine_moments","on_this_day_events","tool_catalog","tool_release_plan","ns_days"]) {
  if (inventory.tables?.[required]?.strategy !== "d1_bootstrap_public_reference") failures.push(`critical feature table not D1-bootstrap classified: ${required}`);
}


const toolCatalog = JSON.parse(await readFile(resolve(root, "migration/data/public/tool_catalog.json"), "utf8"));
const toolReleasePlan = JSON.parse(await readFile(resolve(root, "migration/data/public/tool_release_plan.json"), "utf8"));
const toolRouteSources = (
  await Promise.all([
    "src/PatroRouter.tsx",
    "src/utilities/UtilitySuite.tsx",
    "src/patro-tools-integration/toolSlugs.ts"
  ].map((path) => readFile(resolve(root,path),"utf8")))
).join("\n");

if (toolCatalog.table !== "tool_catalog" || !Array.isArray(toolCatalog.rows)) failures.push("tool_catalog snapshot shape invalid");
else {
  const expectedCatalogRows = expected.critical_features?.tools?.catalog_rows;
  if (toolCatalog.rows.length !== expectedCatalogRows) failures.push(`tool_catalog rows=${toolCatalog.rows.length}, expected=${expectedCatalogRows}`);
  const enabled = toolCatalog.rows.filter((row) => row.enabled === true);
  const disabled = toolCatalog.rows.filter((row) => row.enabled !== true);
  const activePaths = new Set();
  for (const row of enabled) {
    const path = String(row.target_path || "");
    const slug = path === "/samudaya" ? "samudaya" : path.startsWith("/tools/") ? path.slice("/tools/".length) : "";
    if (!slug) failures.push(`tool_catalog enabled tool has unsupported target_path: ${row.tool_id} -> ${path}`);
    else if (!toolRouteSources.includes(`"${slug}"`)) failures.push(`tool_catalog enabled tool is not represented in shipped routing source: ${slug}`);
    if (activePaths.has(path)) failures.push(`tool_catalog duplicate enabled target_path: ${path}`);
    activePaths.add(path);
  }
  const disabledIds = disabled.map((row) => String(row.tool_id)).sort();
  const allowedDisabled = ["preetitounicode","unicodetopreeti"];
  if (JSON.stringify(disabledIds) !== JSON.stringify(allowedDisabled)) failures.push(`unexpected disabled tool catalog rows: ${disabledIds.join(",")}`);
  if (enabled.length !== 27) failures.push(`enabled tool capability count=${enabled.length}, expected=27`);
}

if (toolReleasePlan.table !== "tool_release_plan" || !Array.isArray(toolReleasePlan.rows)) failures.push("tool_release_plan snapshot shape invalid");
else if (toolReleasePlan.rows.length !== expected.critical_features?.tools?.release_rows) failures.push(`tool_release_plan rows=${toolReleasePlan.rows.length}, expected=${expected.critical_features?.tools?.release_rows}`);

if (failures.length) {
  console.error("Migration inventory verification failed:");
  for (const failure of failures) console.error(" - "+failure);
  process.exit(1);
}

const publicCount=entries.filter(([,x])=>x.strategy==="d1_bootstrap_public_reference").length;
const privateCount=entries.filter(([,x])=>x.strategy==="supabase_compat_private_until_auth_cutover").length;
const ephemeralCount=entries.filter(([,x])=>x.strategy==="rebuild_on_cloudflare_runtime").length;
console.log(`Migration inventory verified: ${entries.length} Supabase public tables accounted; ${publicCount} deterministic D1 tables, ${privateCount} protected transition tables, ${ephemeralCount} ephemeral runtime tables.`);
