import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { SITE } from "./seo-config.mjs";
import { BUILD_DATE, snapshotDate, updateSitemapIndex, urlsetXml } from "./sitemap-utils.mjs";

const root = process.cwd();
const sourceRoot = resolve(root, "migration/data/public/time_machine_moments");
const expectedPath = resolve(root, "cloudflare/d1/expected-public-counts.json");
const outDir = resolve(root, "public/data");

const clean = (value) => String(value ?? "").trim();
const safeHttp = (value) => typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : "";
const shortHash = (value) => createHash("sha256").update(String(value)).digest("hex").slice(0, 8);
const slugify = (value) => String(value || "")
  .normalize("NFKD")
  .toLowerCase()
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9\p{L}]+/gu, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 88);

function titleOf(row) {
  return clean(row?.event_ne || row?.title_ne || row?.name_ne || row?.headline_ne || row?.title || row?.name || row?.event_en || row?.title_en || row?.name_en);
}
function titleEnOf(row) {
  return clean(row?.event_en || row?.title_en || row?.name_en || row?.title || row?.event_ne || row?.title_ne);
}
function bodyOf(row) {
  return clean(row?.summary_ne || row?.description_ne || row?.detail_ne || row?.summary || row?.description || row?.detail || row?.details || row?.body || row?.summary_en || row?.description_en || row?.event_en);
}
function bodyEnOf(row) {
  return clean(row?.summary_en || row?.description_en || row?.summary || row?.description || row?.detail || row?.summary_ne || row?.description_ne);
}
function yearOf(row) {
  const raw = row?.year_bs ?? row?.bs_year ?? row?.year ?? row?.ad_year ?? String(row?.date || row?.ad_date || "").slice(0, 4);
  const value = Number(String(raw ?? "").replace(/[^0-9]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}
function dateOf(row) {
  for (const value of [row?.ad_date, row?.date, row?.date_ad]) {
    const text = String(value || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  }
  return null;
}
function sourceUrlOf(row) { return safeHttp(row?.source_url || row?.url || row?.reference_url); }
function sourceNameOf(row) { return clean(row?.source_title || row?.source_name || row?.source); }
function categoryOf(row) { return clean(row?.category_ne || row?.category || row?.type || row?.event_type); }
function placeOf(row) { return clean(row?.place_ne || row?.place || row?.location || row?.location_ne); }

async function walkJson(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes:true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkJson(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(path);
  }
  return out.sort();
}

const files = await walkJson(sourceRoot);
if (!files.length) throw new Error("No Time Machine source snapshots found");
const expected = JSON.parse(await readFile(expectedPath, "utf8"));
const expectedCount = Number(expected?.tables?.time_machine_moments || 0);
if (expectedCount < 700) throw new Error(`Time Machine expected inventory too small: ${expectedCount}`);

const rawRows = [];
for (const file of files) {
  const doc = JSON.parse(await readFile(file, "utf8"));
  if (doc?.table !== "time_machine_moments" || !Array.isArray(doc?.rows)) throw new Error(`Invalid Time Machine snapshot: ${relative(root, file)}`);
  rawRows.push(...doc.rows);
}
if (rawRows.length !== expectedCount) throw new Error(`Time Machine source count mismatch: ${rawRows.length} != ${expectedCount}`);

const usedSlugs = new Set();
const records = rawRows.map((row, index) => {
  const id = clean(row?.id || row?.key || `moment-${index + 1}`);
  const title = titleOf(row);
  const summary = bodyOf(row);
  if (!id || !title) throw new Error(`Time Machine row ${index + 1} lacks stable id/title`);
  const year = yearOf(row);
  const base = slugify(`${titleEnOf(row) || title} ${year || ""}`) || `moment-${slugify(id) || shortHash(id)}`;
  let slug = base;
  if (usedSlugs.has(slug)) slug = `${base}-${shortHash(id)}`;
  usedSlugs.add(slug);
  return {
    slug,
    id,
    title,
    title_en: titleEnOf(row) || null,
    title_ne: clean(row?.event_ne || row?.title_ne || row?.name_ne || row?.headline_ne) || null,
    summary: summary || null,
    summary_en: bodyEnOf(row) || null,
    summary_ne: clean(row?.summary_ne || row?.description_ne || row?.detail_ne) || null,
    year,
    ad_date: dateOf(row),
    category: categoryOf(row) || null,
    place: placeOf(row) || null,
    source_url: sourceUrlOf(row) || null,
    source_name: sourceNameOf(row) || null,
  };
}).sort((a,b) => (Number(a.year || 999999) - Number(b.year || 999999)) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

if (records.length !== expectedCount || records.length < 700) throw new Error(`Dynamic Time Machine coverage mismatch: ${records.length}`);

const moments = {};
for (let i = 0; i < records.length; i++) {
  const row = records[i];
  moments[row.slug] = {
    ...row,
    previous_slug: i > 0 ? records[i - 1].slug : null,
    next_slug: i + 1 < records.length ? records[i + 1].slug : null,
  };
}
const routes = records.map((row) => `/time-machine/${row.slug}`);
const lastmod = (await snapshotDate(files)) || BUILD_DATE;

await mkdir(outDir, { recursive:true });
await writeFile(resolve(outDir, "time-machine-index.json"), JSON.stringify({ schema:1, count:records.length, source_date:lastmod, moments }) + "\n", "utf8");
await writeFile(resolve(root, "public/sitemap-time-machine.xml"), urlsetXml(routes.map((route) => ({ route, lastmod }))), "utf8");
await updateSitemapIndex(resolve(root, "public/sitemap.xml"), [{ file:"sitemap-time-machine.xml", lastmod }]);

const manifestPath = resolve(root, "public/seo-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.sitemap_files = [...new Set([...(manifest.sitemap_files || []), "sitemap-time-machine.xml"])];
manifest.indexed_time_machine_route_count = routes.length;
manifest.time_machine_index = `${SITE}/data/time-machine-index.json`;
manifest.dynamic_indexable_route_count = Number(manifest.indexed_day_route_count || 0)
  + Number(manifest.indexed_history_event_route_count || 0)
  + Number(manifest.indexed_time_machine_route_count || 0)
  + Number(manifest.indexed_festival_route_count || 0);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`Dynamic Time Machine route index: ${routes.length} pages from ${rawRows.length} canonical records; one compact JSON index, no per-page HTML.`);
console.log(`Dynamic indexable core count is now at least ${manifest.dynamic_indexable_route_count}.`);
