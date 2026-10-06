type R2ObjectLike = { text(): Promise<string> };
type R2Like = { get(key: string): Promise<R2ObjectLike | null> };
type ArchiveEnv = Record<string, unknown> & { ARCHIVE?: R2Like; PUBLIC_SITE_URL?: string };

const CALENDAR_PREFIX = "datasets/calendar/v1";
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
function currentBsYear() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone:"Asia/Kathmandu", year:"numeric", month:"numeric", day:"numeric" }).formatToParts(new Date()).filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)]));
  const after = Number(parts.month) > 4 || (Number(parts.month) === 4 && Number(parts.day) >= 14);
  return Number(parts.year) + (after ? 57 : 56);
}
function hotBsYear(year:number) { const current=currentBsYear(); return year>=current-2 && year<=current+2; }
function dateLabel(ad:string) { return new Intl.DateTimeFormat("en-GB", { timeZone:"UTC", weekday:"long", year:"numeric", month:"long", day:"numeric" }).format(new Date(ad+"T00:00:00Z")); }
function tithiText(row:any) { const p=row?.panchang||row?.archive_panchang||{}; const t=p?.tithi||row?.tithi||{}; return String(t?.ne||t?.name_ne||t?.tithi_name_ne||t?.name||"").trim(); }
function nsText(row:any) { const ns=row?.ns||row?.nepal_sambat||{}; return typeof ns === "string" ? ns : String(ns?.formatted_ne||ns?.formatted||"").trim(); }
function bsLabel(row:any) { const bs=row?.bs||{}; return String(bs?.formatted||[bs?.year,bs?.month,bs?.day].filter(Boolean).join("-")||""); }

async function r2Json(env:ArchiveEnv, key:string) {
  if (!env.ARCHIVE) return null;
  try {
    const object = await env.ARCHIVE.get(key);
    if (!object) return null;
    return JSON.parse(await object.text());
  } catch { return null; }
}
async function calendarShard(env:ArchiveEnv, calendar:"ad"|"bs", year:number) {
  const doc = await r2Json(env, `${CALENDAR_PREFIX}/${calendar}/${year}.json`);
  if (!doc || Number(doc?.schema)!==1 || doc?.calendar!==calendar || Number(doc?.year)!==year || !Array.isArray(doc?.rows)) return null;
  return doc;
}

function page(request:Request, env:ArchiveEnv, opts:{ title:string; description:string; body:string; index:boolean; schema?:any; cache?:number }) {
  const canonical = site(env) + cleanPath(new URL(request.url).pathname);
  const schema = opts.schema || { "@context":"https://schema.org", "@type":"WebPage", name:opts.title, description:opts.description, url:canonical };
  const robots = opts.index ? "index,follow,max-snippet:-1,max-image-preview:large" : "noindex,follow";
  const html = `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title><meta name="description" content="${esc(opts.description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(opts.title)}"><meta property="og:description" content="${esc(opts.description)}"><meta property="og:url" content="${esc(canonical)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><style>body{font-family:system-ui,-apple-system,"Noto Sans Devanagari",sans-serif;margin:0;background:#f6f7f4;color:#172019}main{max-width:980px;margin:auto;padding:28px 18px 56px}article{background:#fff;border:1px solid #dfe6df;border-radius:20px;padding:24px}a{color:#176f3b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.card{padding:14px;border:1px solid #e2e8e2;border-radius:14px}.badge{display:inline-block;padding:2px 8px;border:1px solid #ccd8cc;border-radius:999px;font-size:.82rem}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #e7ece7;text-align:left;vertical-align:top}nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.meta{color:#667268;font-size:.9rem}</style></head><body><main data-archive-backend="r2"><article>${opts.body}<nav><a href="/">आफ्नै पात्रो</a><a href="/convert">मिति रूपान्तरण</a><a href="/samudaya">समुदाय पात्रो</a><a href="/methodology">पद्धति</a></nav><p class="meta">Immutable public archive served from Cloudflare R2; source mirror is versioned in Git.</p></article></main></body></html>`;
  const headers = new Headers({ "content-type":"text/html; charset=utf-8", "cache-control":`public, max-age=300, s-maxage=${opts.cache ?? 86400}, stale-while-revalidate=604800`, "x-content-type-options":"nosniff", "x-patro-backend":"cloudflare-r2-public-archive", "x-robots-tag":opts.index?"index, follow":"noindex, follow" });
  return new Response(request.method==="HEAD"?null:html,{status:200,headers});
}

