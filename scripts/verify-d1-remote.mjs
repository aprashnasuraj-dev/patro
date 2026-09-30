import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const expected = JSON.parse(await readFile(resolve(root, "cloudflare/d1/expected-public-counts.json"), "utf8"));

const sql = [
  "SELECT table_name, COUNT(*) AS rows,",
  "CASE WHEN table_name='astronomy_calendar_map' THEN MIN(ad_date) ELSE NULL END AS first_ad_date,",
  "CASE WHEN table_name='astronomy_calendar_map' THEN MAX(ad_date) ELSE NULL END AS last_ad_date,",
  "CASE WHEN table_name='astronomy_calendar_map' THEN SUM(CASE WHEN json_extract(payload,'$.payload.bs.formatted') IS NOT NULL THEN 1 ELSE 0 END) ELSE NULL END AS bs_rows,",
  "CASE WHEN table_name='astronomy_calendar_map' THEN SUM(CASE WHEN json_extract(payload,'$.payload.ns.formatted') IS NOT NULL THEN 1 ELSE 0 END) ELSE NULL END AS ns_rows,",
  "CASE WHEN table_name='astronomy_calendar_map' THEN SUM(CASE WHEN json_extract(payload,'$.payload.panchang.tithi') IS NOT NULL THEN 1 ELSE 0 END) ELSE NULL END AS panchang_rows",
  "FROM content_records GROUP BY table_name ORDER BY table_name;"
].join(" ");

const result = spawnSync("npx", [
  "wrangler","d1","execute","DB","--remote",
  "--command="+sql,
  "--json",
  "--config","wrangler.generated.jsonc"
], {
  encoding:"utf8",
  shell:process.platform === "win32"
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "D1 verification command failed.\n");
  process.exit(result.status ?? 1);
}

let parsed;
try { parsed = JSON.parse(result.stdout); }
catch (error) {
  console.error("Could not parse Wrangler D1 JSON output:", error);
  process.stderr.write(result.stderr || "");
  process.exit(2);
}

function findRows(node) {
  if (Array.isArray(node)) {
    if (node.every((item) => item && typeof item === "object" && "table_name" in item && "rows" in item)) return node;
    for (const item of node) {
      const found = findRows(item);
      if (found) return found;
    }
  } else if (node && typeof node === "object") {
    for (const value of Object.values(node)) {
      const found = findRows(value);
      if (found) return found;
    }
  }
  return null;
}

const rows = findRows(parsed);
if (!rows) {
  console.error("Wrangler returned no table-count result set.");
  process.exit(2);
}

const actual = Object.fromEntries(rows.map((row) => [String(row.table_name), row]));
const failures = [];
for (const [table, expectedRows] of Object.entries(expected.tables)) {
  const row = actual[table];
  const n = Number(row?.rows ?? -1);
  if (n !== expectedRows) failures.push(`${table}: expected ${expectedRows}, found ${n}`);
}

const astro = actual.astronomy_calendar_map;
const spec = expected.critical_features.main_calendar;
if (!astro) failures.push("astronomy_calendar_map missing");
else {
  if (astro.first_ad_date !== spec.first_ad_date) failures.push(`calendar first date: expected ${spec.first_ad_date}, found ${astro.first_ad_date}`);
  if (astro.last_ad_date !== spec.last_ad_date) failures.push(`calendar last date: expected ${spec.last_ad_date}, found ${astro.last_ad_date}`);
  for (const key of ["bs_rows","ns_rows","panchang_rows"]) {
    if (Number(astro[key]) !== spec.rows) failures.push(`${key}: expected ${spec.rows}, found ${astro[key]}`);
  }
}

if (failures.length) {
  console.error("D1 remote parity verification failed:");
  for (const failure of failures) console.error(" - "+failure);
  process.exit(1);
}

console.log(`D1 remote parity verified: ${Object.keys(expected.tables).length} tables; main AD/BS/NS calendar ${spec.rows.toLocaleString()} rows; Rashifal ${expected.critical_features.rashifal.rows}; Time Machine ${expected.critical_features.time_machine.rows}; Tools ${expected.critical_features.tools.catalog_rows} + ${expected.critical_features.tools.release_rows}.`);
