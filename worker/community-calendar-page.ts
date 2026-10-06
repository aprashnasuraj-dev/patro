import { loadCalendarShard, type CalendarArchiveEnv } from "./calendar-archive";

type AssetBinding = { fetch(request: Request): Promise<Response> };
type Env = Record<string, unknown> & CalendarArchiveEnv & { ASSETS?: AssetBinding; PUBLIC_SITE_URL?: string };
type Festival = {
  suite:string; id:string; dev?:string|null; roman?:string|null; en?:string|null; summary?:string|null;
  details:string[]; places:string[]; communities:string[]; holiday?:string|null; announced?:boolean|null;
  status?:string|null; sources:string[]; occurrence_keys:string[];
};
type Observance = { suite:string; festival_id:string; year:number; main:string; start_ad:string; end_ad:string; region?:string|null; confidence?:string|null };
type CommunityIndex = {
  schema:number; source_date?:string; count:number; identity_count:number; suite_count:number;
  suites:Record<string,{festival_keys:string[]}>; festivals:Record<string,Festival>; observances:Record<string,Observance>;
};

let cache: CommunityIndex | null = null;
const esc = (value:unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));
const site = (env:Env) => String(env.PUBLIC_SITE_URL || "https://aafnaipatro.com").replace(/\/+$/, "");
const pathOf = (request:Request) => new URL(request.url).pathname.replace(/\/+$/, "") || "/";
const suiteNames:Record<string,string> = {
  "nepal-sambat":"नेपाल संवत्", lhosar:"ल्होसार", tharu:"थारु", mithila:"मिथिला", kirat:"किरात", hijri:"हिजरी"
};
const suiteName = (value:string) => suiteNames[value] || value.replace(/-/g," ").replace(/\b\w/g,(c)=>c.toUpperCase());
const festivalName = (festival:Festival) => festival.dev || festival.roman || festival.en || festival.id.replace(/-/g," ");
const safeHttp = (value:string) => /^https?:\/\//i.test(value || "");

async function loadIndex(request:Request, env:Env):Promise<CommunityIndex|null>{
  if (cache) return cache;
  if (!env.ASSETS) return null;
  try {
    const url = new URL(request.url); url.pathname = "/data/community-calendar-index.json"; url.search = ""; url.hash = "";
    const response = await env.ASSETS.fetch(new Request(url.toString(), { method:"GET", headers:{accept:"application/json"} }));
    if (!response.ok) return null;
    const doc = await response.json() as CommunityIndex;
    if (Number(doc?.schema)!==1 || Number(doc?.count)<1000 || !doc?.festivals || !doc?.observances || !doc?.suites) return null;
    cache = doc;
    return doc;
  } catch { return null; }
}

