#!/usr/bin/env node
// Builds every explore page as one JSON object plus prebuilt sitemaps, ready to sync to R2.
//
//   node --max-old-space-size=6144 scripts/explore/build.mjs [--out .cloudflare/explore] [--family places]
//        [--config worker/explore/families.json] [--families-dir scripts/explore/families] [--no-pages]
//
// Output (mirrors the R2 layout under <storage_prefix>/):
//   <out>/pages/<path>.json          one record per page (see worker/explore/render.ts ExploreRecord)
//   <out>/sitemaps/sitemap-explore.xml  sitemap index (submit this URL in Search Console)
//   <out>/sitemaps/sitemap-x-<family>-<n>.xml
//   <out>/manifest.json               counts used by the deploy delete-guard
//   <out>/report.json                 quality report: indexable ratio and every rejection reason
//
// Two streaming passes keep memory flat at millions of pages: pass 1 keeps only a small index entry per page
// (path, parent, title, sort, index flag); pass 2 re-reads the adapter and writes full records.
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const ROOT = process.cwd();
const OUT = resolve(ROOT, opt("out", ".cloudflare/explore"));
const CONFIG_PATH = resolve(ROOT, opt("config", "worker/explore/families.json"));
const FAMILIES_DIR = resolve(ROOT, opt("families-dir", "scripts/explore/families"));
const ONLY_FAMILY = opt("family", null);
const WRITE_PAGES = !flag("no-pages");
const SITE = (process.env.PUBLIC_SITE_URL || "https://aafnaipatro.com").replace(/\/+$/, "");

const SLUG_PATH = /^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const started = Date.now();

const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
const families = config.families.filter((f) => f.enabled && (!ONLY_FAMILY || f.id === ONLY_FAMILY));
if (!families.length) throw new Error(`No enabled family${ONLY_FAMILY ? ` named ${ONLY_FAMILY}` : ""} in ${CONFIG_PATH}`);
for (const f of families) {
  if (!/^[a-z0-9]+$/.test(f.id)) throw new Error(`Family id must be [a-z0-9]+: ${f.id}`);
  if (!SLUG_PATH.test(f.prefix)) throw new Error(`Family prefix must be a slug path: ${f.prefix}`);
}
const prefixes = config.families.map((f) => f.prefix);
for (const a of prefixes) for (const b of prefixes) if (a !== b && (a.startsWith(b + "/") || a === b)) throw new Error(`Overlapping family prefixes ${a} / ${b}`);

const xmlEsc = (v) => String(v).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
const short = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const cmp = (a, b) => a.sort - b.sort || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0);

async function adapterFor(family) {
  const mod = await import(pathToFileURL(join(FAMILIES_DIR, `${family.id}.mjs`)).href);
  if (mod.id !== family.id || typeof mod.records !== "function") throw new Error(`Adapter ${family.id}.mjs must export id="${family.id}" and records()`);
  return mod;
}

/** Quality gate. Returns null when indexable, else the reason. Pages that fail are still served (noindex, follow). */
function rejectReason(rec, family, seenContent) {
  if (rec.quality && rec.quality.allow_index === false) return rec.quality.reason || "adapter-held-back";
  if ((rec.facts?.length ?? 0) < family.min_facts) return "too-few-facts";
  if (String(rec.description).length < family.min_description) return "description-too-short";
  const key = short(`${rec.title}\u0000${rec.description}`);
  if (seenContent.has(key)) return "duplicate-title-and-description";
  seenContent.add(key);
  return null;
}

// ---------- pass 1: validate + small index ----------
const index = new Map(); // path -> { parent, sort, title, title_ne, indexable, lastmod, family }
const childrenOf = new Map(); // parent path -> [paths]
const report = { started_at: new Date(started).toISOString(), families: {} };
let fatal = [];

