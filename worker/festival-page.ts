import { loadCalendarShard, type CalendarArchiveBackend, type CalendarArchiveEnv } from "./calendar-archive";

type AssetBinding={fetch(request:Request):Promise<Response>};
type Env=Record<string,unknown>&CalendarArchiveEnv&{ASSETS?:AssetBinding;PUBLIC_SITE_URL?:string};
type FestivalOccurrence={year:number;dates:string[];effects:string[];sources:string[];source_urls:string[];verified_at:string[];record_ids:string[];records?:Array<Record<string,unknown>>};
type FestivalRecord={slug:string;name:string;name_en?:string|null;aliases:string[];years:Record<string,FestivalOccurrence>};
type FestivalIndex={schema:number;count:number;occurrence_count:number;source_date?:string;aliases:Record<string,string>;festivals:Record<string,FestivalRecord>};

type DayRecord={ad:string;row:any;backend:CalendarArchiveBackend};
let cache:FestivalIndex|null=null;

const esc=(value:unknown)=>String(value??"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));
const site=(env:Env)=>String(env.PUBLIC_SITE_URL||"https://aafnaipatro.com").replace(/\/+$/,"");
const cleanPath=(pathname:string)=>pathname.replace(/\/+$/,"")||"/";
const safeHttp=(value:unknown)=>typeof value==="string"&&/^https?:\/\//i.test(value.trim())?value.trim():"";
const titleCase=(value:string)=>value.replace(/[._-]+/g," ").replace(/\b\w/g,(c)=>c.toUpperCase());

async function loadIndex(request:Request,env:Env):Promise<FestivalIndex|null>{
  if(cache)return cache;
  if(!env.ASSETS)return null;
  try{
    const url=new URL(request.url);url.pathname="/data/festival-index.json";url.search="";url.hash="";
    const response=await env.ASSETS.fetch(new Request(url.toString(),{method:"GET"}));
    if(!response.ok)return null;
    const doc=await response.json() as FestivalIndex;
    if(Number(doc?.schema)!==1||!doc?.festivals||!doc?.aliases)return null;
    cache=doc;return doc;
  }catch{return null;}
}

function dateLabel(ad:string){
  return new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",weekday:"long",year:"numeric",month:"long",day:"numeric"}).format(new Date(ad+"T00:00:00Z"));
}
function bsLabel(row:any){
  const bs=row?.bs||{};
  return String(bs?.formatted||bs?.formatted_ne||[bs?.year,bs?.month,bs?.day].filter(Boolean).join("-")||"");
}
function nsLabel(row:any){
  const ns=row?.ns||row?.nepal_sambat||{};
  return typeof ns==="string"?ns:String(ns?.formatted_ne||ns?.formatted||"");
}
function primitive(value:unknown){return value==null||["string","number","boolean"].includes(typeof value);}
function flatten(value:any,prefix:string,out:Array<[string,string]>,depth=0){
  if(value==null||depth>6)return;
  if(primitive(value)){const text=String(value).trim();if(text)out.push([prefix,text]);return;}
  if(Array.isArray(value)){
    if(value.every(primitive)){const text=value.filter((v)=>v!=null&&String(v).trim()).map(String).join(", ");if(text)out.push([prefix,text]);return;}
    value.forEach((item,index)=>flatten(item,`${prefix} ${index+1}`.trim(),out,depth+1));return;
  }
  if(typeof value==="object")for(const [key,item] of Object.entries(value))flatten(item,prefix?`${prefix} · ${titleCase(key)}`:titleCase(key),out,depth+1);
}
function factTable(value:any,empty="—"){
  const rows:Array<[string,string]>=[];flatten(value,"",rows);
  if(!rows.length)return `<p>${esc(empty)}</p>`;
  return `<table><tbody>${rows.map(([key,val])=>`<tr><th>${esc(key||"Value")}</th><td>${esc(val)}</td></tr>`).join("")}</tbody></table>`;
}
function otherDayFacts(row:any){
  const skip=new Set(["ad","ad_date","bs","ns","nepal_sambat","panchang","archive_panchang","festivals","holidays","holiday","festival"]);
  const extra:any={};
  for(const [key,value] of Object.entries(row||{}))if(!skip.has(key)&&value!=null)extra[key]=value;
  return extra;
}
async function loadDays(request:Request,env:Env,dates:string[]):Promise<DayRecord[]>{
  const shards=new Map<number,Awaited<ReturnType<typeof loadCalendarShard>>>();
  const out:DayRecord[]=[];
  for(const ad of dates){
    const year=Number(ad.slice(0,4));
    let source=shards.get(year);
    if(source===undefined){source=await loadCalendarShard(request,env,"ad",year);shards.set(year,source);}
    if(!source)continue;
    const row=source.doc.rows.find((item:any)=>String(item?.ad||item?.ad_date||"").slice(0,10)===ad);
    if(row)out.push({ad,row,backend:source.backend});
  }
  return out;
}

function shell(request:Request,env:Env,opts:{title:string;description:string;body:string;schema:any;backend?:string;index?:boolean}){
  const canonical=site(env)+cleanPath(new URL(request.url).pathname);
  const robots=opts.index===false?"noindex,follow":"index,follow,max-snippet:-1,max-image-preview:large";
  const html=`<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title><meta name="description" content="${esc(opts.description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(opts.title)}"><meta property="og:description" content="${esc(opts.description)}"><meta property="og:url" content="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(opts.schema).replace(/</g,"\\u003c")}</script><style>body{font-family:system-ui,-apple-system,"Noto Sans Devanagari",sans-serif;margin:0;background:#f4f7f3;color:#172019}main{max-width:1040px;margin:auto;padding:28px 16px 64px}article,.day{background:#fff;border:1px solid #dce6dd;border-radius:20px;padding:22px;margin:0 0 18px;box-shadow:0 10px 30px rgba(23,111,59,.06)}h1,h2,h3{line-height:1.25}a{color:#176f3b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card{border:1px solid #e0e8e1;border-radius:14px;padding:13px;background:#fbfdfb}.badge{display:inline-block;padding:4px 9px;border:1px solid #ccd8cc;border-radius:999px;margin:2px 5px 2px 0;font-size:.84rem}.meta{color:#667268;font-size:.92rem}.links{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:8px;border-bottom:1px solid #e8eee8;text-align:left;vertical-align:top}th{width:34%;font-weight:650}details{border-top:1px solid #e5ece6;margin-top:14px;padding-top:12px}summary{cursor:pointer;font-weight:700}</style></head><body><main>${opts.body}<p class="meta">Source: Aafnai Patro validated holiday + immutable calendar archive.</p></main><script type="module" src="/assets/place-festival.js"></script></body></html>`;
  return new Response(request.method==="HEAD"?null:html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin","x-patro-backend":opts.backend||"dynamic-festival-index","x-robots-tag":opts.index===false?"noindex, follow":"index, follow"}});
}

function sourceHtml(occurrence:FestivalOccurrence){
  const links=occurrence.source_urls.filter(safeHttp).map((url)=>`<a href="${esc(url)}" rel="nofollow noopener">${esc((()=>{try{return new URL(url).hostname.replace(/^www\./,"")}catch{return "source"}})())}</a>`);
  const text=occurrence.sources.filter((value)=>!safeHttp(value)).map((value)=>esc(value));
  return [...links,...text].length?`<p><strong>स्रोत:</strong> ${[...links,...text].join(" · ")}</p>`:"";
}

async function hubPage(request:Request,env:Env,index:FestivalIndex){
  const list=Object.values(index.festivals).sort((a,b)=>a.name.localeCompare(b.name));
  const body=`<article><p><a href="/">आफ्नै पात्रो</a> › चाडपर्व</p><h1>चाडपर्व र सार्वजनिक बिदा</h1><p>हरेक festival पृष्ठ वास्तविक holiday र official Panchang record सँग जोडिएको छ। वर्ष छान्दा त्यस दिनको पूर्ण BS/AD, Nepal Sambat, Panchang र source-record तथ्य खुल्छ।</p><div class="grid">${list.map((festival)=>{const years=Object.keys(festival.years).map(Number).sort((a,b)=>b-a);return `<div class="card"><h2><a href="/festivals/${esc(festival.slug)}">${esc(festival.name)}</a></h2>${festival.name_en?`<p>${esc(festival.name_en)}</p>`:""}<p>${years.slice(0,4).map((year)=>`<a class="badge" href="/festivals/${esc(festival.slug)}/${year}">${year}</a>`).join("")}</p></div>`}).join("")}</div></article>`;
  const canonical=site(env)+"/festivals";
  const schema={"@context":"https://schema.org","@type":"CollectionPage",name:"Aafnai Patro Festivals",url:canonical,hasPart:list.map((festival)=>({"@type":"WebPage",name:festival.name,url:`${site(env)}/festivals/${festival.slug}`}))};
  return shell(request,env,{title:"चाडपर्व र सार्वजनिक बिदा · आफ्नै पात्रो",description:"नेपालका source-backed चाडपर्व र सार्वजनिक बिदा: वर्षगत मिति र प्रत्येक दिनको पूर्ण पात्रो/Panchang विवरण।",body,schema});
}

async function identityPage(request:Request,env:Env,festival:FestivalRecord){
  const years=Object.values(festival.years).sort((a,b)=>b.year-a.year);
  const body=`<article><p><a href="/festivals">चाडपर्व</a> › ${esc(festival.name)}</p><h1>${esc(festival.name)}</h1>${festival.name_en&&festival.name_en!==festival.name?`<p>${esc(festival.name_en)}</p>`:""}<p>वर्ष छानेर त्यो पर्व परेको दिन/दिनहरूको पूर्ण पात्रो, तिथि, नक्षत्र, योग, करण, सूर्योदय/सूर्यास्त, Nepal Sambat र उपलब्ध source DB record हेर्नुहोस्।</p><ul>${years.map((item)=>`<li><a href="/festivals/${esc(festival.slug)}/${item.year}"><strong>${item.year}</strong></a> — ${item.dates.map((ad)=>esc(dateLabel(ad))).join(", ")}</li>`).join("")}</ul><div class="links"><a href="/festivals">सबै चाडपर्व</a><a href="/">आफ्नै पात्रो</a></div></article>`;
  const canonical=`${site(env)}/festivals/${festival.slug}`;
  const schema={"@context":"https://schema.org","@type":"CollectionPage",name:festival.name,url:canonical,about:{"@type":"Thing",name:festival.name},hasPart:years.map((item)=>({"@type":"WebPage",name:`${festival.name} ${item.year}`,url:`${canonical}/${item.year}`}))};
  return shell(request,env,{title:`${festival.name} · वर्षगत मिति र पूर्ण पात्रो | आफ्नै पात्रो`,description:`${festival.name} का source-backed वर्षगत मिति र प्रत्येक occurrence दिनको पूर्ण नेपाली पात्रो/Panchang विवरण।`,body,schema});
}

async function occurrencePage(request:Request,env:Env,festival:FestivalRecord,occurrence:FestivalOccurrence){
  const days=await loadDays(request,env,occurrence.dates);
  if(!days.length)return new Response("Festival calendar archive unavailable",{status:503,headers:{"cache-control":"no-store","retry-after":"300","x-robots-tag":"noindex, nofollow"}});
  const backends=new Set(days.map((item)=>item.backend));
  const sections=occurrence.dates.map((ad)=>{
    const item=days.find((day)=>day.ad===ad);
    if(!item)return `<section class="day"><h2>${esc(dateLabel(ad))}</h2><p>Calendar archive row unavailable for this date.</p><p><a href="/date/${esc(ad)}">दिनको पात्रो खोल्नुहोस्</a></p></section>`;
    const row=item.row;const bs=row?.bs||{};const panchang=row?.panchang||row?.archive_panchang||{};const ns=row?.ns||row?.nepal_sambat||{};
    const month=Number(bs?.month)||1;const year=Number(bs?.year)||occurrence.year;
    return `<section class="day"><p class="meta">${esc(ad)} · ${esc(dateLabel(ad))}</p><h2>${esc(festival.name)} — ${esc(bsLabel(row)||ad)}</h2><div class="grid"><div class="card"><b>वि.सं.</b><div>${esc(bsLabel(row)||"—")}</div></div><div class="card"><b>AD</b><div>${esc(dateLabel(ad))}</div></div><div class="card"><b>Nepal Sambat</b><div>${esc(nsLabel(row)||"—")}</div></div><div class="card"><b>Archive backend</b><div>${esc(item.backend)}</div></div></div><h3>पूर्ण Panchang विवरण</h3>${factTable(panchang,"Panchang field उपलब्ध छैन")}<details open><summary>Nepal Sambat / NS record</summary>${factTable(ns)}</details><details><summary>अन्य उपलब्ध day/archive fields</summary>${factTable(otherDayFacts(row))}</details><div class="links"><a href="/date/${esc(ad)}">यो दिनको पूर्ण पात्रो</a><a href="/calendar/${year}/${String(month).padStart(2,"0")}">यो महिनाको पात्रो</a></div></section>`;
  }).join("");
  const title=`${festival.name} ${occurrence.year} · मिति, तिथि र पूर्ण Panchang | आफ्नै पात्रो`;
  const description=`${festival.name} ${occurrence.year}: ${occurrence.dates.map(dateLabel).join(", ")}. प्रत्येक occurrence दिनको BS/AD, Nepal Sambat, source DB record र archive मा उपलब्ध पूर्ण Panchang विवरण।`;
  const canonical=`${site(env)}/festivals/${festival.slug}/${occurrence.year}`;
  const schema={"@context":"https://schema.org","@graph":[{"@type":"WebPage",name:title,description,url:canonical,inLanguage:["ne","en"],about:{"@type":"DefinedTerm",name:festival.name,description:`${festival.name} ${occurrence.year} observance dates`}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"आफ्नै पात्रो",item:site(env)+"/"},{"@type":"ListItem",position:2,name:"चाडपर्व",item:site(env)+"/festivals"},{"@type":"ListItem",position:3,name:festival.name,item:`${site(env)}/festivals/${festival.slug}`},{"@type":"ListItem",position:4,name:String(occurrence.year),item:canonical}]}]};
  const dbRecords=occurrence.records?.length?`<article><h2>Festival / holiday source DB records</h2><p>यो occurrence बनाउन प्रयोग भएका holiday र official Panchang तथ्यका उपलब्ध fields:</p>${factTable(occurrence.records)}</article>`:"";
  const body=`<article><p><a href="/festivals">चाडपर्व</a> › <a href="/festivals/${esc(festival.slug)}">${esc(festival.name)}</a> › ${occurrence.year}</p><h1>${esc(title)}</h1><p>${esc(description)}</p>${occurrence.effects.length?`<p>${occurrence.effects.map((effect)=>`<span class="badge">${esc(effect)}</span>`).join("")}</p>`:""}${sourceHtml(occurrence)}${occurrence.verified_at.length?`<p class="meta">Verified/update record: ${esc(occurrence.verified_at.at(-1))}</p>`:""}</article>${dbRecords}${sections}<article><div class="links"><a href="/festivals/${esc(festival.slug)}">${esc(festival.name)} का अरू वर्ष</a><a href="/festivals">सबै चाडपर्व</a><a href="/">आफ्नै पात्रो</a></div></article>`;
  return shell(request,env,{title,description,body,schema,backend:`dynamic-festival-index+${[...backends].join("+")}`});
}