function dateLabel(ad:string){
  try { return new Intl.DateTimeFormat("en-GB", { timeZone:"UTC", weekday:"long", year:"numeric", month:"long", day:"numeric" }).format(new Date(ad+"T00:00:00Z")); }
  catch { return ad; }
}
function primitive(value:unknown){ return value==null || ["string","number","boolean"].includes(typeof value); }
function flatten(value:any,prefix:string,out:Array<[string,string]>,depth=0){
  if(value==null||depth>5)return;
  if(primitive(value)){const text=String(value).trim();if(text)out.push([prefix,text]);return;}
  if(Array.isArray(value)){
    if(value.every(primitive)){const text=value.filter((v)=>v!=null&&String(v).trim()).map(String).join(", ");if(text)out.push([prefix,text]);return;}
    value.forEach((item,index)=>flatten(item,`${prefix} ${index+1}`.trim(),out,depth+1));return;
  }
  if(typeof value==="object")for(const [key,item] of Object.entries(value))flatten(item,prefix?`${prefix} · ${key}`:key,out,depth+1);
}
function factTable(value:any, empty="—"){
  const rows:Array<[string,string]>=[]; flatten(value,"",rows);
  if(!rows.length)return `<p>${esc(empty)}</p>`;
  return `<table><tbody>${rows.map(([key,val])=>`<tr><th>${esc(key||"Value")}</th><td>${esc(val)}</td></tr>`).join("")}</tbody></table>`;
}
function bsLabel(row:any){
  const bs=row?.bs||{};
  return String(bs?.formatted_ne||bs?.formatted||[bs?.year,bs?.month,bs?.day].filter(Boolean).join("-")||"");
}
function nsLabel(row:any){
  const ns=row?.ns||row?.nepal_sambat||{};
  return typeof ns==="string"?ns:String(ns?.formatted_ne||ns?.formatted||"");
}
async function calendarDay(request:Request, env:Env, ad:string){
  const year=Number(ad.slice(0,4));
  if(!Number.isInteger(year))return null;
  const source=await loadCalendarShard(request,env,"ad",year);
  if(!source)return null;
  const row=source.doc.rows.find((item:any)=>String(item?.ad||item?.ad_date||"").slice(0,10)===ad);
  return row?{row,backend:source.backend}:null;
}
function sourceLinks(festival:Festival){
  const links=festival.sources.filter(safeHttp).map((url)=>`<a href="${esc(url)}" rel="nofollow noopener">${esc((()=>{try{return new URL(url).hostname.replace(/^www\./,"")}catch{return "source"}})())}</a>`);
  return links.length?`<p><strong>Sources:</strong> ${links.join(" · ")}</p>`:"";
}
function shell(request:Request, env:Env, title:string, description:string, body:string, schema:any, backend="dynamic-community-calendar"){
  const canonical=site(env)+pathOf(request);
  const html=`<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><style>body{font-family:system-ui,-apple-system,"Noto Sans Devanagari",sans-serif;margin:0;background:#f5f7f3;color:#172019}main{max-width:1040px;margin:auto;padding:28px 16px 64px}article,.panel{background:#fff;border:1px solid #dfe7df;border-radius:20px;padding:22px;margin-bottom:18px;box-shadow:0 10px 30px rgba(23,111,59,.05)}h1,h2,h3{line-height:1.25}p,li{line-height:1.7}a{color:#176f3b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.card{border:1px solid #e1e9e2;border-radius:14px;padding:14px;background:#fbfdfb}.badge{display:inline-block;padding:4px 9px;border:1px solid #ccd8cc;border-radius:999px;margin:2px 5px 2px 0}.meta{color:#667268;font-size:.93rem}.links{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #e8eee8;text-align:left;vertical-align:top}th{width:34%}</style></head><body><main>${body}<p class="meta">Aafnai Patro community calendar archive · source snapshot ${esc((cache?.source_date)||"")}</p></main></body></html>`;
  return new Response(request.method==="HEAD"?null:html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800","x-content-type-options":"nosniff","x-patro-backend":backend,"x-robots-tag":"index, follow"}});
}

function schemaBase(env:Env,name:string,url:string,crumbs:Array<{name:string;url:string}>){
  return {"@context":"https://schema.org","@graph":[{"@type":"WebPage",name,url,inLanguage:["ne","en"],isPartOf:{"@type":"WebSite",name:"Aafnai Patro",url:site(env)+"/"}},{"@type":"BreadcrumbList",itemListElement:crumbs.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.name,item:item.url}))}]};
}

