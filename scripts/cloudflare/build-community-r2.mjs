import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, ".cloudflare", "community-r2");
const PUBLIC = join(ROOT, "migration", "data", "public");
const COMMUNITY_DATES = join(PUBLIC, "community_dates.json");
const COMMUNITY_FESTIVALS = join(PUBLIC, "community_festivals.json");
const NS_DAYS_ROOT = join(PUBLIC, "ns_days");
const NS_FESTIVAL_DATES = join(PUBLIC, "ns_festival_dates.json");
const NS_FESTIVALS = join(PUBLIC, "ns_festivals.json");
const EXPECTED = join(ROOT, "cloudflare", "d1", "expected-public-counts.json");
const PREFIX = "datasets/community/v1";
const FORMAT = "community-archive-year-v1";
const PRIMARY_SUITES = ["lhosar", "tharu", "mithila", "kirat", "hijri"];

const hash = createHash("sha256");
async function readSource(path) {
  const raw = await readFile(path);
  hash.update(relative(ROOT, path)); hash.update("\0"); hash.update(raw); hash.update("\0");
  return JSON.parse(raw.toString("utf8"));
}
async function walkJson(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes:true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkJson(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(path);
  }
  return out.sort();
}
function rowsOf(doc, table) {
  if (doc?.table !== table || !Array.isArray(doc?.rows)) throw new Error(`Invalid ${table} snapshot`);
  return doc.rows;
}
function group(rows, keyFn) {
  const out = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (key == null || key === "") continue;
    const list = out.get(key) || [];
    list.push(row); out.set(key, list);
  }
  return out;
}
async function emit(path, payload) {
  const file = join(OUT, path);
  await mkdir(join(file, ".."), { recursive:true });
  await writeFile(file, JSON.stringify(payload));
}

const expected = await readSource(EXPECTED);
const communityDates = rowsOf(await readSource(COMMUNITY_DATES), "community_dates");
const communityFestivals = rowsOf(await readSource(COMMUNITY_FESTIVALS), "community_festivals");
const nsFestivalDates = rowsOf(await readSource(NS_FESTIVAL_DATES), "ns_festival_dates");
const nsFestivals = rowsOf(await readSource(NS_FESTIVALS), "ns_festivals");
const nsDays = [];
for (const file of await walkJson(NS_DAYS_ROOT)) nsDays.push(...rowsOf(await readSource(file), "ns_days"));

if (communityDates.length !== Number(expected?.tables?.community_dates || 0)) throw new Error(`community_dates mismatch: ${communityDates.length}`);
if (communityFestivals.length !== Number(expected?.tables?.community_festivals || 0)) throw new Error(`community_festivals mismatch: ${communityFestivals.length}`);
if (nsDays.length !== Number(expected?.tables?.ns_days || 0)) throw new Error(`ns_days mismatch: ${nsDays.length}`);
if (nsFestivalDates.length !== Number(expected?.tables?.ns_festival_dates || 0)) throw new Error(`ns_festival_dates mismatch: ${nsFestivalDates.length}`);
if (nsFestivals.length !== Number(expected?.tables?.ns_festivals || 0)) throw new Error(`ns_festivals mismatch: ${nsFestivals.length}`);

const sourceVersion = `sha256:${hash.digest("hex")}`;
await rm(OUT, { recursive:true, force:true });
await mkdir(OUT, { recursive:true });

const communityFiles = [];
const festivalByKey = new Map(communityFestivals.map((row) => [`${row.suite}:${row.id}`, row]));
for (const suite of PRIMARY_SUITES) {
  const rows = communityDates.filter((row) => row?.suite === suite);
  if (!rows.length) throw new Error(`Community archive has no rows for ${suite}`);
  const byYear = group(rows, (row) => Number(row?.year));
  for (const [year, dates] of [...byYear.entries()].sort(([a],[b]) => a-b)) {
    if (!Number.isInteger(year)) continue;
    const ids = [...new Set(dates.map((row) => String(row?.festival_id || "")).filter(Boolean))];
    const festivals = ids.map((id) => festivalByKey.get(`${suite}:${id}`)).filter(Boolean);
    const key = `${suite}/${year}.json`;
    await emit(key, { schema:1, format:FORMAT, kind:"community-year", suite, year, source_version:sourceVersion, row_count:dates.length, dates, festivals });
    communityFiles.push({ family:suite, year, row_count:dates.length, key:`${PREFIX}/${key}`, route:`/samudaya/${suite}/${year}` });
  }
}