for (const family of families) {
  const adapter = await adapterFor(family);
  const stats = { pages: 0, indexable: 0, rejected: {}, max_children: 0 };
  report.families[family.id] = stats;
  const seenContent = new Set();
  for await (const rec of adapter.records({ root: ROOT })) {
    const where = `${family.id}:${rec?.path}`;
    const problems = [];
    if (!rec || typeof rec.path !== "string" || !SLUG_PATH.test(rec.path)) problems.push("path must be a lower-case slug path");
    else if (rec.path !== family.prefix && !rec.path.startsWith(family.prefix + "/")) problems.push(`path outside prefix ${family.prefix}`);
    if (rec?.path && rec.path.length > 300) problems.push("path longer than 300 chars");
    if (rec?.path === family.prefix ? rec.parent != null : rec?.parent !== rec?.path?.slice(0, rec.path.lastIndexOf("/"))) problems.push("parent must be the URL parent (root has parent null)");
    if (!rec?.title || String(rec.title).length < 2) problems.push("title missing");
    if (!rec?.description) problems.push("description missing");
    if (!ISO_DATE.test(String(rec?.lastmod || ""))) problems.push("lastmod must be YYYY-MM-DD");
    if (index.has(rec?.path)) problems.push("duplicate path");
    if (problems.length) {
      fatal.push(`${where}: ${problems.join("; ")}`);
      if (fatal.length > 50) break;
      continue;
    }
    const reason = rejectReason(rec, family, seenContent);
    if (reason) stats.rejected[reason] = (stats.rejected[reason] || 0) + 1;
    else stats.indexable++;
    stats.pages++;
    index.set(rec.path, { parent: rec.parent, sort: Number(rec.sort) || 0, title: String(rec.title), title_ne: rec.title_ne || undefined, indexable: !reason, lastmod: rec.lastmod, family: family.id });
    if (rec.parent) {
      let list = childrenOf.get(rec.parent);
      if (!list) childrenOf.set(rec.parent, (list = []));
      list.push(rec.path);
    }
  }
  if (!index.has(family.prefix)) fatal.push(`${family.id}: adapter must yield a root page at ${family.prefix}`);
}
for (const [parent, kids] of childrenOf) {
  if (!index.has(parent)) fatal.push(`missing parent page ${parent} (needed by ${kids[0]})`);
}
if (fatal.length) {
  console.error(`Explore build failed with ${fatal.length} problem(s):\n  ${fatal.slice(0, 50).join("\n  ")}`);
  process.exit(1);
}

// Sort every child list once: (sort, title).
const ref = (path) => {
  const e = index.get(path);
  return e.title_ne ? { path, title: e.title, title_ne: e.title_ne } : { path, title: e.title };
};
for (const [parent, kids] of childrenOf) {
  kids.sort((a, b) => cmp(index.get(a), index.get(b)));
  kids.forEach((kid, i) => (index.get(kid).pos = i));
  const fam = report.families[index.get(parent).family];
  fam.max_children = Math.max(fam.max_children, kids.length);
}

// ---------- pass 2: write records ----------
if (WRITE_PAGES) await rm(join(OUT, "pages"), { recursive: true, force: true });
const madeDirs = new Set();
const pending = new Set();
async function write(file, text) {
  const dir = dirname(file);
  if (!madeDirs.has(dir)) {
    madeDirs.add(dir);
    await mkdir(dir, { recursive: true });
  }
  const p = writeFile(file, text).finally(() => pending.delete(p));
  pending.add(p);
  if (pending.size >= 128) await Promise.race(pending);
}

