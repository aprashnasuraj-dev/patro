import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadClientTools } from "../client-tools/catalog.mjs";
import { TOOL_ROUTES } from "../seo-config.mjs";
import { freeToolName } from "./free-seo.mjs";

const root=process.cwd();
const errors=[];
const esc=value=>String(value).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const read=async path=>{try{return await readFile(resolve(root,"dist",path),"utf8")}catch{return ""}};
const check=(html,route,title)=>{
 if(!html){errors.push("Missing HTML "+route);return}
 const canonical="https://aafnaipatro.com"+route;
 if(!html.includes('rel="canonical" href="'+canonical+'"'))errors.push("Canonical mismatch "+route);
 if(!html.includes("<h1>"+esc(freeToolName(title))+"</h1>"))errors.push("Free H1 missing "+route);
 const meta=html.match(/<title>([^<]*)<\/title>/i)?.[1]||"";
 if(!/^Free\s/i.test(meta.replaceAll("&amp;","&")))errors.push("Free SEO title missing "+route);
 if(!html.includes('src="/tool-analytics.mjs"'))errors.push("Tool analytics script missing "+route);
 if(/<meta\s+name="robots"\s+content="noindex/i.test(html))errors.push("Unexpected noindex "+route);
};
const clients=await loadClientTools(root);
for(const item of clients)check(await read(item.slug.slice(1)+"/index.html"),item.slug,item.h1);
const mm=(JSON.parse(await readFile(resolve(root,"src/mm530/mm530-registry.json"),"utf8"))).tools;
for(const item of mm)check(await read(item.route.slice(1)+".html"),item.route,item.title);
const specialist=(JSON.parse(await readFile(resolve(root,"public/advancetools/module-manifest.json"),"utf8"))).routes.filter(r=>r.kind!=="hub");
for(const item of specialist)check(await read(item.path.replace(/^\//,"")+"index.html"),item.path,item.title);
const legacy=JSON.parse(await readFile(resolve(root,"seo/search-intents.json"),"utf8")).tools;
for(const route of TOOL_ROUTES){
 const item=legacy[route];if(!item){errors.push("Missing legacy SEO intent "+route);continue}
 check(await read(route.slice(1)+"/index.html"),route,item.title);
}
const count=clients.length+mm.length+specialist.length+TOOL_ROUTES.length;
if(count!==3120)errors.push("Expected 3120 tool leaves, got "+count);
if(errors.length){console.error(errors.slice(0,80).join("\n"));console.error("Total issues:",errors.length);process.exitCode=1}
else console.log("Full tool SEO output PASS:",count,"pages, canonical URLs, free titles/headings, bot directives and analytics assets");
