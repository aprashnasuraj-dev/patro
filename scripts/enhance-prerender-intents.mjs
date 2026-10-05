import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { TOOL_ROUTES } from "./seo-config.mjs";

const root=process.cwd();
const catalog=JSON.parse(await readFile(resolve(root,"seo/search-intents.json"),"utf8"));
const meta={...(catalog.core||{}),...(catalog.tools||{})};
const esc=(value)=>String(value).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pathToFile=(path)=>path==="/"?resolve(root,"dist/index.html"):resolve(root,"dist",...path.split("/").filter(Boolean),"index.html");
const START="<!-- AAFNAI_INTENT_ENHANCEMENT_START -->";
const END="<!-- AAFNAI_INTENT_ENHANCEMENT_END -->";
const oldBlock=new RegExp(`${START}[\\s\\S]*?${END}`,"g");
const searchIntentLink=/<link\b[^>]*href=["']\/search-intents\.(?:json|txt)["'][^>]*>\s*/gi;

function toolDirectory(){
 const items=TOOL_ROUTES.map((route)=>{
   const item=meta[route];if(!item)throw new Error(`Missing tool metadata for ${route}`);
   return `<li><a href="${esc(route)}"><strong>${esc(item.title)}</strong><span>${esc(item.description||"")}</span></a></li>`;
 }).join("");
 return `<section class="seo-tool-directory" aria-labelledby="seo-tool-directory-title"><h2 id="seo-tool-directory-title">सबै 29 नेपाली टुल्स</h2><p>मिति, भाषा, लेखन, ज्योतिष, वित्त र दैनिक कामका सबै सार्वजनिक उपकरण सीधै खोल्नुहोस्।</p><ul>${items}</ul></section>`;
}
function enhance(html,route){
 html=html.replace(oldBlock,"").replace(searchIntentLink,"");
 if(route!=="/tools")return html;
 const block=`${START}${toolDirectory()}${END}`;
 const nav='<nav aria-label="सम्बन्धित पात्रो पृष्ठहरू">';
 return html.includes(nav)?html.replace(nav,block+nav):html.replace("</article>",block+"</article>");
}

const routes=[...new Set(Object.keys(meta).filter((route)=>route==="/"||route==="/today"||route==="/convert"||route==="/tools"||route==="/rashifal"||route.startsWith("/tools/")))];
let written=0;
for(const route of routes){
 const file=pathToFile(route);
 let html;
 try{html=await readFile(file,"utf8");}catch{continue;}
 await writeFile(file,enhance(html,route),"utf8");written++;
}
if(written<30)throw new Error(`Prerender cleanup touched too few canonical pages: ${written}`);
console.log(`Prerender cleanup preserved user-facing navigation on ${written} canonical pages without visible search-query blocks.`);
await import("./generate-offline-calendar-window.mjs");
await import("./polish-home-prerender.mjs");
await import("./sanitize-seo-output.mjs");
