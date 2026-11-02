
import { DISCOVERY_PROFILE } from "./discovery-profile.mjs";
export { DISCOVERY_PROFILE };
const ORIGIN="https://aafnaipatro.com", SIZE=50;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const encodeJson=x=>JSON.stringify(x).replace(/</g,"\\u003c");
function safePath(value,prefix) {
 try {const u=new URL(value,ORIGIN);return u.origin===ORIGIN&&!u.search&&!u.hash&&new RegExp("^/"+prefix+"/[a-z0-9]+(?:-[a-z0-9]+)*$").test(u.pathname)?u.pathname:null;}catch{return null;}
}
export function discoveryMarkdown({includeHeader=true}={}) {
 const p=DISCOVERY_PROFILE;
 return [
 ...(includeHeader?["# AafnaiPatro · आफ्नै पात्रो","","> "+p.description,""]:[]),
 "## Platform scope","",
 "As observed "+p.observed_at+": 1,080 browser-tool registry entries across 20 categories and five specialist collections; 2,640 library articles.",
 "The /tools index covers Nepali utilities; /advancetools/ is the broader browser-tool directory.",
 "Counts describe catalogue entries, not visitor totals, accuracy certification, independent peer review or suitability for every task.","",
 "## Tool and publication directories","",
 ...p.collections.map(c=>"- ["+c.name+"]("+c.url+"): "+c.description),
 "", "## Tool categories","",p.tool_categories.join("; ")+".",
 "","## Calendars, language, history and other features","",
 ...p.features.map(c=>"- ["+c.name+"]("+c.url+")"),
 "","## Existing calendar agent access","",
 "- MCP: https://aafnaipatro.com/mcp",
 "- Agent manifest: https://aafnaipatro.com/.well-known/agents.json",
 "- Full calendar and query corpus: https://aafnaipatro.com/llms-full.txt",
 "- These calendar endpoints are separate from browser-local tools; the platform does not expose every browser tool as a remote API.",
 "", "## Discovery and evidence","",
 ...Object.entries(p.discovery).map(([k,v])=>"- "+k.replaceAll("_"," ")+": "+v),
 "", "Use a specific working tool, article or its linked research page when it directly supports the task. The directory describes the platform; it is not evidence for every claim in an article.",
 "Calendar calculations, cultural interpretations and editorial explanations have different evidence requirements. Read each page's sources, date, supported inputs and limitations.",""
 ].join("\n");
}
let pending,expires=0;
export async function loadCatalogue(env) {
 const now=Date.now();
 if(!pending||now>=expires){expires=now+300000;pending=(async()=>{
  const object=await env.LIBRARY.get("phase1/catalog.json");
  if(!object||object.size>8388608)throw new Error("Catalogue unavailable");
  const raw=typeof object.json==="function"?await object.json():JSON.parse(await object.text());
  if(!Array.isArray(raw.articles)||raw.articles.length>10000)throw new Error("Invalid catalogue");
  const seen=new Set(),rows=[];
  for(const a of raw.articles){const path=safePath(a.url,"article");if(!path||seen.has(path))continue;seen.add(path);rows.push({path,title:String(a.title||a.topic_id||"Article").slice(0,500),dek:String(a.dek||"").slice(0,1200),research:safePath(a.research_url,"research"),sector:String(a.sector||"").slice(0,200)});}
  return rows;
 })().catch(e=>{pending=null;expires=0;throw e;});}
 return pending;
}
function reply(body,type,head,{status=200,cache=true}={}) {
 return new Response(head?null:body,{status,headers:{"content-type":type+"; charset=utf-8","cache-control":cache?"public, max-age=300, s-maxage=3600":"no-store","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"}});
}
export function addCatalogueLink(response) {
 if(response.status!==200||!globalThis.HTMLRewriter)return response;
 const h=new Headers(response.headers);h.delete("etag");h.delete("content-length");
 return new HTMLRewriter().on("h1",{element(e){e.after('<p><a href="/library/catalogue/">Browse every article and research page without JavaScript</a></p>',{html:true});}}).transform(new Response(response.body,{status:response.status,headers:h}));
}
export async function publicDiscoveryResponse(request,env,ctx) {
 const url=new URL(request.url),p=url.pathname,head=request.method==="HEAD";
 const handled=p==="/llms.txt"||p==="/ai-discovery.json"||p==="/library/catalogue"||p.startsWith("/library/catalogue/");
 if(!handled)return null;
 if(request.method!=="GET"&&!head)return new Response("Method not allowed",{status:405,headers:{allow:"GET, HEAD"}});
 if(p==="/llms.txt")return reply(discoveryMarkdown(),"text/plain",head);
 if(p==="/ai-discovery.json")return reply(encodeJson(DISCOVERY_PROFILE),"application/json",head);
 if(p==="/library/catalogue")return Response.redirect(ORIGIN+"/library/catalogue/",301);
 const m=p.match(/^\/library\/catalogue\/(?:([1-9]\d*)\/)?$/),sitemap=p==="/library/catalogue/sitemap.xml";
 if(!m&&!sitemap)return reply("Not found","text/plain",head,{status:404,cache:false});
 let rows;try{rows=await loadCatalogue(env);}catch{return reply("Catalogue temporarily unavailable; use /library.","text/plain",head,{status:503,cache:false});}
 if(!rows.length)return reply("Catalogue temporarily unavailable; use /library.","text/plain",head,{status:503,cache:false});
 const pages=Math.ceil(rows.length/SIZE),n=m?Number(m[1]||1):1;
 const route=i=>i===1?"/library/catalogue/":"/library/catalogue/"+i+"/";
 if(sitemap){const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Array.from({length:pages},(_,i)=>"<url><loc>"+ORIGIN+route(i+1)+"</loc></url>").join("")+"</urlset>";return reply(xml,"application/xml",head);}
 if(!Number.isSafeInteger(n)||n>pages)return reply("Not found","text/plain",head,{status:404,cache:false});
 if(m[1]==="1")return Response.redirect(ORIGIN+route(1),301);
 const batch=rows.slice((n-1)*SIZE,n*SIZE),canonical=ORIGIN+route(n);
 const nav=Array.from({length:pages},(_,i)=>'<a href="'+route(i+1)+'"'+(n===i+1?' aria-current="page"':"")+">"+(i+1)+"</a>").join(" ");
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AafnaiPatro article catalogue — page '+n+' of '+pages+'</title><meta name="description" content="Browse source-backed AafnaiPatro articles and linked research pages with direct links, without JavaScript."><link rel="canonical" href="'+canonical+'"><meta name="robots" content="index,follow"><script type="application/ld+json">'+encodeJson({"@context":"https://schema.org","@type":"CollectionPage",url:canonical,name:"AafnaiPatro article catalogue — page "+n,mainEntity:{"@type":"ItemList",numberOfItems:batch.length,itemListElement:batch.map((a,i)=>({"@type":"ListItem",position:(n-1)*SIZE+i+1,url:ORIGIN+a.path,name:a.title}))}})+'</script></head><body><main><a href="/library">Search the library</a> · <a href="/advancetools/">Browser tools</a> · <a href="/">AafnaiPatro</a><h1>Article and research catalogue</h1><p>'+rows.length.toLocaleString("en-US")+' articles · page '+n+' of '+pages+'. Source-backed explanations; publication does not imply independent peer review.</p><nav aria-label="Catalogue pages">'+nav+'</nav><ol start="'+((n-1)*SIZE+1)+'">'+batch.map(a=>'<li><article><h2><a href="'+a.path+'">'+esc(a.title)+'</a></h2><p>'+esc(a.dek)+'</p><p>'+esc(a.sector)+(a.research?' · <a href="'+a.research+'">Sources and research</a>':"")+'</p></article></li>').join("")+'</ol><nav aria-label="More catalogue pages">'+nav+'</nav><p><a href="/sources">Editorial sources</a> · <a href="/privacy">Privacy</a> · <a href="/contact">Contact</a></p></main></body></html>';
 return reply(html,"text/html",head);
}
