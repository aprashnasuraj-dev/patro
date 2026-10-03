import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { TOOL_ROUTES } from "./seo-config.mjs";

const root=process.cwd();
const graph=JSON.parse(await readFile(resolve(root,"public/search-intents.json"),"utf8"));
const catalog=JSON.parse(await readFile(resolve(root,"seo/search-intents.json"),"utf8"));
const meta={...(catalog.core||{}),...(catalog.tools||{})};
if(!(graph.query_count>=3000))throw new Error(`Prerender intent enhancer requires >=3000 intents; got ${graph.query_count}`);

const esc=(value)=>String(value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pathToFile=(path)=>path==="/"?resolve(root,"dist/index.html"):resolve(root,"dist",...path.split("/").filter(Boolean),"index.html");
const START="<!-- AAFNAI_INTENT_ENHANCEMENT_START -->";
const END="<!-- AAFNAI_INTENT_ENHANCEMENT_END -->";
const oldBlock=new RegExp(`${START}[\\s\\S]*?${END}`,"g");

function usefulQueries(route){
 const rows=Array.isArray(graph.routes?.[route])?graph.routes[route]:[];
 const seen=new Set();
 return rows.map((row)=>String(row.query||"").trim()).filter((q)=>{
   const key=q.toLocaleLowerCase("en-US");
   if(!q||q.length>90||seen.has(key))return false;
   seen.add(key);return true;
 }).slice(0,10);
}
function intentSection(route){
 const queries=usefulQueries(route);
 if(!queries.length)return "";
 return `<section class="seo-related-searches" aria-labelledby="seo-related-searches-title"><h2 id="seo-related-searches-title">सम्बन्धित खोजहरू · Related searches</h2><p>${queries.map((q)=>`<span>${esc(q)}</span>`).join(" · ")}</p></section>`;
}
function toolDirectory(){
 const items=TOOL_ROUTES.map((route)=>{
   const item=meta[route];if(!item)throw new Error(`Missing SEO metadata for ${route}`);
   return `<li><a href="${esc(route)}"><strong>${esc(item.title)}</strong><span>${esc(item.description||"")}</span></a></li>`;
 }).join("");
 return `<section class="seo-tool-directory" aria-labelledby="seo-tool-directory-title"><h2 id="seo-tool-directory-title">सबै 29 नेपाली टुल्स</h2><p>मिति, भाषा, लेखन, ज्योतिष, वित्त र दैनिक कामका सबै सार्वजनिक उपकरण सीधै खोल्नुहोस्।</p><ul>${items}</ul></section>`;
}
function enhance(html,route){
 html=html.replace(oldBlock,"");
 const pieces=[intentSection(route)];
 if(route==="/tools")pieces.push(toolDirectory());
 const block=`${START}${pieces.join("")}${END}`;
 const nav='<nav aria-label="सम्बन्धित पात्रो पृष्ठहरू">';
 html=html.includes(nav)?html.replace(nav,block+nav):html.replace("</article>",block+"</article>");
 const discovery=[
  '<link rel="alternate" type="application/json" href="/search-intents.json" title="Aafnai Patro search intent map" />',
  '<link rel="alternate" type="text/plain" href="/search-intents.txt" title="Aafnai Patro search and AI intent map" />'
 ].join("\n  ");
 if(!html.includes('href="/search-intents.json"'))html=html.replace("</head>",`  ${discovery}\n</head>`);
 return html;
}

const routes=[...new Set(Object.keys(meta).filter((route)=>route==="/"||route==="/today"||route==="/convert"||route==="/tools"||route==="/rashifal"||route.startsWith("/tools/")))];
let written=0;
for(const route of routes){
 const file=pathToFile(route);
 let html;
 try{html=await readFile(file,"utf8");}catch{continue;}
 await writeFile(file,enhance(html,route),"utf8");written++;
}
if(written<30)throw new Error(`Intent enhancer touched too few canonical pages: ${written}`);
console.log(`Prerender intent enhancement added related-search context to ${written} canonical pages and a crawlable 29-tool directory.`);
await import("./polish-home-prerender.mjs");