async function datePage(request:Request, env:ArchiveEnv, ad:string) {
  if (!validAd(ad)) return new Response("Invalid date", { status:400 });
  const shard = await calendarShard(env, "ad", Number(ad.slice(0,4)));
  if (!shard) return null;
  const row = shard.rows.find((item:any) => String(item?.ad||item?.ad_date||"").slice(0,10)===ad);
  if (!row) return new Response("Date outside archive", { status:404, headers:{"x-robots-tag":"noindex, nofollow"} });
  const bsYear = Number(row?.bs?.year);
  // Keep only the small current cohort on the richer prerendered SPA path; all other validated
  // dates are permanent R2 pages and are indexable because existence is proven by this shard.
  if (hotBsYear(bsYear)) return null;
  const title = `${bsLabel(row)} · ${dateLabel(ad)} | Aafnai Patro`;
  const tithi=tithiText(row), ns=nsText(row), description=`${bsLabel(row)} = ${dateLabel(ad)}. ${tithi?`तिथि: ${tithi}. `:""}${ns?`नेपाल संवत्: ${ns}.`:""}`.trim();
  const body=`<h1>${esc(bsLabel(row))}</h1><p><strong>${esc(dateLabel(ad))}</strong> · ${esc(ad)}</p><div class="grid"><div class="card"><b>वि.सं.</b><div>${esc(bsLabel(row))}</div></div><div class="card"><b>तिथि</b><div>${esc(tithi||"—")}</div></div><div class="card"><b>नेपाल संवत्</b><div>${esc(ns||"—")}</div></div><div class="card"><b>Archive version</b><div>${esc(shard.source_version||"versioned")}</div></div></div><p><a href="/calendar/${bsYear}/${String(Number(row?.bs?.month)||1).padStart(2,"0")}">यो महिनाको पात्रो</a> · <a href="/calendar/${bsYear}">${bsYear} वार्षिक पात्रो</a></p>`;
  return page(request,env,{title,description,body,index:true,schema:{"@context":"https://schema.org","@type":"WebPage",name:title,description,url:site(env)+`/date/${ad}`,about:[{"@type":"Thing",name:"Bikram Sambat"},{"@type":"Thing",name:"Nepal Sambat"}]}});
}

async function calendarPage(request:Request, env:ArchiveEnv, year:number, month?:number) {
  if (!Number.isInteger(year)||year<1800||year>2200) return new Response("Invalid BS year",{status:400});
  if(month!=null&&(month<1||month>12))return new Response("Invalid month",{status:400});
  const shard=await calendarShard(env,"bs",year); if(!shard)return null;
  const rows=month==null?shard.rows:shard.rows.filter((row:any)=>Number(row?.bs?.month)===month);
  if(!rows.length)return new Response("Calendar unavailable",{status:404,headers:{"x-robots-tag":"noindex, nofollow"}});
  if(month==null){
    const grouped=new Map<number,any[]>();for(const row of rows){const m=Number(row?.bs?.month);const list=grouped.get(m)||[];list.push(row);grouped.set(m,list);}
    const cards=Array.from({length:12},(_,i)=>i+1).map((m)=>{const list=grouped.get(m)||[];return `<a class="card" href="/calendar/${year}/${String(m).padStart(2,"0")}"><b>${esc(BS_MONTHS[m])}</b><div>${list.length} days</div><small>${esc(list[0]?.ad||"—")} → ${esc(list.at(-1)?.ad||"—")}</small></a>`}).join("");
    const title=`नेपाली पात्रो ${year} · Nepali Calendar ${year} | Aafnai Patro`,description=`Bikram Sambat ${year} को archive-backed १२ महिनाको नेपाली पात्रो; ${rows.length} factual day records.`;
    return page(request,env,{title,description,index:true,body:`<h1>${esc(title)}</h1><p>${esc(description)}</p><div class="grid">${cards}</div><p class="meta">Source version: ${esc(shard.source_version||"versioned")}</p>`});
  }
  const monthName=BS_MONTHS[month]||`Month ${month}`;
  const items=rows.map((row:any)=>`<tr><td><a href="/date/${esc(row.ad)}">${esc(row?.bs?.day)}</a></td><td>${esc(row.ad)}</td><td>${esc(tithiText(row)||"—")}</td></tr>`).join("");
  const title=`${monthName} ${year} नेपाली पात्रो | Aafnai Patro`,description=`${monthName} ${year} का ${rows.length} archive-backed दिन, AD mapping र तिथि.`;
  return page(request,env,{title,description,index:true,body:`<h1>${esc(title)}</h1><table><thead><tr><th>BS day</th><th>AD</th><th>तिथि</th></tr></thead><tbody>${items}</tbody></table><p><a href="/calendar/${year}">${year} वार्षिक पात्रो</a></p>`});
}

