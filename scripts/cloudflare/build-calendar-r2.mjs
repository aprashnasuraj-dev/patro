import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import process from "node:process";
import { loadCalendarSnapshot } from "../calendar-snapshot.mjs";

const ROOT = process.cwd();
const OUT_ROOT = join(ROOT, ".cloudflare", "calendar-r2");
const STATIC_ROOT = join(ROOT, "public", "data", "calendar");
const PREFIX = "datasets/calendar/v1";
const FORMAT_VERSION = "calendar-r2-year-v1";

function validAd(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}
function normalize(row) {
  const ad = String(row?.ad || row?.ad_date || "").slice(0, 10);
  const bs = row?.bs;
  if (!validAd(ad) || !Number.isInteger(Number(bs?.year)) || !Number.isInteger(Number(bs?.month)) || !Number.isInteger(Number(bs?.day))) return null;
  return { ...row, ad };
}
function stableRowSort(a, b) { return String(a.ad).localeCompare(String(b.ad)); }
function groupBy(rows, fn) {
  const map = new Map();
  for (const row of rows) {
    const key = fn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  for (const values of map.values()) values.sort(stableRowSort);
  return map;
}
async function writeBoth(relativePath, text) {
  const out = join(OUT_ROOT, relativePath);
  const stat = join(STATIC_ROOT, relativePath);
  await Promise.all([mkdir(join(out, ".."), { recursive:true }), mkdir(join(stat, ".."), { recursive:true })]);
  await Promise.all([writeFile(out, text), writeFile(stat, text)]);
}

const rows = (await loadCalendarSnapshot()).map(normalize).filter(Boolean).sort(stableRowSort);
if (rows.length < 70_000) throw new Error(`Validated calendar snapshot unexpectedly small: ${rows.length}`);

const hash = createHash("sha256");
hash.update(FORMAT_VERSION);
hash.update("\0");
for (const row of rows) {
  hash.update(JSON.stringify(row));
  hash.update("\n");
}
const sourceVersion = `sha256:${hash.digest("hex")}`;

await Promise.all([
  rm(OUT_ROOT, { recursive:true, force:true }),
  rm(STATIC_ROOT, { recursive:true, force:true }),
]);
await Promise.all([mkdir(OUT_ROOT, { recursive:true }), mkdir(STATIC_ROOT, { recursive:true })]);

const adGroups = groupBy(rows, (row) => Number(row.ad.slice(0, 4)));
const bsGroups = groupBy(rows, (row) => Number(row.bs.year));
const files = [];

for (const [year, values] of [...adGroups.entries()].sort(([a],[b]) => a-b)) {
  const relativePath = `ad/${year}.json`;
  const payload = {
    schema:1,
    format:FORMAT_VERSION,
    calendar:"ad",
    year,
    row_count:values.length,
    source_version:sourceVersion,
    rows:values,
  };
  await writeBoth(relativePath, JSON.stringify(payload));
  files.push({ calendar:"ad", year, row_count:values.length, key:`${PREFIX}/${relativePath}`, static:`/data/calendar/${relativePath}` });
}
for (const [year, values] of [...bsGroups.entries()].sort(([a],[b]) => a-b)) {
  const relativePath = `bs/${year}.json`;
  const payload = {
    schema:1,
    format:FORMAT_VERSION,
    calendar:"bs",
    year,
    row_count:values.length,
    source_version:sourceVersion,
    rows:values,
  };
  await writeBoth(relativePath, JSON.stringify(payload));
  files.push({ calendar:"bs", year, row_count:values.length, key:`${PREFIX}/${relativePath}`, static:`/data/calendar/${relativePath}` });
}

const manifest = {
  schema:1,
  format:FORMAT_VERSION,
  prefix:PREFIX,
  static_prefix:"/data/calendar",
  source_version:sourceVersion,
  row_count:rows.length,
  ad_start:rows.at(0)?.ad || null,
  ad_end:rows.at(-1)?.ad || null,
  ad_years:[...adGroups.keys()].sort((a,b)=>a-b),
  bs_years:[...bsGroups.keys()].sort((a,b)=>a-b),
  files,
};
await writeBoth("manifest.json", JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ ok:true, out:relative(ROOT, OUT_ROOT), static_out:relative(ROOT, STATIC_ROOT), row_count:rows.length, ad_year_files:adGroups.size, bs_year_files:bsGroups.size, source_version:sourceVersion }, null, 2));
