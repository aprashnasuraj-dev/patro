import { calendarArchiveUnavailable, loadCalendarShard, type CalendarArchiveBackend, type CalendarArchiveEnv } from "./calendar-archive";
import { isIndexableBsYear } from "./seo-window";

type R2ObjectLike = { text(): Promise<string> };
type R2Like = { get(key: string): Promise<R2ObjectLike | null> };
type ArchiveEnv = Record<string, unknown> & CalendarArchiveEnv & { ARCHIVE?: R2Like; PUBLIC_SITE_URL?: string };

const COMMUNITY_PREFIX = "datasets/community/v1";
const PRIMARY_COMMUNITIES = new Set(["lhosar", "tharu", "mithila", "kirat", "hijri"]);
const BS_MONTHS = ["", "बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];

const esc = (value:unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string));
const site = (env:ArchiveEnv) => String(env.PUBLIC_SITE_URL || "https://aafnaipatro.com").replace(/\/+$/, "");
const cleanPath = (pathname:string) => pathname.replace(/\/+$/, "") || "/";
const safeHttp = (value:unknown) => typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : "";

function validAd(value:string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split("-").map(Number);
  const check = new Date(Date.UTC(y,m-1,d));
  return check.getUTCFullYear()===y && check.getUTCMonth()===m-1 && check.getUTCDate()===d;
}
function dateLabel(ad:string) { return new Intl.DateTimeFormat("en-GB", { timeZone:"UTC", weekday:"long", year:"numeric", month:"short", day:"numeric" }).format(new Date(ad+"T00:00:00Z")); }
function tithiText(row:any) { const p=row?.panchang||row?.archive_panchang||{}; const t=p?.tithi||row?.tithi||{}; return typeof t === "string" ? t.trim() : String(t?.ne||t?.name_ne||t?.tithi_name_ne||t?.name||p?.tithi_name_ne||"").trim(); }
function nsText(row:any) { const ns=row?.ns||row?.nepal_sambat||{}; return typeof ns === "string" ? ns : String(ns?.formatted_ne||ns?.formatted||"").trim(); }
function bsLabel(row:any) { const bs=row?.bs||{}; return String(bs?.formatted||[bs?.year,bs?.month,bs?.day].filter(Boolean).join("-")||""); }
function unavailable(kind:string) {
  const response = calendarArchiveUnavailable(`${kind} archive unavailable`);
  return response;
}
function adjacentAd(ad:string, delta:number) {
  const date = new Date(ad+"T00:00:00Z");
  date.setUTCDate(date.getUTCDate()+delta);
  return date.toISOString().slice(0,10);
}
function festivalItems(row:any) {
  const values = [row?.festivals, row?.holidays, row?.holiday, row?.festival].flatMap((value:any) => Array.isArray(value) ? value : value ? [value] : []);
  const seen = new Set<string>();
  return values.map((value:any) => {
    if (typeof value === "string") return { name:value.trim(), slug:"", source:"" };
    return {
      name:String(value?.name_ne||value?.title_ne||value?.name||value?.title||value?.name_en||"").trim(),
      slug:String(value?.slug||value?.key||"").trim(),
      source:safeHttp(value?.source_url||value?.source),
    };
  }).filter((item:any) => item.name && !seen.has(item.name) && Boolean(seen.add(item.name)));
}

async function r2Json(env:ArchiveEnv, key:string) {
  if (!env.ARCHIVE) return null;
  try {
    const object = await env.ARCHIVE.get(key);
    if (!object) return null;
    return JSON.parse(await object.text());
  } catch { return null; }
}

