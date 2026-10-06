import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import process from "node:process";
import { loadCalendarSnapshot } from "../calendar-snapshot.mjs";

const ROOT = process.cwd();
const OUT_ROOT = join(ROOT, ".cloudflare", "calendar-r2");
const STATIC_ROOT = join(ROOT, "public", "data", "calendar");
const PREFIX = "datasets/calendar/v1";
const FORMAT_VERSION = "calendar-r2-year-v1";
const SITE = "https://aafnaipatro.com";

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
function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (ch) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;" }[ch]));
}
function urlset(routes) {
  return ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',...routes.map((route)=>`  <url><loc>${escapeXml(SITE+route)}</loc></url>`),'</urlset>',''].join("\n");
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

// Step 9: indexing and prerendering are separate concerns. Publish the full validated R2-backed
// archive through segmented BS-year sitemaps without generating one HTML asset per day.
const archiveSitemapFiles = [];
for (const [year, values] of [...bsGroups.entries()].sort(([a],[b]) => a-b)) {
  const months = [...new Set(values.map((row) => Number(row.bs.month)).filter((m) => m >= 1 && m <= 12))].sort((a,b)=>a-b);
  const calendarFile = `sitemap-calendar-${year}.xml`;
  const dayFile = `sitemap-days-${year}.xml`;
  const calendarRoutes = [`/calendar/${year}`, ...months.map((month) => `/calendar/${year}/${String(month).padStart(2,"0")}`)];
  const dayRoutes = values.map((row) => `/date/${row.ad}`);
  await Promise.all([
    writeFile(join(ROOT, "public", calendarFile), urlset(calendarRoutes), "utf8"),
    writeFile(join(ROOT, "public", dayFile), urlset(dayRoutes), "utf8"),
  ]);
  archiveSitemapFiles.push(calendarFile, dayFile);
}

const sitemapIndexPath = join(ROOT, "public", "sitemap.xml");
let sitemapIndex = await readFile(sitemapIndexPath, "utf8");
sitemapIndex = sitemapIndex.replace(/\s*<sitemap><loc>https:\/\/aafnaipatro\.com\/sitemap-(?:calendar|days)-\d+\.xml<\/loc>(?:<lastmod>[^<]+<\/lastmod>)?<\/sitemap>/g, "");
sitemapIndex = sitemapIndex.replace("</sitemapindex>", archiveSitemapFiles.map((file) => `  <sitemap><loc>${SITE}/${file}</loc></sitemap>`).join("\n") + "\n</sitemapindex>");
await writeFile(sitemapIndexPath, sitemapIndex, "utf8");

const seoManifestPath = join(ROOT, "public", "seo-manifest.json");
let seoManifest = { sitemap_files: [] };
try {
  seoManifest = JSON.parse(await readFile(seoManifestPath, "utf8"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const nonArchiveSitemaps = (seoManifest.sitemap_files || []).filter((file) => !/^sitemap-(?:calendar|days)-\d+\.xml$/.test(file));
seoManifest.sitemap_files = [...nonArchiveSitemaps, ...archiveSitemapFiles];
seoManifest.indexed_calendar_years = manifest.bs_years;
seoManifest.indexed_calendar_year_route_count = manifest.bs_years.length;
seoManifest.indexed_calendar_month_route_count = [...bsGroups.values()].reduce((sum, values) => sum + new Set(values.map((row) => Number(row.bs.month))).size, 0);
seoManifest.indexed_day_route_count = rows.length;
seoManifest.calendar_archive_source_version = sourceVersion;
seoManifest.calendar_archive_ad_start = manifest.ad_start;
seoManifest.calendar_archive_ad_end = manifest.ad_end;
seoManifest.archive_policy = "All 77,070 validated calendar records are discoverable through segmented sitemaps and render dynamically from immutable R2 year shards; only a small hot cohort is prerendered.";
seoManifest.rendering_policy = "Static SPA plus small hot prerender cohort; permanent calendar/date/community archive pages are rendered from immutable Cloudflare R2 shards without normal D1 reads.";
await writeFile(seoManifestPath, JSON.stringify(seoManifest, null, 2) + "\n", "utf8");

console.log(JSON.stringify({ ok:true, out:relative(ROOT, OUT_ROOT), static_out:relative(ROOT, STATIC_ROOT), row_count:rows.length, ad_year_files:adGroups.size, bs_year_files:bsGroups.size, sitemap_files:archiveSitemapFiles.length, source_version:sourceVersion }, null, 2));

// The same checked-in public mirror also contains the six community archive families. Build their
// R2 year shards in the same deterministic archive phase so calendar/community source versions are
// ready before Vite and before deployment seeding.
await import("./build-community-r2.mjs");
