import { loadCalendarShard, type CalendarArchiveEnv } from "./calendar-archive";

type AssetBinding = { fetch(request: Request): Promise<Response> };
type Env = Record<string, unknown> & CalendarArchiveEnv & { ASSETS?: AssetBinding; PUBLIC_SITE_URL?: string };
type CommunityEvent = {
  suite:string; festival_id:string; year:number; main:string; start_ad:string; end_ad:string;
  region?:string|null; confidence:string; dev:string; roman?:string|null; en?:string|null;
  summary?:string|null; details:string[]; places:string[]; communities:string[]; holiday?:string|null;
  status?:string|null; announced?:boolean|null; rule?:Record<string,unknown>|null; sources:string[];
  route:string; previous_route?:string|null; next_route?:string|null;
};
type CommunityIndex = { schema:number; count:number; source_date?:string; events:Record<string,CommunityEvent> };

let cache: CommunityIndex | null = null;
const esc = (value:unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));
const site = (env:Env) => String(env.PUBLIC_SITE_URL || "https://aafnaipatro.com").replace(/\/+$/, "");
const cleanPath = (pathname:string) => pathname.replace(/\/+$/, "") || "/";

async function loadIndex(request:Request, env:Env):Promise<CommunityIndex|null>{
  if (cache) return cache;
  if (!env.ASSETS) return null;
  try {
    const url = new URL(request.url); url.pathname = "/data/community-event-index.json"; url.search = ""; url.hash = "";
    const response = await env.ASSETS.fetch(new Request(url.toString(), { method:"GET" }));
    if (!response.ok) return null;
    const doc = await response.json() as CommunityIndex;
    if (Number(doc?.schema) !== 1 || Number(doc?.count) < 1000 || !doc?.events) return null;
    cache = doc;
    return doc;
  } catch { return null; }
}

function labelDate(ad:string){
  try { return new Intl.DateTimeFormat("en-GB", { timeZone:"UTC", weekday:"long", year:"numeric", month:"long", day:"numeric" }).format(new Date(`${ad}T00:00:00Z`)); }
  catch { return ad; }
}
function titleCase(value:string){ return value.replace(/[._-]+/g," ").replace(/\b\w/g,(c)=>c.toUpperCase()); }
function primitive(value:unknown){ return value == null || ["string","number","boolean"].includes(typeof value); }
function flatten(value:any, prefix:string, out:Array<[string,string]>, depth=0){
  if (value == null || depth > 6) return;
  if (primitive(value)) { const text=String(value).trim(); if(text) out.push([prefix,text]); return; }
  if (Array.isArray(value)) { if(value.every(primitive)){ const text=value.filter((v)=>v!=null&&String(v).trim()).map(String).join(", "); if(text) out.push([prefix,text]); return; } value.forEach((item,index)=>flatten(item,`${prefix} ${index+1}`.trim(),out,depth+1)); return; }
  if (typeof value === "object") for (const [key,item] of Object.entries(value)) flatten(item,prefix?`${prefix} · ${titleCase(key)}`:titleCase(key),out,depth+1);
}
function factTable(value:any, empty="—"){
  const rows:Array<[string,string]>=[]; flatten(value,"",rows);
  if(!rows.length) return `<p>${esc(empty)}</p>`;
  return `<table><tbody>${rows.map(([key,val])=>`<tr><th>${esc(key||"Value")}</th><td>${esc(val)}</td></tr>`).join("")}</tbody></table>`;
}
async function loadCalendarDay(request:Request, env:Env, ad:string){
  const year=Number(ad.slice(0,4));
  if(!Number.isInteger(year)) return null;
  const source=await loadCalendarShard(request,env,"ad",year);
  if(!source) return null;
  const row=source.doc.rows.find((item:any)=>String(item?.ad||item?.ad_date||"").slice(0,10)===ad);
  return row ? {row, backend:source.backend} : null;
}
function sourceLinks(event:CommunityEvent){
  if(!event.sources.length) return "";
  return `<section class="card"><h2>स्रोत / Sources</h2><ul>${event.sources.map((url)=>{let host=url;try{host=new URL(url).hostname.replace(/^www\./,"")}catch{}return `<li><a href="${esc(url)}" rel="nofollow noopener">${esc(host)}</a></li>`}).join("")}</ul></section>`;
}

