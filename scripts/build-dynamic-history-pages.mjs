import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { SITE } from "./seo-config.mjs";
import { BUILD_DATE, updateSitemapIndex, urlsetXml } from "./sitemap-utils.mjs";

const root = process.cwd();
const historyRoot = resolve(root, "migration/data/public/on_this_day_events");
const outDir = resolve(root, "public/data");

const safeHttp = (value) => typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : "";
const titleOf = (row) => String(row?.title_ne || row?.title_en || row?.event_ne || row?.event_en || row?.title || row?.name || "").trim();
const slugTitleOf = (row) => String(row?.title_en || row?.event_en || row?.title || row?.name || row?.title_ne || row?.event_ne || "").trim();
const yearOf = (row) => {
  const value = Number(row?.ad_year ?? row?.year);
  return Number.isInteger(value) ? value : null;
};
const normalizeTitle = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/g, " ").trim();
const slugify = (value) => String(value || "").normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\p{L}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 88);
const shortHash = (value) => createHash("sha256").update(String(value)).digest("hex").slice(0, 8);

async function walkJson(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes:true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkJson(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(path);
  }
  return out.sort();
}

const rows = [];
for (const file of await walkJson(historyRoot)) {
  const doc = JSON.parse(await readFile(file, "utf8"));
  if (doc?.table !== "on_this_day_events" || !Array.isArray(doc?.rows)) throw new Error(`Invalid On This Day snapshot: ${file}`);
  rows.push(...doc.rows);
}

const seenFacts = new Set();
const usedSlugs = new Set();
const events = {};
const routes = [];

for (const row of rows.sort((a,b) => String(a?.id || "").localeCompare(String(b?.id || "")))) {
  const verification = String(row?.verification_status || "").trim().toLowerCase();
  const sourceUrl = safeHttp(row?.source_url);
  const title = titleOf(row);
  const year = yearOf(row);
  const month = Number(row?.ad_month ?? row?.month);
  const day = Number(row?.ad_day ?? row?.day);
  if (verification !== "source-backed" || !sourceUrl || !title || !Number.isInteger(month) || !Number.isInteger(day)) continue;
  const factKey = [month, day, year ?? "", String(row?.event_type || "").trim().toLowerCase(), normalizeTitle(title)].join("|");
  if (seenFacts.has(factKey)) continue;
  seenFacts.add(factKey);

  const id = String(row?.id || shortHash(factKey));
  const monthDay = `${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  const base = slugify(`${slugTitleOf(row)} ${year ?? monthDay}`) || `history-${shortHash(id)}`;
  let slug = base;
  if (usedSlugs.has(slug)) slug = `${base}-${shortHash(id)}`;
  usedSlugs.add(slug);

  events[slug] = {
    id,
    title,
    title_en: String(row?.title_en || row?.event_en || "").trim() || null,
    title_ne: String(row?.title_ne || row?.event_ne || "").trim() || null,
    year,
    month_day: monthDay,
    source_url: sourceUrl,
    source_name: String(row?.source_name || row?.source_title || "").trim() || null,
    event_type: String(row?.event_type || "").trim() || null,
  };
  routes.push(`/onthisday/${slug}`);
}

if (routes.length < 3000) throw new Error(`Dynamic history route coverage unexpectedly small: ${routes.length}`);
await mkdir(outDir, { recursive:true });
await writeFile(resolve(outDir, "history-events-index.json"), JSON.stringify({ schema:1, count:routes.length, events }) + "\n", "utf8");
await writeFile(resolve(root, "public/sitemap-history-events.xml"), urlsetXml(routes), "utf8");
await updateSitemapIndex(resolve(root, "public/sitemap.xml"), [{ file:"sitemap-history-events.xml", lastmod:BUILD_DATE }]);

const manifestPath = resolve(root, "public/seo-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.sitemap_files = [...new Set([...(manifest.sitemap_files || []), "sitemap-history-events.xml"])];
manifest.indexed_history_event_route_count = routes.length;
manifest.history_event_index = `${SITE}/data/history-events-index.json`;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`Dynamic history route index: ${routes.length} source-backed event pages; one compact JSON index, no per-event HTML files.`);
