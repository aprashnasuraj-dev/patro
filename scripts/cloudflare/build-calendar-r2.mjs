import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import process from "node:process";
import { loadCalendarSnapshot } from "../calendar-snapshot.mjs";
import { CURRENT_BS_YEAR, SITEMAP_MIN_BS_YEAR, SITEMAP_MAX_BS_YEAR, isSitemapYear } from "../seo-config.mjs";
import { BUILD_DATE, isoDate, maxDate, snapshotDate, updateSitemapIndex, urlsetXml } from "../sitemap-utils.mjs";

const ROOT = process.cwd();
const OUT_ROOT = join(ROOT, ".cloudflare", "calendar-r2");
const STATIC_ROOT = join(ROOT, "public", "data", "calendar");
const PREFIX = "datasets/calendar/v1";
const FORMAT_VERSION = "calendar-r2-year-v1";
const CALENDAR_SOURCE_DIR = join(ROOT, "migration", "data", "public", "astronomy_calendar_map");
const ARCHIVE_SITEMAP_RE = /^sitemap-(?:calendar|days)-\d+\.xml$/;

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
if (rows.length !== 77_070) throw new Error(`Validated calendar snapshot row mismatch: ${rows.length} != 77070`);
if (rows.at(0)?.ad !== "1826-04-11" || rows.at(-1)?.ad !== "2037-04-13") throw new Error(`Validated calendar coverage mismatch: ${rows.at(0)?.ad}..${rows.at(-1)?.ad}`);

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
  const payload = { schema:1, format:FORMAT_VERSION, calendar:"ad", year, row_count:values.length, source_version:sourceVersion, rows:values };
  await writeBoth(relativePath, JSON.stringify(payload));
  files.push({ calendar:"ad", year, row_count:values.length, key:`${PREFIX}/${relativePath}`, static:`/data/calendar/${relativePath}` });
}
for (const [year, values] of [...bsGroups.entries()].sort(([a],[b]) => a-b)) {
  const relativePath = `bs/${year}.json`;
  const payload = { schema:1, format:FORMAT_VERSION, calendar:"bs", year, row_count:values.length, source_version:sourceVersion, rows:values };
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

// Step 9: indexing and prerendering are separate concerns. The full validated archive stays in R2 and
// remains reachable, but only the indexable BS-year window (seo-config.mjs isSitemapYear, which matches the
// Worker's historical noindex cutoff) is submitted through segmented BS-year sitemaps. This script is the
// single writer of sitemap-calendar-YYYY.xml / sitemap-days-YYYY.xml.

// Per-BS-year data modification date from the raw snapshot (max created_at/updated_at), falling back to
// the part's snapshot_at. Stable across builds unless the data itself changes.
const yearDataDate = new Map();
for (const name of (await readdir(CALENDAR_SOURCE_DIR)).filter((n) => n.endsWith(".json")).sort()) {
  const doc = JSON.parse(await readFile(join(CALENDAR_SOURCE_DIR, name), "utf8"));
  for (const raw of doc?.rows || []) {
    const year = Number((raw?.payload ?? raw)?.bs?.year);
    if (!Number.isInteger(year)) continue;
    const date = maxDate(raw?.updated_at, raw?.created_at, (raw?.payload ?? {})?.verified_at) || isoDate(doc?.snapshot_at);
    if (date) yearDataDate.set(year, maxDate(yearDataDate.get(year), date));
  }
}
const snapshotSourceDate = await snapshotDate((await readdir(CALENDAR_SOURCE_DIR)).filter((n) => n.endsWith(".json")).map((n) => `migration/data/public/astronomy_calendar_map/${n}`));
function yearLastmod(year) {
  const dataDate = yearDataDate.get(year);
  if (dataDate) return dataDate;
  if (Math.abs(year - CURRENT_BS_YEAR) <= 1) return BUILD_DATE;
  return snapshotSourceDate || "2026-09-30";
}

// Remove stale archive sitemaps (e.g. 1883–2072) so they never ship in dist/.
const publicDir = join(ROOT, "public");
await Promise.all((await readdir(publicDir)).filter((name) => ARCHIVE_SITEMAP_RE.test(name)).map((name) => rm(join(publicDir, name), { force:true })));

const archiveSitemapEntries = [];
let sitemapCalendarRouteCount = 0, sitemapDayRouteCount = 0, sitemapMonthRouteCount = 0;
const sitemapYears = [];
for (const [year, values] of [...bsGroups.entries()].sort(([a],[b]) => a-b)) {
  if (!isSitemapYear(year)) continue;
  const months = [...new Set(values.map((row) => Number(row.bs.month)).filter((m) => m >= 1 && m <= 12))].sort((a,b)=>a-b);
  const calendarFile = `sitemap-calendar-${year}.xml`;
  const dayFile = `sitemap-days-${year}.xml`;
  const calendarRoutes = [`/calendar/${year}`, ...months.map((month) => `/calendar/${year}/${String(month).padStart(2,"0")}`)];
  const dayRoutes = values.map((row) => `/date/${row.ad}`);
  await Promise.all([
    writeFile(join(publicDir, calendarFile), urlsetXml(calendarRoutes), "utf8"),
    writeFile(join(publicDir, dayFile), urlsetXml(dayRoutes), "utf8"),
  ]);
  const lastmod = yearLastmod(year);
  archiveSitemapEntries.push({ file:calendarFile, lastmod }, { file:dayFile, lastmod });
  sitemapYears.push(year);
  sitemapCalendarRouteCount += 1;
  sitemapMonthRouteCount += months.length;
  sitemapDayRouteCount += dayRoutes.length;
}
if (!sitemapYears.length) throw new Error(`No BS archive years inside the sitemap window ${SITEMAP_MIN_BS_YEAR}..${SITEMAP_MAX_BS_YEAR}`);
const archiveSitemapFiles = archiveSitemapEntries.map((entry) => entry.file);

const sitemapIndexPath = join(publicDir, "sitemap.xml");
await updateSitemapIndex(sitemapIndexPath, archiveSitemapEntries, (file) => ARCHIVE_SITEMAP_RE.test(file));

const seoManifestPath = join(ROOT, "public", "seo-manifest.json");
let seoManifest = { sitemap_files: [] };
try {
  seoManifest = JSON.parse(await readFile(seoManifestPath, "utf8"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const nonArchiveSitemaps = (seoManifest.sitemap_files || []).filter((file) => !/^sitemap-(?:calendar|days)-\d+\.xml$/.test(file));
seoManifest.sitemap_files = [...nonArchiveSitemaps, ...archiveSitemapFiles];
seoManifest.sitemap_bs_year_window = { min:SITEMAP_MIN_BS_YEAR, max:SITEMAP_MAX_BS_YEAR, current:CURRENT_BS_YEAR };
seoManifest.indexed_calendar_years = sitemapYears;
seoManifest.indexed_calendar_year_route_count = sitemapCalendarRouteCount;
seoManifest.indexed_calendar_month_route_count = sitemapMonthRouteCount;
seoManifest.indexed_day_route_count = sitemapDayRouteCount;
seoManifest.calendar_archive_bs_years = manifest.bs_years;
seoManifest.calendar_archive_row_count = rows.length;
seoManifest.calendar_archive_source_version = sourceVersion;
seoManifest.calendar_archive_ad_start = manifest.ad_start;
seoManifest.calendar_archive_ad_end = manifest.ad_end;
seoManifest.archive_policy = `All ${rows.length.toLocaleString("en-US")} validated calendar records render dynamically from immutable R2 year shards, but only the indexable BS ${SITEMAP_MIN_BS_YEAR}–${SITEMAP_MAX_BS_YEAR} window (current year ±10, matching the Worker noindex cutoff) is submitted through segmented sitemaps; older years remain reachable via internal links. Only a small hot cohort is prerendered.`;
seoManifest.rendering_policy = "Static SPA plus small hot prerender cohort; permanent calendar/date/community archive pages are rendered from immutable Cloudflare R2 shards without normal D1 reads.";
await writeFile(seoManifestPath, JSON.stringify(seoManifest, null, 2) + "\n", "utf8");

console.log(JSON.stringify({ ok:true, out:relative(ROOT, OUT_ROOT), static_out:relative(ROOT, STATIC_ROOT), row_count:rows.length, ad_year_files:adGroups.size, bs_year_files:bsGroups.size, sitemap_files:archiveSitemapFiles.length, sitemap_years:`${sitemapYears[0]}..${sitemapYears.at(-1)}`, source_version:sourceVersion }, null, 2));

// The same checked-in public mirror also contains the six community archive families. Build their
// R2 year shards in the same deterministic archive phase so calendar/community source versions are
// ready before Vite and before deployment seeding.
await import("./build-community-r2.mjs");
