import { calculateAstronomicalTithi } from "./tithi";
import { fetchCosmicDay } from "./cosmic";
import { radioCatalogResponse, radioStreamResponse } from "./radio";
import { fmResponse } from "./fm";
import { handleJyotishChat } from "./jyotish";
import { dailyWeatherResponse } from "./weather";
import { communityResponse } from "./community";
import { adminResponse } from "./admin";
import { publicApiResponse } from "./public-api";
import { pushResponse } from "./push";
import { privateResponse } from "./private";
import { authResponse } from "./auth";
import { cronResponse, runScheduled } from "./jobs";

type Env = {
  DB?: any;
  CACHE?: any;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  NASA_API_KEY?: string;
  RADIO_RELAY_SECRET?: string;
  TV_RELAY_SECRET?: string;
  Groq_API?: string;
  nvidia_api?: string;
  GROQ_API_KEY?: string;
  GROQ_KEY?: string;
  GROQ_MODEL?: string;
  NVIDIA_NIM_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  NGC_API_KEY?: string;
  NVIDIA_MODEL?: string;
  CALENDAR_COVERAGE_START?: string;
  CALENDAR_COVERAGE_END?: string;
  CALENDAR_SOURCE_VERSION?: string;
  GOOGLE_CLIENT_ID?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  ADMIN_EMAILS?: string;
  ADMIN_GOOGLE_SUBJECTS?: string;
  PUBLIC_SITE_URL?: string;
  CRON_SECRET?: string;
  RASHIFAL_SERVICE_TOKEN?: string;
};

const APOD_PRIMARY="https://science.nasa.gov/wp-json/wp/v2/apod-basic/";
const APOD_LEGACY="https://api.nasa.gov/planetary/apod";
const APOD_FALLBACK="https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/Moon_2026_print.jpg";
const DEFAULT_CSP="default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://geocoding-api.open-meteo.com https://api.open-meteo.com https://cdn.jsdelivr.net https://cloudflareinsights.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://accounts.google.com; manifest-src 'self'; media-src 'self' blob:; worker-src 'self' blob: https://cdn.jsdelivr.net; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
const EMBED_CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self'; img-src 'self' data:; frame-ancestors *; base-uri 'none'; form-action 'self'";

