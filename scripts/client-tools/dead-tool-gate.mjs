import{readFile,stat,readdir}from"node:fs/promises";
import{resolve,join}from"node:path";
const root=process.cwd(),dist=resolve(root,"dist"),tools=JSON.parse(await readFile(resolve(root,"client-tools/tools.json"),"utf8")),errors=[];
const sitemap=await readFile(resolve(dist,"sitemap-client-tools.xml"),"utf8");
async function exists(path){try{await stat(path);return true}catch{return false}}
async function collectHtml(dir,out=[]){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await collectHtml(p,out);else if(e.name.endsWith(".html"))out.push(await readFile(p,"utf8"))}return out}
const advanced=(await exists(resolve(dist,"advancetools")))?(await collectHtml(resolve(dist,"advancetools"))).join("\n"):"";
const advancedAppSource=await readFile(resolve(root,"tools/advancetools/src/app.mjs"),"utf8").catch(()=>"");
if(/history\.(?:pushState|replaceState)|addEventListener\(\s*["']popstate["']/.test(advancedAppSource))errors.push("Advanced Tools must use native document navigation for deep links/back-forward");

for(const t of tools){
 if(!/^\/tool\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.slug))errors.push("bad direct route "+t.slug);
 const page=resolve(dist,...t.slug.split("/").filter(Boolean),"index.html"),engine=resolve(dist,"client-tools","engines",t.engine+".mjs");
 if(!await exists(page)){errors.push("missing page "+t.slug);continue}
 if(!await exists(engine))errors.push("missing engine "+t.engine+" for "+t.slug);
 const html=await readFile(page,"utf8");
 if(!html.includes('id="ct-tool"'))errors.push("missing tool mount "+t.slug);
 if(!html.includes('"engine":"'+t.engine+'"')||!html.includes('"operation":"'+t.operation+'"'))errors.push("bad runtime config "+t.slug);
 if(!html.includes('<link rel="canonical" href="https://aafnaipatro.com'+t.slug+'">'))errors.push("bad canonical "+t.slug);
 if(!sitemap.includes("<loc>https://aafnaipatro.com"+t.slug+"</loc>"))errors.push("missing sitemap "+t.slug);
 if(!advanced.includes('href="'+t.slug+'"')&&!advanced.includes('"route":"'+t.slug+'"'))errors.push("not linked from Advanced Tools "+t.slug);if(advanced.includes('href="/advancetools'+t.slug+'"'))errors.push("nested Advanced Tools link "+t.slug);
}
if(advanced.includes("/advancetools/tool/")||advanced.includes("/advancetools/tools/"))errors.push("nested tool URL found in Advanced Tools output");
if(errors.length){console.error(errors.slice(0,120).join("\n"));process.exit(1)}
console.log("Dead-tool gate PASS: every direct client tool has page, engine, canonical, sitemap, Advanced Tools discovery and native-history navigation");