function hubPage(request:Request,env:Env,index:CommunityIndex){
  const suites=Object.keys(index.suites).sort();
  const body=`<article><p><a href="/">आफ्नै पात्रो</a> › Community Calendar</p><h1>नेपालका समुदाय पात्रो र पर्व अभिलेख</h1><p>${index.count.toLocaleString("en-US")} वटा वर्षगत observance records समुदाय, पर्व र मितिअनुसार उपलब्ध छन्। प्रत्येक वर्षगत पृष्ठमा उपलब्ध स्रोत, समुदाय विवरण र मुख्य दिनको पात्रो/Panchang record जोडिन्छ।</p><div class="grid">${suites.map((suite)=>`<div class="card"><h2><a href="/community-calendar/${esc(suite)}">${esc(suiteName(suite))}</a></h2><p>${index.suites[suite].festival_keys.length} पर्व/observance</p></div>`).join("")}</div></article>`;
  const canonical=site(env)+"/community-calendar";
  return shell(request,env,"Community Calendar Nepal · समुदाय पर्व अभिलेख | आफ्नै पात्रो",`नेपालका ${index.count} समुदायगत पर्व/observance records: ल्होसार, थारु, मिथिला, किरात, हिजरी र नेपाल संवत् परम्पराका वर्षगत मिति र स्रोत।`,body,schemaBase(env,"Community Calendar Nepal",canonical,[{name:"आफ्नै पात्रो",url:site(env)+"/"},{name:"Community Calendar",url:canonical}]));
}
function suitePage(request:Request,env:Env,index:CommunityIndex,suite:string){
  const entry=index.suites[suite]; if(!entry)return null;
  const festivalList=entry.festival_keys.map((key)=>index.festivals[key]).filter(Boolean);
  const body=`<article><p><a href="/community-calendar">Community Calendar</a> › ${esc(suiteName(suite))}</p><h1>${esc(suiteName(suite))} समुदाय पात्रो</h1><div class="grid">${festivalList.map((festival)=>`<div class="card"><h2><a href="/community-calendar/${esc(suite)}/${esc(festival.id)}">${esc(festivalName(festival))}</a></h2>${festival.summary?`<p>${esc(festival.summary)}</p>`:""}<p>${festival.occurrence_keys.length} वर्षगत records</p></div>`).join("")}</div></article>`;
  const canonical=`${site(env)}/community-calendar/${suite}`;
  return shell(request,env,`${suiteName(suite)} समुदाय पात्रो | आफ्नै पात्रो`,`${suiteName(suite)} का source-backed पर्व, वर्षगत मिति, परम्परा र समुदाय पात्रो records।`,body,schemaBase(env,suiteName(suite),canonical,[{name:"आफ्नै पात्रो",url:site(env)+"/"},{name:"Community Calendar",url:site(env)+"/community-calendar"},{name:suiteName(suite),url:canonical}]));
}
function identityPage(request:Request,env:Env,index:CommunityIndex,key:string){
  const festival=index.festivals[key]; if(!festival)return null;
  const occurrences=festival.occurrence_keys.map((occKey)=>({key:occKey,row:index.observances[occKey]})).filter((x)=>x.row).sort((a,b)=>b.row.year-a.row.year||b.row.main.localeCompare(a.row.main));
  const body=`<article><p><a href="/community-calendar/${esc(festival.suite)}">${esc(suiteName(festival.suite))}</a> › ${esc(festivalName(festival))}</p><h1>${esc(festivalName(festival))}</h1>${festival.roman&&festival.roman!==festivalName(festival)?`<p><strong>${esc(festival.roman)}</strong>${festival.en?` · ${esc(festival.en)}`:""}</p>`:""}${festival.summary?`<p>${esc(festival.summary)}</p>`:""}${festival.communities.length?`<p><strong>समुदाय:</strong> ${festival.communities.map(esc).join(" · ")}</p>`:""}${festival.details.length?`<h2>परम्परा र विशेषता</h2><ul>${festival.details.map((v)=>`<li>${esc(v)}</li>`).join("")}</ul>`:""}${festival.places.length?`<p><strong>मुख्य स्थान:</strong> ${festival.places.map(esc).join(" · ")}</p>`:""}${sourceLinks(festival)}<h2>वर्षगत मिति</h2><ul>${occurrences.map(({row})=>`<li><a href="/community-calendar/${esc(row.suite)}/${esc(row.festival_id)}/${row.year}/${esc(row.main)}"><strong>${row.year}</strong> — ${esc(dateLabel(row.main))}</a>${row.confidence?` <span class="meta">(${esc(row.confidence)})</span>`:""}</li>`).join("")}</ul></article>`;
  const canonical=`${site(env)}/community-calendar/${key}`;
  return shell(request,env,`${festivalName(festival)} · वर्षगत मिति र समुदाय पात्रो | आफ्नै पात्रो`,`${festivalName(festival)} का ${occurrences.length} वर्षगत community-calendar records, परम्परा, समुदाय, स्थान र स्रोत।`,body,schemaBase(env,festivalName(festival),canonical,[{name:"आफ्नै पात्रो",url:site(env)+"/"},{name:"Community Calendar",url:site(env)+"/community-calendar"},{name:suiteName(festival.suite),url:`${site(env)}/community-calendar/${festival.suite}`},{name:festivalName(festival),url:canonical}]));
}
async function occurrencePage(request:Request,env:Env,index:CommunityIndex,key:string){
  const row=index.observances[key]; if(!row)return null;
  const festival=index.festivals[`${row.suite}/${row.festival_id}`]; if(!festival)return null;
  const day=await calendarDay(request,env,row.main);
  const panchang=day?.row?.panchang||day?.row?.archive_panchang||null;
  const bs=day?bsLabel(day.row):""; const ns=day?nsLabel(day.row):"";
  const title=`${festivalName(festival)} ${row.year} — ${dateLabel(row.main)} | आफ्नै पात्रो`;
  const duration=row.start_ad!==row.end_ad?`${dateLabel(row.start_ad)} – ${dateLabel(row.end_ad)}`:dateLabel(row.main);
  const body=`<article><p><a href="/community-calendar">Community Calendar</a> › <a href="/community-calendar/${esc(row.suite)}">${esc(suiteName(row.suite))}</a> › <a href="/community-calendar/${esc(row.suite)}/${esc(row.festival_id)}">${esc(festivalName(festival))}</a> › ${row.year}</p><h1>${esc(festivalName(festival))} ${row.year}</h1>${festival.roman||festival.en?`<p>${festival.roman?`<strong>${esc(festival.roman)}</strong>`:""}${festival.en?` · ${esc(festival.en)}`:""}</p>`:""}<div class="grid"><div class="card"><b>मुख्य मिति</b><div>${esc(dateLabel(row.main))}</div></div><div class="card"><b>अवधि</b><div>${esc(duration)}</div></div><div class="card"><b>वि.सं.</b><div>${esc(bs||"Archive BS detail unavailable")}</div></div><div class="card"><b>Nepal Sambat</b><div>${esc(ns||"Archive NS detail unavailable")}</div></div><div class="card"><b>Confidence</b><div>${esc(row.confidence||"recorded")}</div></div>${row.region?`<div class="card"><b>Region</b><div>${esc(row.region)}</div></div>`:""}</div>${festival.summary?`<h2>बारेमा</h2><p>${esc(festival.summary)}</p>`:""}${festival.communities.length?`<p><strong>समुदाय:</strong> ${festival.communities.map(esc).join(" · ")}</p>`:""}${festival.details.length?`<h2>परम्परा / अभ्यास</h2><ul>${festival.details.map((v)=>`<li>${esc(v)}</li>`).join("")}</ul>`:""}${festival.places.length?`<p><strong>सम्बन्धित स्थान:</strong> ${festival.places.map(esc).join(" · ")}</p>`:""}${sourceLinks(festival)}<section class="panel"><h2>त्यो दिनको पात्रो र Panchang</h2>${day?`<p class="meta">Calendar backend: ${esc(day.backend)}</p><div class="grid"><div class="card"><b>AD</b><div>${esc(row.main)}</div></div><div class="card"><b>BS</b><div>${esc(bs||"—")}</div></div><div class="card"><b>Nepal Sambat</b><div>${esc(ns||"—")}</div></div></div><h3>पूर्ण Panchang fields</h3>${factTable(panchang,"Panchang field उपलब्ध छैन")}`:`<p>यो वर्षको immutable day archive उपलब्ध नभए पनि community observance record उपलब्ध छ।</p>`}<div class="links"><a href="/date/${esc(row.main)}">${esc(row.main)} को पूर्ण दिन पात्रो</a><a href="/community-calendar/${esc(row.suite)}/${esc(row.festival_id)}">सबै वर्ष</a></div></section></article>`;
  const canonical=site(env)+pathOf(request);
  const description=`${festivalName(festival)} ${row.year}: ${dateLabel(row.main)}. ${festival.summary||`${suiteName(row.suite)} समुदाय पात्रो record.`}`.slice(0,190);
  const schema=schemaBase(env,`${festivalName(festival)} ${row.year}`,canonical,[{name:"आफ्नै पात्रो",url:site(env)+"/"},{name:"Community Calendar",url:site(env)+"/community-calendar"},{name:suiteName(row.suite),url:`${site(env)}/community-calendar/${row.suite}`},{name:festivalName(festival),url:`${site(env)}/community-calendar/${row.suite}/${row.festival_id}`},{name:String(row.year),url:canonical}]);
  return shell(request,env,title,description,body,schema,day?`dynamic-community-calendar+${day.backend}`:"dynamic-community-calendar");
}

