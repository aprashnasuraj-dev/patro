// Shared helpers for every sitemap writer (generate-seo, generate-publication-graph,
// build-calendar-r2, build-community-r2) so the index is assembled the same way everywhere.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SITE, sitemapExclusionReason } from "./seo-config.mjs";

export const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[ch]));

/** Build date in Asia/Kathmandu (YYYY-MM-DD). */
export const BUILD_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isoDate(value) {
  const s = String(value || "").slice(0, 10);
  return DATE_RE.test(s) ? s : null;
}
export function maxDate(...values) {
  return values.flat().map(isoDate).filter(Boolean).sort().at(-1) || null;
}

/**
 * Stable "data modified" date: the newest snapshot_at found in the given JSON snapshot files
 * (paths relative to the repo root). Returns null when none is available.
 */
export async function snapshotDate(...relativePaths) {
  const dates = [];
  for (const rel of relativePaths.flat()) {
    try {
      const doc = JSON.parse(await readFile(resolve(process.cwd(), rel), "utf8"));
      if (isoDate(doc?.snapshot_at)) dates.push(doc.snapshot_at);
    } catch { /* missing optional snapshot */ }
  }
  return maxDate(dates);
}

/** Absolute, canonical sitemap <loc> for a root-relative route. Throws on non-indexable routes. */
export function sitemapLoc(route) {
  const reason = sitemapExclusionReason(route);
  if (reason) throw new Error(`Refusing to put non-indexable route in a sitemap (${reason}): ${route}`);
  return SITE + route;
}

/** <urlset> document. entries: string routes or { route, lastmod }. Duplicates are dropped. */
export function urlsetXml(entries) {
  const seen = new Set();
  const lines = [];
  for (const item of entries) {
    const route = typeof item === "string" ? item : item.route;
    if (seen.has(route)) continue;
    seen.add(route);
    const lastmod = typeof item === "object" && isoDate(item.lastmod) ? `<lastmod>${item.lastmod}</lastmod>` : "";
    lines.push(`  <url><loc>${escapeXml(sitemapLoc(route))}</loc>${lastmod}</url>`);
  }
  if (lines.length > 50_000) throw new Error(`Sitemap exceeds 50,000 URLs (${lines.length})`);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...lines, "</urlset>", ""].join("\n");
}

/** <sitemapindex> document. entries: [{ file, lastmod }]. */
export function sitemapIndexXml(entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(({ file, lastmod }) => `  <sitemap><loc>${escapeXml(`${SITE}/${file}`)}</loc>${isoDate(lastmod) ? `<lastmod>${lastmod}</lastmod>` : ""}</sitemap>`),
    "</sitemapindex>", ""
  ].join("\n");
}

export function parseSitemapIndex(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?\s*<\/sitemap>/g)) {
    const loc = m[1].trim();
    const file = loc.startsWith(SITE + "/") ? loc.slice(SITE.length + 1) : loc;
    out.push({ file, lastmod: m[2] ? m[2].trim() : null });
  }
  return out;
}

/**
 * Rewrite public/sitemap.xml: drop entries matching `remove(file)`, then upsert `entries`
 * (preserving the position of existing entries, appending new ones).
 */
export async function updateSitemapIndex(indexPath, entries, remove = () => false) {
  let current = [];
  try { current = parseSitemapIndex(await readFile(indexPath, "utf8")); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  const byFile = new Map(entries.map((entry) => [entry.file, entry]));
  const next = current.filter((entry) => !remove(entry.file)).map((entry) => byFile.get(entry.file) || entry);
  for (const entry of entries) if (!next.some((row) => row.file === entry.file)) next.push(entry);
  await writeFile(indexPath, sitemapIndexXml(next), "utf8");
  return next;
}