function page(request:Request, env:ArchiveEnv, opts:{ title:string; description:string; body:string; index:boolean; backend:CalendarArchiveBackend; schema?:any; cache?:number }) {
  const canonical = site(env) + cleanPath(new URL(request.url).pathname);
  const schema = opts.schema || { "@context":"https://schema.org", "@type":"WebPage", name:opts.title, description:opts.description, url:canonical };
  const robots = opts.index ? "index,follow,max-snippet:-1,max-image-preview:large" : "noindex,follow";
  const sourceLabel = opts.backend === "r2" ? "Cloudflare R2" : "packaged static archive fallback";
  const html = `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title><meta name="description" content="${esc(opts.description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(opts.title)}"><meta property="og:description" content="${esc(opts.description)}"><meta property="og:url" content="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><style>body{font-family:system-ui,-apple-system,"Noto Sans Devanagari",sans-serif;margin:0;background:#f6f7f4;color:#172019}main{max-width:980px;margin:auto;padding:28px 18px 56px}article{background:#fff;border:1px solid #dfe6df;border-radius:20px;padding:24px}a{color:#176f3b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card{padding:14px;border:1px solid #e2e8e2;border-radius:14px}.badge{display:inline-block;padding:2px 8px;border:1px solid #ccd8cc;border-radius:999px;font-size:.82rem}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #e7ece7;text-align:left;vertical-align:top}nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.meta{color:#667268;font-size:.9rem}</style></head><body><main data-archive-backend="${esc(opts.backend)}"><article>${opts.body}<nav><a href="/">आफ्नै पात्रो</a><a href="/convert">मिति रूपान्तरण</a><a href="/samudaya">समुदाय पात्रो</a><a href="/methodology">पद्धति</a></nav><p class="meta">Versioned public calendar archive served from ${esc(sourceLabel)}.</p></article></main></body></html>`;
  const headers = new Headers({ "content-type":"text/html; charset=utf-8", "cache-control":`public, max-age=300, s-maxage=${opts.cache ?? 86400}, stale-while-revalidate=604800`, "x-content-type-options":"nosniff", "x-patro-backend":opts.backend, "x-robots-tag":opts.index?"index, follow":"noindex, follow" });
  return new Response(request.method==="HEAD"?null:html,{status:200,headers});
}

async function datePage(request:Request, env:ArchiveEnv, ad:string) {
  if (!validAd(ad)) return new Response("Invalid date", { status:400 });
  const source = await loadCalendarShard(request, env, "ad", Number(ad.slice(0,4)));
  if (!source) return unavailable("Calendar");
  const { doc:shard, backend } = source;
  const row = shard.rows.find((item:any) => String(item?.ad||item?.ad_date||"").slice(0,10)===ad);
  if (!row) return new Response("Date outside archive", { status:404, headers:{"x-robots-tag":"noindex, nofollow"} });
  const bsYear = Number(row?.bs?.year), bsMonth=Number(row?.bs?.month)||1;
  const festivals=festivalItems(row);
  const mainFestival=festivals[0]?.name||"";
  const baseTitle=`${bsLabel(row)} · ${dateLabel(ad)}`;
  const title=`${baseTitle}${mainFestival?` · ${mainFestival}`:""} | आफ्नै पात्रो`.slice(0,60);
  const tithi=tithiText(row), ns=nsText(row);
  const description=[`${bsLabel(row)} = ${dateLabel(ad)} (${ad}).`,tithi?`तिथि: ${tithi}.`:"",ns?`नेपाल संवत्: ${ns}.`:"",mainFestival?`पर्व/बिदा: ${mainFestival}.`:""].filter(Boolean).join(" ");
  const prev=adjacentAd(ad,-1),next=adjacentAd(ad,1);
  const festivalHtml=festivals.length?`<section><h2>पर्व वा बिदा</h2><ul>${festivals.map((item:any)=>`<li>${item.slug?`<a href="/festivals/${esc(item.slug)}/${bsYear}">${esc(item.name)}</a>`:esc(item.name)}${item.source?` · <a href="${esc(item.source)}" rel="nofollow noopener">source</a>`:""}</li>`).join("")}</ul></section>`:"";
  const body=`<p><a href="/">Home</a> › <a href="/calendar/${bsYear}">${bsYear}</a> › <a href="/calendar/${bsYear}/${String(bsMonth).padStart(2,"0")}">${esc(BS_MONTHS[bsMonth])}</a> › ${esc(bsLabel(row))}</p><h1>${esc(bsLabel(row))}</h1><p><strong>${esc(dateLabel(ad))}</strong> · ${esc(ad)}</p><div class="grid"><div class="card"><b>वि.सं.</b><div>${esc(bsLabel(row))}</div></div><div class="card"><b>तिथि</b><div>${esc(tithi||"—")}</div></div><div class="card"><b>नेपाल संवत्</b><div>${esc(ns||"—")}</div></div><div class="card"><b>Archive version</b><div>${esc(shard.source_version||"versioned")}</div></div></div>${festivalHtml}<nav aria-label="Date navigation"><a href="/date/${prev}">← अघिल्लो दिन</a><a href="/calendar/${bsYear}/${String(bsMonth).padStart(2,"0")}">यो महिनाको पात्रो</a><a href="/date/${next}">अर्को दिन →</a></nav>`;
  const canonical=site(env)+`/date/${ad}`;
  const graph:any[]=[
    {"@type":"WebPage","@id":canonical+"#page",name:title,description,url:canonical,inLanguage:["ne","en"],about:[{"@type":"Thing",name:"Bikram Sambat"},{"@type":"Thing",name:"Nepal Sambat"}]},
    {"@type":"BreadcrumbList",itemListElement:[
      {"@type":"ListItem",position:1,name:"आफ्नै पात्रो",item:site(env)+"/"},
      {"@type":"ListItem",position:2,name:`नेपाली पात्रो ${bsYear}`,item:site(env)+`/calendar/${bsYear}`},
      {"@type":"ListItem",position:3,name:`${BS_MONTHS[bsMonth]} ${bsYear}`,item:site(env)+`/calendar/${bsYear}/${String(bsMonth).padStart(2,"0")}`},
      {"@type":"ListItem",position:4,name:bsLabel(row),item:canonical}
    ]}
  ];
  for(const festival of festivals) graph.push({"@type":"Event",name:festival.name,startDate:ad,endDate:ad,eventStatus:"https://schema.org/EventScheduled",url:canonical});
  return page(request,env,{title,description,body,index:isIndexableBsYear(bsYear),backend,schema:{"@context":"https://schema.org","@graph":graph}});
}