export async function communityEventPageResponse(request:Request, env:Env):Promise<Response|null>{
  if(request.method!=="GET"&&request.method!=="HEAD") return null;
  const path=cleanPath(new URL(request.url).pathname);
  const match=path.match(/^\/samudaya\/(lhosar|tharu|mithila|kirat|hijri)\/([a-z0-9-]{2,80})\/(\d{4})\/(\d{4}-\d{2}-\d{2})$/);
  if(!match) return null;
  const index=await loadIndex(request,env);
  if(!index) return new Response("Community event index unavailable",{status:503,headers:{"cache-control":"no-store","retry-after":"300","x-robots-tag":"noindex, nofollow"}});
  const event=index.events[path];
  if(!event) return new Response("Community observance not found",{status:404,headers:{"cache-control":"public, max-age=300","x-robots-tag":"noindex, nofollow"}});

  const day=await loadCalendarDay(request,env,event.main);
  const calendar:any=day?.row || null;
  const bs=calendar?.bs || null;
  const ns=calendar?.ns || calendar?.nepal_sambat || null;
  const panchang=calendar?.panchang || calendar?.archive_panchang || null;
  const canonical=site(env)+path;
  const titleName=event.roman || event.en || event.dev;
  const title=`${event.dev} ${event.year} (${titleName}) – मिति, समुदाय र पात्रो | आफ्नै पात्रो`;
  const description=`${event.dev} ${event.year}: ${labelDate(event.main)}. ${event.summary || "नेपालको समुदाय पात्रोमा सुरक्षित गरिएको वर्षगत पर्व/अवलोकन विवरण।"}`;
  const dateWindow=event.start_ad===event.end_ad?labelDate(event.main):`${labelDate(event.start_ad)} – ${labelDate(event.end_ad)}`;
  const confidenceLabel=event.announced===true?"announced / घोषित":event.confidence;
  const schema={"@context":"https://schema.org","@graph":[
    {"@type":"WebPage",name:title,description,url:canonical,inLanguage:["ne","en"],about:{"@type":"Thing",name:event.dev,alternateName:[event.roman,event.en].filter(Boolean)},isPartOf:{"@type":"WebSite",name:"Aafnai Patro",url:site(env)+"/"}},
    {"@type":"BreadcrumbList",itemListElement:[
      {"@type":"ListItem",position:1,name:"आफ्नै पात्रो",item:site(env)+"/"},
      {"@type":"ListItem",position:2,name:"समुदाय पात्रो",item:site(env)+"/samudaya"},
      {"@type":"ListItem",position:3,name:event.dev,item:canonical}
    ]}
  ]};

  const calendarSection=day?`<section class="card"><h2>त्यो दिनको पूर्ण पात्रो / Full day calendar</h2><div class="grid"><div><b>AD</b><br>${esc(labelDate(event.main))}</div><div><b>BS</b><br>${esc(bs?.formatted||bs?.formatted_ne||[bs?.year,bs?.month,bs?.day].filter(Boolean).join("-")||"—")}</div><div><b>Nepal Sambat</b><br>${esc(typeof ns==="string"?ns:(ns?.formatted_ne||ns?.formatted||"—"))}</div><div><b>Archive</b><br>${esc(day.backend)}</div></div><h3>Panchang</h3>${factTable(panchang,"Panchang field उपलब्ध छैन")}<details><summary>Nepal Sambat record</summary>${factTable(ns)}</details><p><a href="/date/${esc(event.main)}">यस दिनको पूर्ण पात्रो पृष्ठ खोल्नुहोस् →</a></p></section>`:`<section class="card"><h2>मिति / Date</h2><p>${esc(dateWindow)}</p><p>यो precomputed community calendar occurrence हो। यस मितिका लागि immutable full-day archive उपलब्ध भएमा मुख्य date page मा पूर्ण Panchang देखिन्छ।</p><p><a href="/date/${esc(event.main)}">दिनको पात्रो जाँच गर्नुहोस् →</a></p></section>`;

  const body=`<article class="hero"><p><a href="/">आफ्नै पात्रो</a> › <a href="/samudaya">समुदाय पात्रो</a> › <a href="/samudaya/${esc(event.suite)}">${esc(titleCase(event.suite))}</a></p><h1>${esc(event.dev)} ${event.year}</h1>${event.roman||event.en?`<p class="lead">${esc([event.roman,event.en].filter(Boolean).join(" · "))}</p>`:""}<div class="badges"><span>${esc(dateWindow)}</span><span>${esc(confidenceLabel)}</span>${event.holiday?`<span>${esc(event.holiday)} holiday</span>`:""}${event.status?`<span>${esc(event.status)}</span>`:""}</div>${event.summary?`<p>${esc(event.summary)}</p>`:""}</article>${event.communities.length||event.places.length||event.details.length?`<section class="card"><h2>समुदाय, स्थान र परम्परा</h2>${event.communities.length?`<p><strong>समुदाय:</strong> ${event.communities.map(esc).join(" · ")}</p>`:""}${event.places.length?`<p><strong>मुख्य स्थान:</strong> ${event.places.map(esc).join(" · ")}</p>`:""}${event.details.length?`<ul>${event.details.map((item)=>`<li>${esc(item)}</li>`).join("")}</ul>`:""}</section>`:""}${event.rule?`<section class="card"><h2>मिति निर्धारण नियम</h2>${factTable(event.rule)}</section>`:""}${calendarSection}${sourceLinks(event)}<nav class="links">${event.previous_route?`<a href="${esc(event.previous_route)}">← अघिल्लो occurrence</a>`:""}<a href="/samudaya/${esc(event.suite)}">समुदाय पात्रो</a>${event.next_route?`<a href="${esc(event.next_route)}">अर्को occurrence →</a>`:""}<a href="/">आफ्नै पात्रो</a></nav>`;

  const html=`<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><style>body{font-family:system-ui,-apple-system,"Noto Sans Devanagari",sans-serif;margin:0;background:#f3f6f1;color:#162018}main{max-width:980px;margin:auto;padding:28px 16px 64px}.hero,.card{background:#fff;border:1px solid #dce6dd;border-radius:22px;padding:22px;margin-bottom:18px;box-shadow:0 10px 32px rgba(26,82,43,.06)}h1{font-size:clamp(2rem,5vw,3.6rem);margin:.25em 0}.lead{font-size:1.1rem;color:#59655c}.badges{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.badges span{border:1px solid #ccd8cc;border-radius:999px;padding:6px 10px;background:#f8fbf8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:14px 0}.grid>div{border:1px solid #e2e9e3;border-radius:14px;padding:12px}a{color:#176f3b}.links{display:flex;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid #dce6dd;border-radius:18px;padding:18px}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #e7ece7;padding:8px}th{width:34%}details{margin-top:14px}</style></head><body><main>${body}</main></body></html>`;
  return new Response(request.method==="HEAD"?null:html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800","x-content-type-options":"nosniff","x-patro-backend":"dynamic-community-event-index","x-robots-tag":"index, follow"}});
}