export async function festivalPageResponse(request:Request,env:Env):Promise<Response|null>{
  if(request.method!=="GET"&&request.method!=="HEAD")return null;
  const url=new URL(request.url);const path=cleanPath(url.pathname);
  if(path!=="/festivals"&&!path.startsWith("/festivals/"))return null;
  const index=await loadIndex(request,env);
  if(!index)return null;
  if(path==="/festivals")return hubPage(request,env,index);
  const match=path.match(/^\/festivals\/([a-z0-9\p{L}-]+)(?:\/(\d{4}))?$/u);
  if(!match)return null;
  const requested=match[1].toLowerCase();const canonicalSlug=index.aliases[requested]||requested;const year=match[2]?Number(match[2]):null;
  const festival=index.festivals[canonicalSlug];
  if(!festival)return new Response("Festival not found",{status:404,headers:{"cache-control":"public, max-age=300","x-robots-tag":"noindex, nofollow"}});
  if(canonicalSlug!==requested){
    url.pathname=year?`/festivals/${canonicalSlug}/${year}`:`/festivals/${canonicalSlug}`;
    return Response.redirect(url.toString(),301);
  }
  if(year==null)return identityPage(request,env,festival);
  const occurrence=festival.years[String(year)];
  if(!occurrence)return new Response("Festival year not found",{status:404,headers:{"cache-control":"public, max-age=300","x-robots-tag":"noindex, nofollow"}});
  return occurrencePage(request,env,festival,occurrence);
}