async function calendarPage(request:Request, env:ArchiveEnv, year:number, month?:number) {
  if (!Number.isInteger(year)||year<1800||year>2200) return new Response("Invalid BS year",{status:400});
  if(month!=null&&(month<1||month>12))return new Response("Invalid month",{status:400});
  const source=await loadCalendarShard(request,env,"bs",year); if(!source)return unavailable("Calendar");
  const { doc:shard, backend }=source;
  const rows=month==null?shard.rows:shard.rows.filter((row:any)=>Number(row?.bs?.month)===month);
  if(!rows.length)return new Response("Calendar unavailable",{status:404,headers:{"x-robots-tag":"noindex, nofollow"}});
  const index=isIndexableBsYear(year);
  if(month==null){
    const grouped=new Map<number,any[]>();for(const row of rows){const m=Number(row?.bs?.month);const list=grouped.get(m)||[];list.push(row);grouped.set(m,list);}
    const cards=Array.from({length:12},(_,i)=>i+1).map((m)=>{const list=grouped.get(m)||[];return `<a class="card" href="/calendar/${year}/${String(m).padStart(2,"0")}"><b>${esc(BS_MONTHS[m])}</b><div>${list.length} days</div><small>${esc(list[0]?.ad||"—")} → ${esc(list.at(-1)?.ad||"—")}</small></a>`}).join("");
    const title=`नेपाली पात्रो ${year} · Aafnai Patro`,description=`वि.सं. ${year} को १२ महिनाको पात्रो: ${rows.length} वास्तविक दिन अभिलेख, AD अवधि ${rows[0]?.ad||"—"} देखि ${rows.at(-1)?.ad||"—"}.`;
    const canonical=site(env)+`/calendar/${year}`;
    const schema={"@context":"https://schema.org","@graph":[{"@type":"WebPage",name:title,description,url:canonical},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"आफ्नै पात्रो",item:site(env)+"/"},{"@type":"ListItem",position:2,name:`नेपाली पात्रो ${year}`,item:canonical}]}]};
    return page(request,env,{title,description,index,backend,schema,body:`<p><a href="/">Home</a> › ${year}</p><h1>${esc(title)}</h1><p>${esc(description)}</p><div class="grid">${cards}</div><p class="meta">Source version: ${esc(shard.source_version||"versioned")}</p>`});
  }
  const monthName=BS_MONTHS[month]||`Month ${month}`;
  const holidayRows=rows.filter((row:any)=>festivalItems(row).length);
  const items=rows.map((row:any)=>{const festivals=festivalItems(row);return `<tr><td><a href="/date/${esc(row.ad)}">${esc(row?.bs?.day)}</a></td><td>${esc(row.ad)}</td><td>${esc(tithiText(row)||"—")}</td><td>${festivals.map((item:any)=>esc(item.name)).join(", ")||"—"}</td></tr>`}).join("");
  const title=`${monthName} ${year} नेपाली पात्रो | आफ्नै पात्रो`,description=`${monthName} ${year}: ${rows.length} दिन, AD ${rows[0]?.ad||"—"}–${rows.at(-1)?.ad||"—"}, तिथि${holidayRows.length?` र ${holidayRows.length} पर्व/बिदा दिन`:""}.`;
  const canonical=site(env)+`/calendar/${year}/${String(month).padStart(2,"0")}`;
  const schema={"@context":"https://schema.org","@graph":[{"@type":"WebPage",name:title,description,url:canonical},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"आफ्नै पात्रो",item:site(env)+"/"},{"@type":"ListItem",position:2,name:`नेपाली पात्रो ${year}`,item:site(env)+`/calendar/${year}`},{"@type":"ListItem",position:3,name:`${monthName} ${year}`,item:canonical}]}]};
  return page(request,env,{title,description,index,backend,schema,body:`<p><a href="/">Home</a> › <a href="/calendar/${year}">${year}</a> › ${esc(monthName)}</p><h1>${esc(title)}</h1><table><thead><tr><th>BS day</th><th>AD</th><th>तिथि</th><th>पर्व/बिदा</th></tr></thead><tbody>${items}</tbody></table><p><a href="/calendar/${year}">${year} वार्षिक पात्रो</a></p>`});
}

