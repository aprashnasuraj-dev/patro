import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const expected = JSON.parse(await readFile(resolve(root, "cloudflare/d1/expected-public-counts.json"), "utf8"));
const inventory = JSON.parse(await readFile(resolve(root, "cloudflare/d1/supabase-table-inventory.json"), "utf8"));

const failures = [];
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

if (failures.length) {
  console.error("Migration inventory verification failed:");
  for (const failure of failures) console.error(" - "+failure);
  process.exit(1);
}

const publicCount=entries.filter(([,x])=>x.strategy==="d1_bootstrap_public_reference").length;
const privateCount=entries.filter(([,x])=>x.strategy==="supabase_compat_private_until_auth_cutover").length;
const ephemeralCount=entries.filter(([,x])=>x.strategy==="rebuild_on_cloudflare_runtime").length;
console.log(`Migration inventory verified: ${entries.length} Supabase public tables accounted; ${publicCount} deterministic D1 tables, ${privateCount} protected transition tables, ${ephemeralCount} ephemeral runtime tables.`);
