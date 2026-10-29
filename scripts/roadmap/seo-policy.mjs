import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const policy = JSON.parse(readFileSync("seo/roadmap-url-policy.json", "utf8"));
const families = policy.families || [];
const names = new Set();
for (const f of families) {
  if (!f.family || !f.pattern || typeof f.indexable !== "boolean" || !f.criteria || !f.lastmod_source) throw new Error("invalid SEO policy family");
  if (names.has(f.family)) throw new Error("duplicate SEO family: " + f.family);
  names.add(f.family);
}
const place = families.find((f) => f.family === "nepalmap-place");
if (!place || place.indexable) throw new Error("Nepal place-page farm guard must remain non-indexable");

const dist = resolve("dist");
if (!existsSync(dist)) throw new Error("dist/ missing; run production build before SEO roadmap gate");

const htmlFiles = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name), s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (p.endsWith(".html") && (p.endsWith("/nepalmap.html") || p.includes("/nepalmap/"))) htmlFiles.push(p);
  }
};
walk(dist);
if (!htmlFiles.length) throw new Error("no built Nepal Map HTML found");

const titles = new Set(), descriptions = new Set(), canonicals = new Set();
for (const path of htmlFiles) {
  const html = readFileSync(path, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1]?.trim();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]?.trim();
  if (!title || !description || !canonical) throw new Error("missing SEO contract in " + path);
  if (titles.has(title)) throw new Error("duplicate title: " + title);
  if (descriptions.has(description)) throw new Error("duplicate description: " + description);
  if (canonicals.has(canonical)) throw new Error("duplicate canonical: " + canonical);
  titles.add(title); descriptions.add(description); canonicals.add(canonical);
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.split(" ").length < 40) throw new Error("thin Nepal Map page: " + path);
}

const sitemapPath = join(dist, "sitemap-nepalmap.xml");
if (!existsSync(sitemapPath)) throw new Error("sitemap-nepalmap.xml missing");
const sitemap = readFileSync(sitemapPath, "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.length > 100) throw new Error("Nepal Map sitemap unexpectedly expanded to " + locs.length + " URLs");
if (locs.some((u) => /\/nepalmap\/place\//.test(u))) throw new Error("place-page farm detected");
for (const lastmod of [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) throw new Error("invalid sitemap lastmod: " + lastmod);
}

console.log("roadmap SEO policy: pass", { families: families.length, map_pages: htmlFiles.length, sitemap_urls: locs.length });