function festivalName(map:Map<string,any>, id:string){const row=map.get(id);return String(row?.dev||row?.name_ne||row?.roman||row?.en||id);}
async function communityPage(request:Request, env:ArchiveEnv, suite:string, year:number) {
  const doc=await r2Json(env,`${COMMUNITY_PREFIX}/${suite}/${year}.json`);if(!doc||doc?.kind!=="community-year"||!Array.isArray(doc?.dates))return null;
  const festivals=new Map((doc.festivals||[]).map((row:any)=>[String(row?.id||""),row]));
  const rows=[...doc.dates].sort((a:any,b:any)=>String(a?.start_ad||a?.main||"").localeCompare(String(b?.start_ad||b?.main||"")));
  const items=rows.map((row:any)=>{const id=String(row?.festival_id||"");const meta:any=festivals.get(id)||{};const sources=(meta?.sources||[]).map((url:any)=>safeHttp(url)).filter(Boolean);const confidence=String(row?.confidence||meta?.status||"review");const label=confidence==="review"?"Needs further verification":confidence;return `<tr><td>${esc(festivalName(festivals,id))}</td><td>${esc(row?.start_ad||row?.main||"—")}${row?.end_ad&&row.end_ad!==row.start_ad?` → ${esc(row.end_ad)}`:""}</td><td><span class="badge">${esc(label)}</span></td><td>${sources.slice(0,2).map((url:string,i:number)=>`<a href="${esc(url)}" rel="nofollow noopener">source ${i+1}</a>`).join(" · ")||"—"}</td></tr>`}).join("");
  const label=String((doc.festivals||[])[0]?.suite||suite).replace(/-/g," ");
  const title=`${label} ${year} समुदाय पात्रो अभिलेख | Aafnai Patro`,description=`${suite} community calendar ${year}: ${rows.length} source/engine-backed observance records from the versioned public archive.`;
  return page(request,env,{title,description,index:true,body:`<h1>${esc(title)}</h1><p>${esc(description)}</p><table><thead><tr><th>Observance</th><th>Date</th><th>Confidence</th><th>Sources</th></tr></thead><tbody>${items}</tbody></table><p><a href="/samudaya/${esc(suite)}">${esc(suite)} मुख्य पात्रो</a></p>`});
}

async function nepalSambatPage(request:Request, env:ArchiveEnv, year:number) {
  const doc=await r2Json(env,`${COMMUNITY_PREFIX}/nepal-sambat/${year}.json`);if(!doc||doc?.kind!=="nepal-sambat-year"||!Array.isArray(doc?.days))return null;
  const festivalMap=new Map((doc.festivals||[]).map((row:any)=>[String(row?.id||row?.festival_id||""),row]));
  const festivalRows=(doc.festival_dates||[]).map((row:any)=>`<tr><td>${esc(festivalName(festivalMap,String(row?.festival_id||row?.id||"")))}</td><td>${esc(row?.start_ad||row?.ad||"—")}${row?.end_ad&&row.end_ad!==row.start_ad?` → ${esc(row.end_ad)}`:""}</td></tr>`).join("");
  const samples=[...doc.days].slice(0,40).map((row:any)=>`<tr><td>${esc(row?.ad||row?.ad_date||"—")}</td><td>${esc(row?.ns_month??row?.month??"—")}</td><td>${esc(row?.ns_paksha??row?.paksha??"—")}</td><td>${esc(row?.ns_tithi??row?.tithi??"—")}</td></tr>`).join("");
  const title=`नेपाल संवत् ${year} वार्षिक अभिलेख | Aafnai Patro`,description=`Nepal Sambat ${year}: ${doc.days.length} archived day mappings and ${(doc.festival_dates||[]).length} festival-date records.`;
  return page(request,env,{title,description,index:true,body:`<h1>${esc(title)}</h1><p>${esc(description)}</p>${festivalRows?`<h2>पर्व मितिहरू</h2><table><thead><tr><th>पर्व</th><th>AD अवधि</th></tr></thead><tbody>${festivalRows}</tbody></table>`:""}<h2>दिन अभिलेख नमुना</h2><table><thead><tr><th>AD</th><th>महिना</th><th>पक्ष</th><th>तिथि</th></tr></thead><tbody>${samples}</tbody></table><p class="meta">पूर्ण वर्षमा ${doc.days.length} records छन्; मुख्य interactive mandala मा दैनिक रूपान्तरण उपलब्ध छ।</p><p><a href="/nepal-sambat/mandala">नेपाल संवत् मण्डला</a></p>`});
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