export async function communityCalendarPageResponse(request:Request,env:Env):Promise<Response|null>{
  if(request.method!=="GET"&&request.method!=="HEAD")return null;
  const path=pathOf(request);
  if(path!=="/community-calendar"&&!path.startsWith("/community-calendar/"))return null;
  const index=await loadIndex(request,env);
  if(!index)return new Response("Community calendar index unavailable",{status:503,headers:{"cache-control":"no-store","retry-after":"300","x-robots-tag":"noindex, nofollow"}});
  if(path==="/community-calendar")return hubPage(request,env,index);
  const parts=path.split("/").filter(Boolean).slice(1);
  if(parts.length===1){
    const page=suitePage(request,env,index,parts[0]);
    return page||new Response("Community suite not found",{status:404,headers:{"x-robots-tag":"noindex, nofollow"}});
  }
  if(parts.length===2){
    const page=identityPage(request,env,index,`${parts[0]}/${parts[1]}`);
    return page||new Response("Community festival not found",{status:404,headers:{"x-robots-tag":"noindex, nofollow"}});
  }
  if(parts.length===4&&/^\d{4}$/.test(parts[2])&&/^\d{4}-\d{2}-\d{2}$/.test(parts[3])){
    const page=await occurrencePage(request,env,index,`${parts[0]}/${parts[1]}/${parts[2]}/${parts[3]}`);
    return page||new Response("Community observance not found",{status:404,headers:{"x-robots-tag":"noindex, nofollow"}});
  }
  return new Response("Community calendar route not found",{status:404,headers:{"x-robots-tag":"noindex, nofollow"}});
}