function festivalName(map:Map<string,any>, id:string){const row=map.get(id);return String(row?.dev||row?.name_ne||row?.roman||row?.en||id);}
async function communityPage(request:Request, env:ArchiveEnv, suite:string, year:number) {
  const doc=await r2Json(env,`${COMMUNITY_PREFIX}/${suite}/${year}.json`);if(!doc||doc?.kind!=="community-year"||!Array.isArray(doc?.dates))return unavailable("Community");
  const festivals=new Map((doc.festivals||[]).map((row:any)=>[String(row?.id||""),row]));
  const rows=[...doc.dates].sort((a:any,b:any)=>String(a?.start_ad||a?.main||"").localeCompare(String(b?.start_ad||b?.main||"")));
  const items=rows.map((row:any)=>{const id=String(row?.festival_id||"");const meta:any=festivals.get(id)||{};const sources=(meta?.sources||[]).map((url:any)=>safeHttp(url)).filter(Boolean);const confidence=String(row?.confidence||"review");const confidenceLabel=confidence==="review"?"Needs further verification":confidence;const status=String(meta?.status||"");const statusLabel=status==="review"?"Needs further verification":status;return `<tr><td>${esc(festivalName(festivals,id))}</td><td>${esc(row?.start_ad||row?.main||"—")}${row?.end_ad&&row.end_ad!==row.start_ad?` → ${esc(row.end_ad)}`:""}</td><td><span class="badge">${esc(confidenceLabel)}</span>${statusLabel?` <span class="badge">${esc(statusLabel)}</span>`:""}</td><td>${sources.slice(0,2).map((url:string,i:number)=>`<a href="${esc(url)}" rel="nofollow noopener">source ${i+1}</a>`).join(" · ")||"—"}</td></tr>`}).join("");
  const label=String((doc.festivals||[])[0]?.suite||suite).replace(/-/g," ");
  const title=`${label} ${year} समुदाय पात्रो अभिलेख | Aafnai Patro`,description=`${suite} community calendar ${year}: ${rows.length} source/engine-backed observance records from the versioned public archive.`;
  return page(request,env,{title,description,index:true,backend:"r2",body:`<h1>${esc(title)}</h1><p>${esc(description)}</p><table><thead><tr><th>Observance</th><th>Date</th><th>Confidence / status</th><th>Sources</th></tr></thead><tbody>${items}</tbody></table><p><a href="/samudaya/${esc(suite)}">${esc(suite)} मुख्य पात्रो</a></p>`});
}

