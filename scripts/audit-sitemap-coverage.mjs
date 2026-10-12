// Build-only coverage gate. Never calls Workers, R2, Cloudflare or third parties.
// Keeps existing sitemap exclusions for private, redirected and noindex routes.
import {readFile,readdir} from "node:fs/promises";
import {resolve,join} from "node:path";
import {SITE,CORE_INDEX_ROUTES,TOOL_ROUTES,sitemapExclusionReason} from "./seo-config.mjs";
import {parseSitemapIndex} from "./sitemap-utils.mjs";
const root=process.cwd(), errors=[], info={};
const read=(p)=>readFile(resolve(root,p),"utf8");
const locs=(xml)=>[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,"&"));
const canonical=(value)=>{try{const u=new URL(value);return u.origin===SITE&&!u.search&&!u.hash?u.pathname:null}catch{return null}};
const index=await read("dist/sitemap.xml");
const entries=parseSitemapIndex(index);
const known=new Set(), seenFiles=new Set();
for(const entry of entries){
 if(!entry.file||seenFiles.has(entry.file)){errors.push("Duplicate or invalid sitemap: "+entry.file);continue}
 seenFiles.add(entry.file);
 const xml=await read("dist/"+entry.file);
 if(/<sitemapindex[\s>]/.test(xml)||!/<urlset[\s>]/.test(xml))errors.push("Nested/non-URL-set sitemap: "+entry.file);
 for(const link of locs(xml)){const p=canonical(link);if(!p)errors.push("Noncanonical sitemap loc: "+link);else known.add(p)}
}
for(const path of new Set([...CORE_INDEX_ROUTES,...TOOL_ROUTES])){
 if(sitemapExclusionReason(path))errors.push("Core/tool route unexpectedly excluded by SEO config: "+path);
 else if(!known.has(path))errors.push("Omitted canonical core/tool page: "+path);
}
const dir=resolve(root,"public/advancetools");const html=[];
async function walk(path){for(const f of await readdir(path,{withFileTypes:true})){const full=join(path,f.name);if(f.isDirectory())await walk(full);else if(f.isFile()&&f.name==="index.html"){const rel=full.slice(dir.length).split("\\").join("/");html.push("/advancetools"+rel.replace(/index\.html$/,""))}}}
await walk(dir);
const advancedList=locs(await read("public/advancetools/sitemap.xml")).map(canonical);
const advancedSet=new Set(advancedList);
for(const path of html)if(!advancedSet.has(path))errors.push("Advanced Tools HTML omitted: "+path);
const htmlSet=new Set(html);
for(const path of advancedSet)if(!path||!htmlSet.has(path))errors.push("Advanced Tools sitemap URL not backed by HTML: "+path);
if(advancedList.length!==advancedSet.size)errors.push("Advanced Tools duplicated sitemap locs");
const robots=await read("dist/robots.txt");
const roots=["sitemap.xml","sitemap-explore.xml","sitemap-places.xml","sitemap-nepalmap.xml","advancetools/sitemap.xml","sitemap-worldcal.xml","sitemap-atlas.xml"];
for(const name of roots)if(!robots.includes("Sitemap: "+SITE+"/"+name))errors.push("Sitemap family missing from robots.txt: "+name);
for(const route of ["/api/","/compat-api/","/me/","/admin/","/auth/"])if(!robots.includes("Disallow: "+route))errors.push("Private route crawl boundary missing: "+route);
Object.assign(info,{mainChildren:seenFiles.size,mainUniquePageUrls:known.size,advancedHtml:html.length,advancedSitemap:advancedList.length,discoveryRoots:roots.length,errors:errors.length});
console.log("Aafnai Patro sitemap release coverage:",JSON.stringify(info));
if(errors.length){errors.slice(0,50).forEach(e=>console.error(e));process.exitCode=1}
