#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const root=resolve(process.argv[2]||"public/nepalmap/place"),out=resolve(process.argv[3]||"docs/verification/nepal-entity-page-audit.json");
let files=[];try{files=(await readdir(root)).filter(x=>x.endsWith(".html"));}catch{}
const titles=new Map(),descs=new Map(),h1s=new Map(),rows=[];
const plain=s=>String(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&[a-z#0-9]+;/gi," ").replace(/\s+/g," ").trim();
const one=(html,re)=>(html.match(re)||[])[1]||"";
for(const file of files){
 const html=await readFile(join(root,file),"utf8"),title=one(html,/<title>([\s\S]*?)<\/title>/i),desc=one(html,/<meta\s+name="description"\s+content="([^"]*)"/i),h1=plain(one(html,/<h1[^>]*>([\s\S]*?)<\/h1>/i)),body=plain(one(html,/<main[^>]*>([\s\S]*?)<\/main>/i)),words=body?body.split(/\s+/).length:0;
 let schemaOk=false;for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)){try{const j=JSON.parse(m[1]);const g=j["@graph"]||[j];if(g.some(x=>x?.["@type"]==="Place"&&x?.geo?.["@type"]==="GeoCoordinates"&&x?.identifier))schemaOk=true;}catch{}}
 const row={file,title,description:desc,h1,content_words:words,schema_ok:schemaOk,has_osm:/OpenStreetMap/.test(html),has_correction:/\/corrections\?/.test(html),thin:words<80};rows.push(row);
 for(const [map,key] of [[titles,title],[descs,desc],[h1s,h1]]){if(!map.has(key))map.set(key,[]);map.get(key).push(file);}
}
const dup=m=>[...m.entries()].filter(([k,v])=>k&&v.length>1).map(([value,files])=>({value,files}));
const report={schema_version:1,generated_at:new Date().toISOString(),pages:rows.length,summary:{schema_valid:rows.filter(x=>x.schema_ok).length,thin_under_80_words:rows.filter(x=>x.thin).length,with_osm_source:rows.filter(x=>x.has_osm).length,with_correction_link:rows.filter(x=>x.has_correction).length},duplicates:{title:dup(titles),description:dup(descs),h1:dup(h1s)},pages_detail:rows,note:"Thin-page threshold is a review signal, not an SEO truth. Duplicate titles/descriptions/H1s or missing Place+GeoCoordinates schema are hard review failures."};
await writeFile(out,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({out,pages:report.pages,summary:report.summary,duplicate_counts:Object.fromEntries(Object.entries(report.duplicates).map(([k,v])=>[k,v.length]))},null,2));
if(!rows.length||rows.some(x=>!x.schema_ok||!x.has_osm)||Object.values(report.duplicates).some(x=>x.length))process.exitCode=2;