async function nepalSambatPage(request:Request, env:ArchiveEnv, year:number) {
  const doc=await r2Json(env,`${COMMUNITY_PREFIX}/nepal-sambat/${year}.json`);if(!doc||doc?.kind!=="nepal-sambat-year"||!Array.isArray(doc?.days))return unavailable("Community");
  const festivalMap=new Map((doc.festivals||[]).map((row:any)=>[String(row?.id||row?.festival_id||""),row]));
  const festivalRows=(doc.festival_dates||[]).map((row:any)=>`<tr><td>${esc(festivalName(festivalMap,String(row?.festival_id||row?.id||"")))}</td><td>${esc(row?.start_ad||row?.ad||"—")}${row?.end_ad&&row.end_ad!==row.start_ad?` → ${esc(row.end_ad)}`:""}</td></tr>`).join("");
  const samples=[...doc.days].slice(0,40).map((row:any)=>`<tr><td>${esc(row?.ad||row?.ad_date||"—")}</td><td>${esc(row?.ns_month??row?.month??"—")}</td><td>${esc(row?.ns_paksha??row?.paksha??"—")}</td><td>${esc(row?.ns_tithi??row?.tithi??"—")}</td></tr>`).join("");
  const title=`नेपाल संवत् ${year} वार्षिक अभिलेख | Aafnai Patro`,description=`Nepal Sambat ${year}: ${doc.days.length} archived day mappings and ${(doc.festival_dates||[]).length} festival-date records.`;
  return page(request,env,{title,description,index:true,backend:"r2",body:`<h1>${esc(title)}</h1><p>${esc(description)}</p>${festivalRows?`<h2>पर्व मितिहरू</h2><table><thead><tr><th>पर्व</th><th>AD अवधि</th></tr></thead><tbody>${festivalRows}</tbody></table>`:""}<h2>दिन अभिलेख नमुना</h2><table><thead><tr><th>AD</th><th>महिना</th><th>पक्ष</th><th>तिथि</th></tr></thead><tbody>${samples}</tbody></table><p class="meta">पूर्ण वर्षमा ${doc.days.length} records छन्; मुख्य interactive mandala मा दैनिक रूपान्तरण उपलब्ध छ।</p><p><a href="/nepal-sambat/mandala">नेपाल संवत् मण्डला</a></p>`});
}

export async function publicArchivePageResponse(request:Request, env:ArchiveEnv):Promise<Response|null>{
  if(request.method!=="GET"&&request.method!=="HEAD")return null;
  const path=cleanPath(new URL(request.url).pathname);
  let match=path.match(/^\/date\/(\d{4}-\d{2}-\d{2})$/);if(match)return datePage(request,env,match[1]);
  match=path.match(/^\/calendar\/(\d{4})$/);if(match)return calendarPage(request,env,Number(match[1]));
  match=path.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/);if(match)return calendarPage(request,env,Number(match[1]),Number(match[2]));
  match=path.match(/^\/samudaya\/([a-z-]+)\/(\d{4})$/);if(match&&PRIMARY_COMMUNITIES.has(match[1]))return communityPage(request,env,match[1],Number(match[2]));
  match=path.match(/^\/nepal-sambat\/(\d{3,4})$/);if(match)return nepalSambatPage(request,env,Number(match[1]));
  return null;
}