const maxChildren = config.max_children;
const halfSiblings = Math.floor(config.max_siblings / 2);
let written = 0;
if (WRITE_PAGES) {
  for (const family of families) {
    const adapter = await adapterFor(family);
    for await (const rec of adapter.records({ root: ROOT })) {
      const entry = index.get(rec.path);
      const ancestors = [];
      for (let p = entry.parent; p; p = index.get(p).parent) ancestors.unshift(ref(p));
      const kids = childrenOf.get(rec.path) || [];
      let siblings = [];
      if (entry.parent) {
        // A window around this page (not always the first N) spreads internal links evenly across a level.
        const level = childrenOf.get(entry.parent);
        const at = entry.pos;
        const from = Math.max(0, Math.min(at - halfSiblings, level.length - config.max_siblings - 1));
        siblings = level.slice(from, from + config.max_siblings + 1).filter((p) => p !== rec.path).slice(0, config.max_siblings).map(ref);
      }
      const record = {
        v: 1,
        family: family.id,
        path: rec.path,
        title: entry.title,
        ...(entry.title_ne ? { title_ne: entry.title_ne } : {}),
        description: String(rec.description),
        ...pick(rec, ["summary", "summary_ne", "facts", "sections", "child_heading", "child_heading_ne", "geo", "website", "links", "source_name", "source_url"]),
        lastmod: rec.lastmod,
        indexable: entry.indexable,
        ancestors,
        children: kids.slice(0, maxChildren).map(ref),
        children_total: kids.length,
        siblings,
      };
      record.hash = short(JSON.stringify(record));
      await write(join(OUT, "pages", `${rec.path}.json`), JSON.stringify(record));
      written++;
    }
  }
  await Promise.all(pending);
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") out[k] = obj[k];
  return out;
}

// ---------- sitemaps ----------
await rm(join(OUT, "sitemaps"), { recursive: true, force: true });
await mkdir(join(OUT, "sitemaps"), { recursive: true });
const shardSize = config.sitemap_shard_size;
if (shardSize > 50_000) throw new Error("sitemap_shard_size must be ≤ 50,000 (sitemaps.org limit)");
const shardEntries = [];
for (const family of families) {
  const paths = [];
  for (const [path, e] of index) if (e.family === family.id && e.indexable) paths.push(path);
  paths.sort(); // stable shard membership between builds
  for (let n = 0; n * shardSize < paths.length; n++) {
    const slice = paths.slice(n * shardSize, (n + 1) * shardSize);
    let lastmod = "";
    const lines = slice.map((p) => {
      const lm = index.get(p).lastmod;
      if (lm > lastmod) lastmod = lm;
      return `  <url><loc>${xmlEsc(SITE + p)}</loc><lastmod>${lm}</lastmod></url>`;
    });
    const file = `sitemap-x-${family.id}-${n}.xml`;
    await writeFile(join(OUT, "sitemaps", file), ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...lines, "</urlset>", ""].join("\n"));
    shardEntries.push({ file, lastmod, urls: slice.length });
  }
}
await writeFile(
  join(OUT, "sitemaps", "sitemap-explore.xml"),
  ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...shardEntries.map((s) => `  <sitemap><loc>${xmlEsc(`${SITE}/${s.file}`)}</loc><lastmod>${s.lastmod}</lastmod></sitemap>`), "</sitemapindex>", ""].join("\n"),
);

// ---------- manifest + report ----------
const totals = { pages: index.size, indexable: [...index.values()].filter((e) => e.indexable).length, sitemap_files: shardEntries.length };
const manifest = { schema: 1, storage_prefix: config.storage_prefix, built_at: new Date().toISOString(), git_sha: process.env.GITHUB_SHA || null, families: Object.fromEntries(Object.entries(report.families).map(([k, v]) => [k, { pages: v.pages, indexable: v.indexable }])), totals };
await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
Object.assign(report, { totals, pages_written: written, sitemaps: shardEntries, seconds: Math.round((Date.now() - started) / 100) / 10, peak_rss_mb: Math.round(process.resourceUsage().maxRSS / 1024) });
await writeFile(join(OUT, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`Explore build: ${totals.pages} pages (${totals.indexable} indexable) in ${families.map((f) => f.id).join(", ")}; ${written} records written; ${shardEntries.length} sitemap file(s); ${report.seconds}s; rss ${report.peak_rss_mb} MB → ${OUT}`);
