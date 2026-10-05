import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const file=resolve(process.cwd(),"dist/sw.js");
let source;
try{source=await readFile(file,"utf8");}catch{console.log("dist/sw.js not present; static calendar PWA patch skipped.");process.exit(0)}
if(source.includes("aafnai-static-calendar-24m-v1")){console.log("24-month static calendar PWA patch already present.");process.exit(0)}

const helper=String.raw`
const STATIC_CALENDAR_CACHE = "aafnai-static-calendar-24m-v1";
const STATIC_CALENDAR_INDEX = "/data/calendar/offline-24-months/index.json";
async function staticCalendarIndex(){
  const cache=await caches.open(STATIC_CALENDAR_CACHE);let response=await cache.match(STATIC_CALENDAR_INDEX,{ignoreVary:true});
  if(!response){try{response=await fetch(STATIC_CALENDAR_INDEX,{cache:"reload"});if(response.ok)await cache.put(STATIC_CALENDAR_INDEX,response.clone())}catch{return null}}
  try{return response&&response.ok?await response.clone().json():null}catch{return null}
}
async function staticCalendarMonth(year,month){
  const index=await staticCalendarIndex();const meta=index?.months?.find((x)=>Number(x.year)===Number(year)&&Number(x.month)===Number(month));if(!meta?.path)return null;
  const cache=await caches.open(STATIC_CALENDAR_CACHE);let response=await cache.match(meta.path,{ignoreVary:true});
  if(!response){try{response=await fetch(meta.path,{cache:"reload"});if(response.ok)await cache.put(meta.path,response.clone())}catch{return null}}
  try{return response&&response.ok?await response.clone().json():null}catch{return null}
}
async function staticCalendarDay(date){
  const index=await staticCalendarIndex();const meta=index?.months?.find((x)=>String(x.start)<=date&&String(x.end)>=date);if(!meta)return null;
  const month=await staticCalendarMonth(meta.year,meta.month);return month?.days?.find((x)=>String(x.ad)===date)||null;
}
function staticSync(day){return {success:true,query_date:day.ad,calendars:{gregorian_ad:day.ad,bikram_sambat:day.bs?.formatted||"",nepal_sambat:day.ns?.formatted||"",bikram_sambat_detail:day.bs||null,nepal_sambat_detail:day.ns||null},tithi:day.panchang?.tithi||null,archive_panchang:day.panchang||null,calendar_source:"static-pwa"}}
function staticJson(body){return new Response(JSON.stringify(body),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=86400","x-patro-calendar-source":"static-pwa"}})}
async function staticCalendarApi(request){
  const url=new URL(request.url);const monthMatch=url.pathname.match(/^\/api\/v1\/calendar\/(\d{4})\/(\d{1,2})$/);
  if(monthMatch&&(url.searchParams.get("calendar")||"bs")==="bs"){
    const bundle=await staticCalendarMonth(Number(monthMatch[1]),Number(monthMatch[2]));
    if(bundle?.days?.length)return staticJson({ok:true,calendar:"bs",year:Number(monthMatch[1]),month:Number(monthMatch[2]),count:bundle.days.length,days:bundle.days.map((d)=>({ad:d.ad,bs:d.bs,nepal_sambat:d.ns,panchang:d.panchang,source:"static-pwa"}))});
  }
  if(url.pathname==="/api/v1/today"||url.pathname==="/api/v1/sync"){
    const date=url.searchParams.get("date");
    if(date){const day=await staticCalendarDay(date);if(day)return url.pathname==="/api/v1/today"?staticJson({ok:true,date,ad:day.ad,bs:day.bs,nepal_sambat:day.ns,panchang:day.panchang,holidays:[],source:"static-pwa"}):staticJson(staticSync(day))}
    const start=url.searchParams.get("start"),end=url.searchParams.get("end");
    if(url.pathname==="/api/v1/sync"&&start&&end){const index=await staticCalendarIndex();const metas=(index?.months||[]).filter((x)=>String(x.end)>=start&&String(x.start)<=end);const days=[];for(const meta of metas){const month=await staticCalendarMonth(meta.year,meta.month);for(const d of month?.days||[])if(d.ad>=start&&d.ad<=end)days.push(staticSync(d))}if(days.length)return staticJson({success:true,start_date:start,end_date:end,requested_days:daysBetween(start,end)+1,returned_days:days.length,days,coverage:{ad_start:index.start,ad_end:index.end,source_version:"static-24-month-window",rows:days.length}})}
  }
  return null;
}
async function calendarStaticFirst(request){const local=await staticCalendarApi(request);return local||stalePublic(request,CALENDAR_CACHE,MAX_CALENDAR_ENTRIES)}
async function warmStaticCalendar(){
  const index=await staticCalendarIndex();if(!index?.months?.length)return;
  if(Number(index.past_months)!==12||Number(index.future_months)!==12||index.months.length!==25)throw new Error("static_calendar_window_incomplete");
  const cache=await caches.open(STATIC_CALENDAR_CACHE);
  await Promise.allSettled(index.months.map(async(meta)=>{if(await cache.match(meta.path,{ignoreVary:true}))return;const response=await fetch(meta.path,{cache:"reload"});if(response.ok)await cache.put(meta.path,response.clone())}));
}
async function cacheFirstStatic(request){const cache=await caches.open(STATIC_CALENDAR_CACHE);const hit=await cache.match(request,{ignoreVary:true});if(hit)return hit;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response}
`;

function replaceOnce(needle,replacement,label){if(!source.includes(needle))throw new Error(`PWA patch anchor missing: ${label}`);source=source.replace(needle,replacement)}
replaceOnce('const PUBLIC_DATA_CACHE = "aafnai-public-data-v3";','const PUBLIC_DATA_CACHE = "aafnai-public-data-v3";\n'+helper,"cache constants");
replaceOnce('  await warmLanguageTools(shell);','  await warmLanguageTools(shell);\n  await warmStaticCalendar();',"warm offline");
replaceOnce('const keep = new Set([SHELL_CACHE, CALENDAR_CACHE, PUBLIC_DATA_CACHE, LOCAL_CONFIG_CACHE]);','const keep = new Set([SHELL_CACHE, CALENDAR_CACHE, STATIC_CALENDAR_CACHE, PUBLIC_DATA_CACHE, LOCAL_CONFIG_CACHE]);',"activate cache set");
replaceOnce('  if (isLanguageToolAsset(url)) { event.respondWith(cacheFirstShell(event.request)); return; }','  if (isLanguageToolAsset(url)) { event.respondWith(cacheFirstShell(event.request)); return; }\n  if (url.pathname === STATIC_CALENDAR_INDEX || /^\\/data\\/calendar\\/offline-24-months\\/\\d{4}-\\d{2}\\.json$/.test(url.pathname)) { event.respondWith(cacheFirstStatic(event.request)); return; }',"static asset fetch");
replaceOnce('  if (isSafeCalendarRequest(url)) { event.respondWith(stalePublic(event.request, CALENDAR_CACHE, MAX_CALENDAR_ENTRIES)); return; }','  if (isSafeCalendarRequest(url)) { event.respondWith(calendarStaticFirst(event.request)); return; }',"calendar API fetch");
source=source.replace('const VERSION = "aafnai-pwa-v9";','const VERSION = "aafnai-pwa-v11";').replace('const SHELL_CACHE = "aafnai-shell-v9";','const SHELL_CACHE = "aafnai-shell-v11";');
await writeFile(file,source,"utf8");
console.log("Patched production service worker with ±12-month static calendar precache and offline API fallback.");