function json(body:unknown,status=200,cache="no-store"){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":cache,"x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"}});
}
function validDate(value:string|null|undefined):value is string{
  if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const[y,m,d]=value.split("-").map(Number),x=new Date(Date.UTC(y,m-1,d));
  return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;
}
function todayNepal(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function daysInclusive(start:string,end:string){return Math.floor((Date.parse(end+"T00:00:00Z")-Date.parse(start+"T00:00:00Z"))/86_400_000)+1}
function parseRecord(row:any){if(!row?.payload)return null;try{return typeof row.payload==="string"?JSON.parse(row.payload):row.payload}catch{return null}}
function syncPayload(date:string,calendar:any){return{success:true,query_date:date,calendars:{gregorian_ad:date,bikram_sambat:calendar.bs?.formatted||"",nepal_sambat:calendar.ns?.formatted||"",bikram_sambat_detail:calendar.bs||null,nepal_sambat_detail:calendar.ns||null},tithi:calendar.panchang?.tithi||null,archive_panchang:calendar.panchang||null}}

async function contentRecord(env:Env,table:string,key:string){if(!env.DB)return null;try{return parseRecord(await env.DB.prepare("select payload from content_records where table_name = ?1 and record_key = ?2 limit 1").bind(table,key).first())}catch{return null}}
async function contentRange(env:Env,table:string,start:string,end:string,limit=100){if(!env.DB)return[];try{const out=await env.DB.prepare("select payload from content_records where table_name = ?1 and record_key >= ?2 and record_key <= ?3 order by record_key asc limit ?4").bind(table,start,end,limit).all();return(out.results||[]).map(parseRecord).filter(Boolean)}catch{return[]}}
async function contentByDay(env:Env,table:string,month:number,day:number,limit=100){if(!env.DB)return[];try{const out=await env.DB.prepare("select payload from content_records where table_name = ?1 and month = ?2 and day = ?3 order by sort_order desc, record_key asc limit ?4").bind(table,month,day,limit).all();return(out.results||[]).map(parseRecord).filter(Boolean)}catch{return[]}}

async function edgeCached(request:Request,ctx:ExecutionContext,ttl:number,producer:()=>Promise<Response>){
  if(request.method!=="GET")return producer();
  const cache=caches.default,key=new Request(request.url,{method:"GET",headers:{accept:request.headers.get("accept")||"*/*"}}),hit=await cache.match(key);
  if(hit)return hit;
  const response=await producer();
  if(!response.ok)return response;
  const headers=new Headers(response.headers);headers.set("cache-control",`public, max-age=${Math.min(ttl,300)}, s-maxage=${ttl}, stale-while-revalidate=${Math.max(ttl,3600)}`);
  const cached=new Response(response.body,{status:response.status,headers});ctx.waitUntil(cache.put(key,cached.clone()));return cached;
}

function cleanExternalText(value:unknown,max=6000){return String(value??"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max)}
function apodFallback(date:string,reason:string){return{title:"NASA चन्द्र दृश्य",explanation:"APOD उपलब्ध नभएको बेला NASA Goddard को उच्च गुणस्तरको चन्द्र दृश्य देखाइएको छ।",media_type:"image",source_media_type:"image",url:APOD_FALLBACK,hdurl:APOD_FALLBACK,date,copyright:"NASA / Goddard Space Flight Center Scientific Visualization Studio",is_fallback:true,fallback_reason:cleanExternalText(reason,300)}}
function youtubeId(value:string):string|null{try{const u=new URL(value);if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]?.slice(0,11)||null;if(u.hostname.includes("youtube.com")){const q=u.searchParams.get("v");if(q)return q.slice(0,11);const parts=u.pathname.split("/").filter(Boolean),marker=parts.findIndex(x=>["embed","shorts","live"].includes(x));if(marker>=0&&parts[marker+1])return parts[marker+1].slice(0,11)}}catch{}return null}
async function apod(env:Env,date:string){
  const cacheKey="apod:"+date;
  if(env.CACHE){try{const cached=await env.CACHE.get(cacheKey,"json");if(cached)return cached}catch{}}
  const apiKey=env.NASA_API_KEY||"DEMO_KEY";let last="NASA_APOD_UNAVAILABLE";
  for(const endpoint of[APOD_PRIMARY,APOD_LEGACY]){
    const url=endpoint+"?api_key="+encodeURIComponent(apiKey)+"&date="+encodeURIComponent(date);
    try{
      const response=await fetch(url,{headers:{accept:"application/json"},signal:AbortSignal.timeout(6500)});if(!response.ok)throw new Error("NASA_HTTP_"+response.status);
      const raw:any=await response.json(),data=Array.isArray(raw)?raw[0]:raw;if(!data||String(data.date||"")!==date||!(data.hdurl||data.url))throw new Error("NASA_DATE_OR_MEDIA_MISMATCH");
      const sourceMedia=data.media_type==="video"?"video":"image";let image=String(data.hdurl||data.url||"");if(sourceMedia==="video"){const id=youtubeId(String(data.url||""));if(!id)return apodFallback(date,"non_youtube_video");image="https://img.youtube.com/vi/"+id+"/maxresdefault.jpg"}
      const normalized={title:cleanExternalText(data.title||"Astronomy Picture of the Day",240),explanation:cleanExternalText(data.explanation||"",6000),media_type:"image",source_media_type:sourceMedia,url:image,hdurl:image,date,copyright:cleanExternalText(data.copyright||"NASA",300),is_fallback:false};
      if(env.CACHE){try{await env.CACHE.put(cacheKey,JSON.stringify(normalized),{expirationTtl:30*86400})}catch{}}return normalized;
    }catch(error){last=String((error as Error)?.message||error)}
  }
  return apodFallback(date,last);
}

async function nativeSync(request:Request,env:Env){
  const url=new URL(request.url),start=url.searchParams.get("start"),end=url.searchParams.get("end"),coverage={ad_start:env.CALENDAR_COVERAGE_START||"1826-04-11",ad_end:env.CALENDAR_COVERAGE_END||"2037-04-13",source_version:env.CALENDAR_SOURCE_VERSION||"patro-archive-v79",rows:77070};
  if(start!=null||end!=null){if(!validDate(start)||!validDate(end))return json({success:false,error:"invalid_range",expected:"start=YYYY-MM-DD&end=YYYY-MM-DD"},400);const count=daysInclusive(start,end);if(count<1||count>62)return json({success:false,error:"range_limit_exceeded",max_days:62},400);const records=await contentRange(env,"astronomy_calendar_map",start,end,62);if(!records.length)return null;const days=records.map((record:any)=>{const calendar=record.payload||record;return syncPayload(calendar.ad||record.ad_date,calendar)});return json({success:true,start_date:start,end_date:end,requested_days:count,returned_days:days.length,days,coverage},200,"public, max-age=60, s-maxage=3600, stale-while-revalidate=86400")}
  const date=url.searchParams.get("date")||todayNepal();if(!validDate(date))return json({success:false,error:"invalid_date",expected:"YYYY-MM-DD"},400);const record:any=await contentRecord(env,"astronomy_calendar_map",date);if(!record)return null;return json(syncPayload(date,record.payload||record),200,"public, max-age=60, s-maxage=3600, stale-while-revalidate=86400");
}
async function nativeTithi(request:Request,env:Env){
  const url=new URL(request.url),date=url.searchParams.get("date")||todayNepal();if(!validDate(date))return json({error:"invalid_date",expected:"YYYY-MM-DD"},400);const lat=url.searchParams.get("lat")==null?27.7172:Number(url.searchParams.get("lat")),lng=url.searchParams.get("lng")==null?85.324:Number(url.searchParams.get("lng"));if(!Number.isFinite(lat)||lat< -90||lat>90)return json({error:"invalid_lat"},400);if(!Number.isFinite(lng)||lng< -180||lng>180)return json({error:"invalid_lng"},400);const record:any=await contentRecord(env,"astronomy_calendar_map",date);if(!record)return null;const calendar=record?.payload||record||null;try{return json(calculateAstronomicalTithi({date,lat,lng,bsFormatted:calendar?.bs?.formatted??null,nsFormatted:calendar?.ns?.formatted??null}),200,"public, max-age=60, s-maxage=1800, stale-while-revalidate=86400")}catch(error){return json({error:String((error as Error)?.message||error)},400)}
}

async function nativeMarketLatest(env:Env,kind:"forex"|"index"){
  if(!env.DB)return null;try{const out=await env.DB.prepare("select payload from content_records where table_name = 'market_snapshots' and category = ?1 order by updated_at desc limit 200").bind(kind).all(),latest=new Map<string,any>();for(const row of out.results||[]){const item=parseRecord(row);if(!item?.asset||!item?.as_of)continue;const previous=latest.get(String(item.asset));if(!previous||String(item.as_of)>String(previous.as_of))latest.set(String(item.asset),item)}const items=Array.from(latest.values()).sort((a:any,b:any)=>String(a.asset).localeCompare(String(b.asset)));if(!items.length)return null;return{ok:true,kind,as_of:items.reduce((max:string,item:any)=>String(item.as_of)>max?String(item.as_of):max,""),source:"Cloudflare D1 migrated market_snapshots",items}}catch{return null}
}
async function nativeToolCatalog(request:Request,env:Env){
  if(!env.DB)return null;try{const includeUpcoming=new URL(request.url).searchParams.get("include")==="upcoming",[catalogOut,releaseOut]=await Promise.all([env.DB.prepare("select payload from content_records where table_name = 'tool_catalog' order by sort_order asc, record_key asc").all(),env.DB.prepare("select payload from content_records where table_name = 'tool_release_plan' order by json_extract(payload,'$.publish_after') asc, record_key asc").all()]),now=Date.now(),catalogRows=(catalogOut.results||[]).map(parseRecord).filter(Boolean),releaseRows=(releaseOut.results||[]).map(parseRecord).filter(Boolean),items=catalogRows.filter((row:any)=>row.enabled===true&&Date.parse(String(row.release_after))<=now).map((row:any)=>({id:row.tool_id,slug:row.slug,title:row.title,subtitle:row.subtitle,category:row.category,parent_slug:row.parent_slug,path:row.target_path,icon:row.icon,badge:row.badge,sort_order:row.sort_order,metadata:row.metadata||{}})),releases=releaseRows.filter((row:any)=>(row.state==="staged"||row.state==="published")&&Date.parse(String(row.publish_after))<=now).map((row:any)=>({id:row.release_id,feature:row.feature_key,version:row.version,target_path:row.target_path,publish_after:row.publish_after,source_bundle_version:row.source_bundle_version,metadata:row.metadata||{}})),upcoming=includeUpcoming?releaseRows.filter((row:any)=>row.state==="staged"&&Date.parse(String(row.publish_after))>now).map((row:any)=>({id:row.release_id,feature:row.feature_key,version:row.version,target_path:row.target_path,publish_after:row.publish_after,source_bundle_version:row.source_bundle_version})):undefined;if(!items.length)return null;return json({ok:true,version:1,generated_at:new Date().toISOString(),source:"Cloudflare D1 content_records",items,releases,...(includeUpcoming?{upcoming}:{})},200,"public, max-age=60, s-maxage=600, stale-while-revalidate=86400")}catch{return null}
}
async function nativeHistory(request:Request,env:Env){const url=new URL(request.url),date=url.searchParams.get("date")||todayNepal();if(!validDate(date))return json({error:"invalid_date"},400);const[,m,d]=date.split("-").map(Number),rows=await contentByDay(env,"on_this_day_events",m,d,100);if(!rows.length)return null;return json({ok:true,date,count:rows.length,items:rows},200,"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800")}
async function nativeTimeMachine(request:Request,env:Env){if(!env.DB)return null;const url=new URL(request.url),year=Number(url.searchParams.get("year")||"0"),limit=Math.min(200,Math.max(1,Number(url.searchParams.get("limit")||"80")));try{const stmt=year?env.DB.prepare("select payload from content_records where table_name='time_machine_moments' and year=?1 order by sort_order desc,record_key asc limit ?2").bind(year,limit):env.DB.prepare("select payload from content_records where table_name='time_machine_moments' order by year desc,sort_order desc,record_key asc limit ?1").bind(limit),out=await stmt.all(),rows=(out.results||[]).map(parseRecord).filter(Boolean);if(!rows.length)return null;return json({ok:true,year:year||null,count:rows.length,items:rows},200,"public, max-age=300, s-maxage=86400, stale-while-revalidate=604800")}catch{return null}}

const RASHIFAL_SIGNS=new Set(["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"]);
function rashifalQuery(url:URL){const allowed=new Set(["period","system","calendar","date","sign"]),seen=new Set<string>(),values:Record<string,string>={};for(const[key,value]of url.searchParams){if(!allowed.has(key))continue;if(seen.has(key))throw new Error("invalid_query_parameter");seen.add(key);values[key]=value}const period=values.period||"daily",system=values.system||"vedic",calendar=values.calendar||"bs",date=values.date||todayNepal(),sign=values.sign||"",year=Number(date.slice(0,4));if(!["daily","weekly","monthly"].includes(period)||!["vedic","western"].includes(system)||!["bs","gregorian"].includes(calendar)||(sign&&!RASHIFAL_SIGNS.has(sign)))throw new Error("invalid_query_parameter");if(!validDate(date)||year<2000||year>2040)throw new Error("invalid_date");return{period,system,calendar,date,sign}}
async function nativeRashifalUniversal(request:Request,env:Env){if(!env.DB||request.method!=="GET")return null;let query:ReturnType<typeof rashifalQuery>;try{query=rashifalQuery(new URL(request.url))}catch(error){return json({detail:String((error as Error)?.message||"invalid_query_parameter")},400,"no-store")}try{const row=await env.DB.prepare("select payload from content_records where table_name='miti_rashifal_publications' and json_extract(payload,'$.period')=?1 and json_extract(payload,'$.system')=?2 and json_extract(payload,'$.calendar')=?3 and json_extract(payload,'$.period_window.start_date')<=?4 and json_extract(payload,'$.period_window.end_date_exclusive')>?4 order by json_extract(payload,'$.created_at') desc limit 1").bind(query.period,query.system,query.calendar,query.date).first(),publication:any=parseRecord(row),payload=publication?.payload;if(!payload||typeof payload!=="object")return null;const body=query.sign?{...payload,readings:Array.isArray(payload.readings)?payload.readings.filter((reading:any)=>reading?.sign?.id===query.sign):[]}:payload,response=json(body,200,"public, max-age=60, s-maxage=600, stale-while-revalidate=3600"),headers=new Headers(response.headers);headers.set("x-patro-backend","cloudflare-d1-rashifal");return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}catch{return null}}

async function handleApi(request:Request,env:Env,ctx:ExecutionContext){
  const url=new URL(request.url),path=url.pathname;
  const authNative=await authResponse(request,env);if(authNative)return authNative;
  const adminNative=await adminResponse(request,env);if(adminNative)return adminNative;
  const privateNative=await privateResponse(request,env);if(privateNative)return privateNative;
  const pushNative=await pushResponse(request,env);if(pushNative)return pushNative;
  const cronNative=await cronResponse(request,env);if(cronNative)return cronNative;
  const publicNative=await publicApiResponse(request,env);if(publicNative)return publicNative;
  const communityNative=await communityResponse(request,env);if(communityNative)return communityNative;
  if(path==="/api/v1/health")return json({status:"online",runtime:"Cloudflare Workers",framework:"Native Web APIs",mode:env.DB?"cloudflare-native":"cloudflare-bootstrap",database:env.DB?"D1":"D1 unavailable",cache:env.CACHE?"KV + Cache API":"Cache API"},200,"no-store");
  if(path==="/api/v1/sync"&&request.method==="GET"){const native=await nativeSync(request,env);return native?edgeCached(request,ctx,3600,async()=>native):json({error:"calendar_data_unavailable"},503)}
  if(path==="/api/v1/astronomy/tithi"&&request.method==="GET"){const native=await nativeTithi(request,env);return native?edgeCached(request,ctx,1800,async()=>native):json({error:"tithi_unavailable"},503)}
  if(path==="/api/v1/jyotish-chat")return handleJyotishChat(request,env);
  if(path==="/api/v1/weather/daily"&&request.method==="GET")return edgeCached(request,ctx,1800,()=>dailyWeatherResponse(request));
  if(path==="/api/v1/nasa/apod"&&request.method==="GET"){const date=url.searchParams.get("date")||todayNepal();if(!validDate(date))return json({error:"invalid_date",expected:"YYYY-MM-DD"},400);return edgeCached(request,ctx,86400,async()=>json(await apod(env,date)))}
  if(path==="/api/v1/nasa/cosmic"&&request.method==="GET"){const date=url.searchParams.get("date")||todayNepal();if(!validDate(date))return json({error:"invalid_date",expected:"YYYY-MM-DD"},400);return edgeCached(request,ctx,900,async()=>json(await fetchCosmicDay(date,env,await apod(env,date))))}
  if(path==="/api/v1/radio/catalog"&&request.method==="GET"){if(!env.RADIO_RELAY_SECRET&&!env.TV_RELAY_SECRET)return json({error:"radio_relay_secret_unavailable"},503);return edgeCached(request,ctx,300,()=>radioCatalogResponse(request,env))}
  if(path==="/api/v1/radio/stream"&&(request.method==="GET"||request.method==="HEAD")){if(!env.RADIO_RELAY_SECRET&&!env.TV_RELAY_SECRET)return json({error:"radio_relay_secret_unavailable"},503);return radioStreamResponse(request,env)}
  if(path==="/api/v1/rashifal/universal"&&request.method==="GET"){const native=await nativeRashifalUniversal(request,env);return native?edgeCached(request,ctx,600,async()=>native):json({error:"rashifal_unavailable"},503)}
  if(path==="/api/v1/tools/catalog"&&request.method==="GET"){const native=await nativeToolCatalog(request,env);return native?edgeCached(request,ctx,600,async()=>native):json({error:"tool_catalog_unavailable"},503)}
  if(path==="/api/v1/markets/latest"&&request.method==="GET"){const kind=url.searchParams.get("kind")||"forex";if(kind!=="forex"&&kind!=="index")return json({error:"unsupported_market_kind",allowed:["forex","index"]},400);return edgeCached(request,ctx,900,async()=>{const payload=await nativeMarketLatest(env,kind);return payload?json(payload):json({error:"market_snapshot_unavailable",kind},503)})}
  if(path==="/api/v1/on-this-day"&&request.method==="GET"){const native=await nativeHistory(request,env);return native?edgeCached(request,ctx,86400,async()=>native):json({error:"history_unavailable"},503)}
  if(path==="/api/v1/time-machine"&&request.method==="GET"){const native=await nativeTimeMachine(request,env);return native?edgeCached(request,ctx,86400,async()=>native):json({error:"time_machine_unavailable"},503)}
  return json({error:"api_route_not_found",path},404,"no-store");
}

function assetRequest(request:Request,pathname:string){const url=new URL(request.url);url.pathname=pathname;return new Request(url.toString(),request)}
async function serveAsset(request:Request,env:Env,pathname?:string){if(!env.ASSETS)return json({error:"assets_unavailable",runtime:"Cloudflare Workers"},503,"no-store");return env.ASSETS.fetch(pathname?assetRequest(request,pathname):request)}

const LEGACY_REDIRECTS=new Map<string,string>([["/aaja","/"],["/astro","/tools/astro"],["/my-diary","/me/diary"],["/notes","/me/notes"],["/planner","/me/planner"],["/family","/me/family"],["/family/join","/me/family"],["/tools/family","/me/family"],["/tithi","/me/reminders"],["/settings/notifications","/me/reminders"],["/tools/tithi","/me/reminders"],["/card","/me/cards"],["/tools/card","/me/cards"],["/settings","/me/settings"],["/settings/holidays","/me/settings"],["/my-data","/me/data"],["/tools/my-data","/me/data"],["/diaspora","/tools/clock"],["/jyotish/rashifal","/rashifal"],["/jyotish/china/rashi","/rashifal"],["/jyotish/janma-patro","/jyotish/china"]]);
const SPA_EXACT=new Set(["/","/tools","/tools/astro","/me","/convert","/rashifal","/samachar","/fm","/tv","/time-machine","/on-this-day","/jyotish/china","/jyotish/matchmaking","/about","/sources","/privacy","/terms","/contact","/developers","/offline","/explore","/settings/community","/admin/community-suites"]);
function cleanPath(path:string){return !path||path==="/"?"/":path.replace(/\/+$/,"")||"/"}
function isSpaPath(path:string){return SPA_EXACT.has(path)||/^\/calendar\/\d{4}\/\d{1,2}$/.test(path)||path.startsWith("/me/")||path.startsWith("/tools/")||path.startsWith("/jyotish/")||path.startsWith("/date/")||path.startsWith("/festival/")}
function staticTarget(path:string){
  const exact:Record<string,string>={"/samudaya":"/samudaya/index.html","/samudaya/lhosar":"/samudaya/lhosar/index.html","/samudaya/tharu":"/samudaya/tharu/index.html","/samudaya/mithila":"/samudaya/mithila/index.html","/samudaya/kirat":"/samudaya/kirat/index.html","/samudaya/hijri":"/samudaya/hijri/index.html","/samudaya/chakra":"/samudaya/chakra/index.html","/nepal-sambat/mandala":"/nepal-sambat/mandala/index.html","/tools/samudaya":"/samudaya/index.html"};
  if(exact[path])return exact[path];if(path.startsWith("/samudaya/"))return path.endsWith("/")?path+"index.html":path+"/index.html";if(isSpaPath(path))return"/index.html";return null;
}
function redirectTo(request:Request,to:string){const url=new URL(request.url);url.pathname=to;return Response.redirect(url.toString(),301)}
function secureResponse(request:Request,response:Response){
  const headers=new Headers(response.headers),path=cleanPath(new URL(request.url).pathname),type=headers.get("content-type")||"";
  headers.set("x-content-type-options","nosniff");headers.set("referrer-policy","strict-origin-when-cross-origin");headers.set("strict-transport-security","max-age=31536000; includeSubDomains");headers.set("permissions-policy","camera=(), microphone=(self), payment=(), usb=(), browsing-topics=()");headers.set("x-dns-prefetch-control","off");
  if(path.startsWith("/api/"))headers.set("x-robots-tag","noindex, nofollow");if(path==="/me"||path.startsWith("/me/")||path==="/offline")headers.set("x-robots-tag","noindex, nofollow");if(path==="/me"||path.startsWith("/me/"))headers.set("cache-control","private, no-store, max-age=0");if(path==="/sw.js")headers.set("cache-control","no-cache");if(path==="/manifest.webmanifest")headers.set("cache-control","public, max-age=3600");if(path.startsWith("/assets/"))headers.set("cache-control","public, max-age=31536000, immutable");if(type.includes("text/html"))headers.set("content-security-policy",path==="/embed/today"||path==="/embed/converter"?EMBED_CSP:DEFAULT_CSP);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(request.url),path=cleanPath(url.pathname);let response:Response;
    if(path.startsWith("/api/")){
      const authNative=await authResponse(request,env);if(authNative)response=authNative;else{const adminNative=await adminResponse(request,env);if(adminNative)response=adminNative;else{const privateNative=await privateResponse(request,env);if(privateNative)response=privateNative;else{const pushNative=await pushResponse(request,env);if(pushNative)response=pushNative;else{const cronNative=await cronResponse(request,env);if(cronNative)response=cronNative;else if(path.startsWith("/api/v1/"))response=await handleApi(request,env,ctx);else if(path.startsWith("/api/fm/"))response=(await fmResponse(request,env))||json({error:"fm_route_not_found"},404);else if(path==="/api/jyotish-chat")response=await handleJyotishChat(request,env);else if(path==="/api/rashifal/universal"&&request.method==="GET"){const native=await nativeRashifalUniversal(request,env);response=native||json({error:"rashifal_unavailable"},503)}else if(path==="/api/rashifal-engine"||path==="/api/rashifal_engine"||path==="/api/rashifal_engine.py"||path==="/api/rashifal/personalized"){const u=new URL(request.url);u.pathname="/api/v1/rashifal/personalized";response=(await publicApiResponse(new Request(u.toString(),request),env))||json({error:"rashifal_route_unavailable"},503)}else response=json({error:"api_route_not_found",path},404)}}}}}
    }else if(path.startsWith("/fm-v2-stream/")||path.startsWith("/fm-stream/")){response=(await fmResponse(request,env))||json({error:"fm_route_not_found"},404)}
    else{
      const legacy=LEGACY_REDIRECTS.get(path);if(legacy)return redirectTo(request,legacy);if(path.startsWith("/family/"))return redirectTo(request,"/me/family");
      const target=staticTarget(path);response=await serveAsset(request,env,target||undefined);
    }
    return secureResponse(request,response);
  },
  async scheduled(controller:any,env:Env,ctx:ExecutionContext):Promise<void>{ctx.waitUntil(runScheduled(String(controller?.cron||""),env).then(()=>undefined))}
};
