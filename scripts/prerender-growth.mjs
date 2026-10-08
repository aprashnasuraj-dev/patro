// Cloudflare Free plan: prerender every growth page (moon, eclipses, Nepal-for-the-world, US festivals, Nepal
// weather) into dist/ as static HTML so visitors are served by Workers Static Assets — free and unlimited — and
// the Worker (100,000 requests/day, 10 ms CPU per request) is never invoked for them. Also writes the sitemap.
//
// Freshness: "today" values (moon phase, BS date, weather) are recomputed/fetched in the browser; tables are
// computed for 30–400 days ahead, so pages stay correct between deploys. A daily scheduled deploy
// (.github/workflows/growth-daily-refresh.yml) keeps the server-rendered snapshot current for crawlers.
import { build } from "esbuild";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { BUILD_DATE, updateSitemapIndex, urlsetXml } from "./sitemap-utils.mjs";
import { SITE } from "./seo-config.mjs";

const root = process.cwd();
const dist = resolve(root, "dist");
const FREE_PLAN_FILE_LIMIT = 20_000; // Workers Static Assets, Free plan: files per Worker version

const bundle = await build({ entryPoints: [resolve(root, "worker/growth/index.ts")], bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const mod = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

await mkdir(resolve(dist,"assets"),{recursive:true});
await copyFile(resolve(root,"public/fonts/nepali-serif-700.woff2"),resolve(dist,"assets/growth-nepali-serif-700-v1.woff2"));
await copyFile(resolve(root,"public/favicon.svg"),resolve(dist,"assets/growth-favicon-v1.svg"));
await copyFile(resolve(root,"public/og-default.png"),resolve(dist,"assets/growth-og-default-v1.png"));
const started = Date.now();
const pages = await mod.growthStaticPages(new Date(), SITE);
for (const page of pages) {
  const file = resolve(dist, page.file);
  if (!file.startsWith(dist + "/")) throw new Error(`Refusing to write outside dist: ${page.file}`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page.html, "utf8");
}

// Exact slash redirects bypass the Worker and preserve any existing redirect file.
const redirectsPath=resolve(dist,"_redirects");let redirects="";try{redirects=await readFile(redirectsPath,"utf8");}catch{}
const existing=new Set(redirects.split("\n"));for(const page of pages){const rule=`${page.route}/ ${page.route} 301`;if(!existing.has(rule))redirects+="\n"+rule;}
await writeFile(redirectsPath,redirects.trim()+"\n");

// Sitemap (public/ for the repo, dist/ for this deploy).
const xml = urlsetXml(pages.map((p) => ({ route: p.route, lastmod: BUILD_DATE })));
await writeFile(resolve(root, "public/sitemap-growth.xml"), xml, "utf8");
await writeFile(resolve(dist, "sitemap-growth.xml"), xml, "utf8");
for (const index of ["public/sitemap.xml", "dist/sitemap.xml"]) {
  try { await updateSitemapIndex(resolve(root, index), [{ file: "sitemap-growth.xml", lastmod: BUILD_DATE }]); } catch { /* dist index may not exist in partial builds */ }
}

// Keep the existing manifest in sync with the additive sitemap index.
for(const target of ["public/seo-manifest.json","dist/seo-manifest.json"]){const file=resolve(root,target);const manifest=JSON.parse(await readFile(file,"utf8"));manifest.sitemap_files=[...new Set([...(manifest.sitemap_files||[]),"sitemap-growth.xml"])];manifest.indexed_growth_route_count=pages.length;await writeFile(file,JSON.stringify(manifest,null,2)+"\n");}

// Free-plan guard: total static files must stay under the per-version limit.
async function countFiles(dir) { let n = 0; for (const e of await readdir(dir, { withFileTypes: true })) n += e.isDirectory() ? await countFiles(join(dir, e.name)) : 1; return n; }
const total = await countFiles(dist);
console.log(`growth prerender: ${pages.length} pages in ${((Date.now() - started) / 1000).toFixed(1)} s; dist now has ${total} files (Free plan limit ${FREE_PLAN_FILE_LIMIT})`);
if (total > FREE_PLAN_FILE_LIMIT - 500) throw new Error(`dist has ${total} files — too close to the Workers Free plan limit of ${FREE_PLAN_FILE_LIMIT}`);