const nsFiles = [];
const nsByYear = group(nsDays, (row) => Number(row?.ns_year ?? row?.year));
const nsFestivalById = new Map(nsFestivals.map((row) => [String(row?.id || row?.festival_id || ""), row]));
const nsFestivalDatesByYear = group(nsFestivalDates, (row) => Number(row?.ns_year ?? row?.year));
for (const [year, days] of [...nsByYear.entries()].sort(([a],[b]) => a-b)) {
  if (!Number.isInteger(year)) continue;
  const festivalDates = nsFestivalDatesByYear.get(year) || [];
  const ids = [...new Set(festivalDates.map((row) => String(row?.festival_id || row?.id || "")).filter(Boolean))];
  const festivals = ids.map((id) => nsFestivalById.get(id)).filter(Boolean);
  const key = `nepal-sambat/${year}.json`;
  await emit(key, { schema:1, format:FORMAT, kind:"nepal-sambat-year", suite:"nepal-sambat", year, source_version:sourceVersion, row_count:days.length, days, festival_dates:festivalDates, festivals });
  nsFiles.push({ family:"nepal-sambat", year, row_count:days.length, key:`${PREFIX}/${key}`, route:`/nepal-sambat/${year}` });
}
if (!nsFiles.length) throw new Error("Nepal Sambat archive has no year groups");

const archiveRoutes = [...communityFiles, ...nsFiles].map((row) => row.route);
const manifest = {
  schema:1,
  format:FORMAT,
  prefix:PREFIX,
  source_version:sourceVersion,
  primary_families:["nepal-sambat", ...PRIMARY_SUITES],
  community_dates_rows:communityDates.length,
  community_festivals_rows:communityFestivals.length,
  nepal_sambat_days_rows:nsDays.length,
  nepal_sambat_festival_dates_rows:nsFestivalDates.length,
  nepal_sambat_festivals_rows:nsFestivals.length,
  archive_route_count:archiveRoutes.length,
  files:[...communityFiles, ...nsFiles],
};
await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

const site = "https://aafnaipatro.com";
const sitemapPath = join(ROOT, "public", "sitemap-community-archives.xml");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${archiveRoutes.map((route) => `  <url><loc>${site}${route}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(sitemapPath, xml);

const sitemapIndexPath = join(ROOT, "public", "sitemap.xml");
let sitemapIndex = await readFile(sitemapIndexPath, "utf8");
if (!sitemapIndex.includes(`${site}/sitemap-community-archives.xml`)) sitemapIndex = sitemapIndex.replace("</sitemapindex>", `  <sitemap><loc>${site}/sitemap-community-archives.xml</loc></sitemap>\n</sitemapindex>`);
await writeFile(sitemapIndexPath, sitemapIndex);

const seoManifestPath = join(ROOT, "public", "seo-manifest.json");
const seoManifest = JSON.parse(await readFile(seoManifestPath, "utf8"));
seoManifest.sitemap_files = [...new Set([...(seoManifest.sitemap_files || []), "sitemap-community-archives.xml"])];
seoManifest.community_archive_route_count = archiveRoutes.length;
seoManifest.community_archive_families = manifest.primary_families;
seoManifest.community_archive_source_version = sourceVersion;
await writeFile(seoManifestPath, JSON.stringify(seoManifest, null, 2) + "\n");

// Finalize the canonical publication graph after both calendar and community manifests exist.
await import("../reconcile-community-archives.mjs");

console.log(JSON.stringify({ ok:true, out:relative(ROOT, OUT), ...manifest }, null, 2));
