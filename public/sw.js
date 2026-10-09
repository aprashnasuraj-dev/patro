const VERSION = "aafnai-pwa-v19";
const SHELL_CACHE = "aafnai-shell-v14";
const CALENDAR_CACHE = "aafnai-calendar-v4";
const PUBLIC_DATA_CACHE = "aafnai-public-data-v4";
const LOCAL_CONFIG_CACHE = "aafnai-local-config-v1";
const MORNING_CONFIG_KEY = "/__local/morning-config";
const MORNING_SENT_KEY = "/__local/morning-sent";
const OFFLINE_WINDOW = "/data/calendar/offline-window.json";
const MAX_CALENDAR_ENTRIES = 10;
const MAX_PUBLIC_DATA_ENTRIES = 18;
const MAX_CALENDAR_RANGE_DAYS = 45;
const MAX_PUBLIC_RESPONSE_BYTES = 1024 * 1024;
const PUBLIC_DATA_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CORE = [
  "/", "/today", "/tools", "/convert", "/rashifal", "/time-machine", "/on-this-day", "/samachar", "/fm", "/tv",
  "/tools/astro", "/tools/nepali-typing", "/tools/preeti-converter",
  "/samudaya", "/nepal-sambat/mandala", "/samudaya/lhosar", "/samudaya/tharu", "/samudaya/mithila", "/samudaya/kirat", "/samudaya/hijri", "/samudaya/chakra",
  "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/maskable-512.png", "/apple-touch-icon.png"
];
const INSTALL_CORE = ["/", "/today", "/manifest.webmanifest", "/favicon.svg"];
const LANGUAGE_TOOL_ASSETS = [
  "/nepali-tools/index.html", "/nepali-tools/styles.css", "/nepali-tools/app.mjs", "/nepali-tools/worker.mjs",
  "/nepali-tools/core/roman.mjs", "/nepali-tools/core/converter.mjs", "/nepali-tools/core/suggestions.mjs", "/nepali-tools/core/aliases.mjs",
  "/nepali-tools/licenses/DICTIONARY-NOTICE.txt", "/nepali-tools/lexicon.txt", "/fonts/nepali-serif-700.woff2", "/vendor/jsQR.js"
];
const LANGUAGE_LEXICON = "/api/v1/typing/lexicon?format=words";
const PRIVATE_ROUTE_PREFIXES = ["/me", "/notes", "/planner", "/family", "/settings", "/my-data", "/admin"];

function isSameOrigin(url) { return url.origin === self.location.origin; }
function isPrivatePath(pathname) { return PRIVATE_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/")); }
function isLanguageToolAsset(url) { return url.pathname.startsWith("/nepali-tools/"); }
function isLanguageLexicon(url) { return url.pathname === "/api/v1/typing/lexicon" && url.searchParams.get("format") === "words"; }
function iso(date) { return date.getUTCFullYear() + "-" + String(date.getUTCMonth()+1).padStart(2,"0") + "-" + String(date.getUTCDate()).padStart(2,"0"); }
function validIso(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(Date.parse(String(value) + "T00:00:00Z")); }
function nepalClock(now = Date.now()) { return new Date(now + (5*60+45)*60*1000); }
function nepalDate(now = Date.now()) { return nepalClock(now).toISOString().slice(0,10); }
function nepalMinutes(now = Date.now()) { const d=nepalClock(now); return d.getUTCHours()*60+d.getUTCMinutes(); }
function daysBetween(start, end) { return Math.floor((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86400000); }
function currentMonthRange() {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(first); start.setUTCDate(1 - first.getUTCDay());
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 41);
  return { start: iso(start), end: iso(end) };
}
function hasOnlyParams(url, allowed) {
  for (const key of url.searchParams.keys()) if (!allowed.has(key)) return false;
  return true;
}
function isSafeCalendarRequest(url) {
  if (/^\/api\/v1\/calendar\/\d{4}\/\d{1,2}$/.test(url.pathname)) return hasOnlyParams(url, new Set(["calendar"]));
  if (url.pathname === "/api/v1/today") return hasOnlyParams(url, new Set(["date"])) && validIso(url.searchParams.get("date"));
  if (url.pathname !== "/api/v1/sync") return false;
  if (!hasOnlyParams(url, new Set(["date", "start", "end"]))) return false;
  const date = url.searchParams.get("date");
  if (date) return validIso(date) && !url.searchParams.has("start") && !url.searchParams.has("end");
  const start = url.searchParams.get("start"), end = url.searchParams.get("end");
  if (!validIso(start) || !validIso(end)) return false;
  const span = daysBetween(start, end);
  return span >= 0 && span < MAX_CALENDAR_RANGE_DAYS;
}
function isSafePublicDataRequest(url) {
  if (url.pathname === "/api/v1/festivals") {
    if (!hasOnlyParams(url, new Set(["year"]))) return false;
    const year = Number(url.searchParams.get("year"));
    return Number.isInteger(year) && year >= 1900 && year <= 2200;
  }
  if (url.pathname === "/api/v1/holidays") {
    if (!hasOnlyParams(url, new Set(["year", "date"]))) return false;
    const year = url.searchParams.get("year"), date = url.searchParams.get("date");
    return (year && /^\d{4}$/.test(year) && !date) || (date && validIso(date) && !year);
  }
  if (url.pathname === "/api/v1/on-this-day") return hasOnlyParams(url, new Set(["date"])) && validIso(url.searchParams.get("date"));
  if (url.pathname === "/api/v1/time-machine") {
    if (!hasOnlyParams(url, new Set(["year", "limit"]))) return false;
    const year = url.searchParams.get("year"), limit = Number(url.searchParams.get("limit") || "80");
    return (!year || /^\d{1,4}$/.test(year)) && Number.isInteger(limit) && limit > 0 && limit <= 800;
  }
  return isLanguageLexicon(url);
}
function responseAllowsStorage(response) {
  if (!response || !response.ok || response.type === "opaque") return false;
  const cacheControl = String(response.headers.get("cache-control") || "").toLowerCase();
  if (cacheControl.includes("no-store") || cacheControl.includes("private")) return false;
  const length = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > MAX_PUBLIC_RESPONSE_BYTES) return false;
  return true;
}
async function stamped(response) {
  const headers = new Headers(response.headers);
  headers.set("x-aafnai-cached-at", String(Date.now()));
  return new Response(await response.clone().arrayBuffer(), { status: response.status, statusText: response.statusText, headers });
}
async function putIfOk(cache, request) {
  try { const response = await fetch(request); if (responseAllowsStorage(response)) await cache.put(request, response.clone()); return response; } catch { return null; }
}
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName); const keys = await cache.keys();
  const excess = Math.max(0, keys.length - maxEntries);
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}
async function putBounded(cacheName, request, response, maxEntries) {
  if (!responseAllowsStorage(response)) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, await stamped(response));
  await trimCache(cacheName, maxEntries);
}
async function validCached(cacheName, request) {
  const cache = await caches.open(cacheName); const hit = await cache.match(request, { ignoreVary:true });
  if (!hit) return null;
  const cachedAt = Number(hit.headers.get("x-aafnai-cached-at") || "0");
  if (cachedAt && Date.now() - cachedAt > PUBLIC_DATA_TTL_MS) { await cache.delete(request); return null; }
  return hit;
}
async function warmLanguageTools(cache) {
  await Promise.allSettled(LANGUAGE_TOOL_ASSETS.map((url) => putIfOk(cache, new Request(url, { credentials:"same-origin", cache:"reload" }))));
  try {
    const request = new Request(LANGUAGE_LEXICON, { headers:{accept:"text/plain,*/*"}, credentials:"same-origin" });
    const response = await fetch(request); if (responseAllowsStorage(response)) await putBounded(PUBLIC_DATA_CACHE, request, response, MAX_PUBLIC_DATA_ENTRIES);
  } catch {}
}
async function warmInstallShell() {
  const shell = await caches.open(SHELL_CACHE);
  await Promise.allSettled(INSTALL_CORE.map((url) => putIfOk(shell, new Request(url, { credentials:"same-origin" }))));
}
// Install-time preparation downloads executable assets only from this build.
// A failed asset remains retryable on the next installed-app launch or online event.
async function warmFeatureAssets() {
  const response = await fetch("/pwa-optional-assets.json", { cache: "no-cache", credentials: "same-origin" });
  if (!response.ok) throw new Error("optional_asset_manifest_unavailable");
  const manifest = await response.json();
  if (!Array.isArray(manifest.assets) || manifest.assets.length > 300) throw new Error("invalid_optional_assets");
  await warmInstallShell();
  const shell = await caches.open(SHELL_CACHE);
  const assets = manifest.assets.filter(path => typeof path === "string" && /^\/assets\/[\w.-]+\.(?:m?js|css|woff2?)$/.test(path));
  let failed = await shell.match(new Request("/", {credentials:"same-origin"})) ? 0 : 1;
  for (let i = 0; i < assets.length; i += 4) {
    await Promise.all(assets.slice(i, i + 4).map(async path => {
      try {
        const request = new Request(path, { credentials: "same-origin" });
        if (await shell.match(request)) return;
        const asset = await fetch(request);
        if (!responseAllowsStorage(asset)) throw new Error("optional_asset_fetch_failed");
        await shell.put(request, asset);
      } catch { failed++; }
    }));
  }
  if (failed) throw new Error("optional_assets_incomplete_" + failed);
}
async function warmOffline() {
  const shell = await caches.open(SHELL_CACHE);
  await Promise.allSettled(CORE.map((url) => putIfOk(shell, new Request(url, { credentials:"same-origin" }))));
  await warmLanguageTools(shell);
  await warmCalendar();
  const today = nepalDate();
  const calendarRequests = [
    new Request("/api/v1/sync?date=" + encodeURIComponent(today), { headers:{accept:"application/json"} }),
  ];
  const range = currentMonthRange();
  calendarRequests.push(new Request("/api/v1/sync?start=" + encodeURIComponent(range.start) + "&end=" + encodeURIComponent(range.end), { headers:{accept:"application/json"} }));
  for (const request of calendarRequests) {
    try { const response = await fetch(request); if (responseAllowsStorage(response)) await putBounded(CALENDAR_CACHE, request, response, MAX_CALENDAR_ENTRIES); } catch {}
  }
  const publicRequests = [
    new Request("/api/v1/on-this-day?date=" + encodeURIComponent(today), { headers:{accept:"application/json"} }),
    new Request("/api/v1/time-machine?limit=800", { headers:{accept:"application/json"} }),
  ];
  for (const request of publicRequests) {
    try { const response = await fetch(request); if (responseAllowsStorage(response)) await putBounded(PUBLIC_DATA_CACHE, request, response, MAX_PUBLIC_DATA_ENTRIES); } catch {}
  }
}
async function warmCalendar() {
  // A small packaged snapshot includes the entire current BS month, Tithi and sourced events.
  try {
    const response = await fetch(OFFLINE_WINDOW, {cache:"no-cache"});
    if (responseAllowsStorage(response)) await putBounded(CALENDAR_CACHE, OFFLINE_WINDOW, response, MAX_CALENDAR_ENTRIES);
  } catch {}
  try {
    const response = await fetch("/api/v1/sync?date=" + nepalDate());
    if (!responseAllowsStorage(response)) return;
    const data = await response.clone().json();
    await putBounded(CALENDAR_CACHE, "/api/v1/sync?date=" + nepalDate(), response, MAX_CALENDAR_ENTRIES);
    const bs = data?.calendars?.bikram_sambat_detail;
    if (!bs) return;
    await Promise.allSettled([
      "/api/v1/calendar/" + bs.year + "/" + bs.month + "?calendar=bs",
      "/api/v1/festivals?year=" + nepalDate().slice(0,4),
      "/api/v1/holidays?year=" + nepalDate().slice(0,4)
    ].map(async path => { const r=await fetch(path); if(responseAllowsStorage(r))await putBounded(path.includes("calendar/")?CALENDAR_CACHE:PUBLIC_DATA_CACHE,path,r,path.includes("calendar/")?MAX_CALENDAR_ENTRIES:MAX_PUBLIC_DATA_ENTRIES); }));
  } catch {}
}
async function offlineCalendarResponse(request) {
  const url = new URL(request.url);
  const stored = await (await caches.open(CALENDAR_CACHE)).match(OFFLINE_WINDOW);
  if (!stored) return null;
  const doc = await stored.json();
  const date = url.searchParams.get("date");
  const rows = doc.days || [];
  let body;
  if (url.pathname === "/api/v1/sync" && date) {
    const day = rows.find(row => row.ad === date); if (!day) return null;
    body = {success:true,query_date:date,calendars:{gregorian_ad:date,bikram_sambat_detail:day.bs,bikram_sambat:day.bs?.formatted||"",nepal_sambat_detail:day.ns},archive_panchang:day.panchang,tithi:day.panchang?.tithi};
  } else if (/^\/api\/v1\/calendar\//.test(url.pathname)) {
    const [, , , , year, month] = url.pathname.split("/");
    const days = rows.filter(row=>Number(row.bs?.year)===Number(year)&&Number(row.bs?.month)===Number(month));
    if(!days.length || days.length!==Number(doc.month_days))return null;
    body={success:true,days:days.map(row=>({...row,nepal_sambat:row.ns}))};
  } else if (url.pathname === "/api/v1/sync") {
    const start=url.searchParams.get("start"),end=url.searchParams.get("end");
    if(!start||!end||start<doc.start||end>doc.end)return null;
    body={success:true,days:rows.filter(row=>row.ad>=start&&row.ad<=end)};
  } else if (["/api/v1/holidays","/api/v1/festivals"].includes(url.pathname)) {
    const year=url.searchParams.get("year");
    body={items:(doc.events||[]).filter(item=>!year||item.ad_date.startsWith(year+"-")),offline:true,coverage:{start:doc.start,end:doc.end}};
  } else return null;
  return new Response(JSON.stringify(body),{headers:{"content-type":"application/json","x-patro-offline":"packaged-window"}});
}
async function cacheFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE); const hit = await cache.match(request, { ignoreVary:true }); if (hit) return hit;
  const response = await fetch(request); if (responseAllowsStorage(response)) await cache.put(request, response.clone()); return response;
}
async function stalePublic(request, cacheName, maxEntries, event) {
  const hit = await validCached(cacheName, request);
  const network = fetch(request).then(async (response) => { if (responseAllowsStorage(response)) await putBounded(cacheName, request, response, maxEntries); return response; }).catch(() => null);
  if(event)event.waitUntil(network.then(()=>undefined));
  const response=hit || await network;
  if(response?.ok)return response;
  return (await offlineCalendarResponse(request)) || response || Response.error();
}
async function networkFirstShell(request, fallbackUrl = "/") {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (!isPrivatePath(new URL(request.url).pathname) && responseAllowsStorage(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request, {ignoreVary:true})) || (fallbackUrl ? await cache.match(fallbackUrl) : null) || Response.error();
  }
}
async function localGet(key) {
  const cache=await caches.open(LOCAL_CONFIG_CACHE); const response=await cache.match(key); if(!response)return null;
  try{return await response.json()}catch{return null}
}
async function localPut(key,value) {
  const cache=await caches.open(LOCAL_CONFIG_CACHE); await cache.put(key,new Response(JSON.stringify(value),{headers:{"content-type":"application/json"}}));
}
function panchangTithi(payload) {
  const p=payload?.archive_panchang||payload?.panchang||{}; const t=payload?.tithi||p?.tithi||{};
  return String(typeof t==="string"?t:t?.ne||t?.name_ne||t?.name||t?.tithi_name_ne||p?.tithi_name_ne||"").trim();
}
function bsLabel(payload) {
  const bs=payload?.calendars?.bikram_sambat_detail||payload?.bs||null;
  if(!bs)return "";
  const months=["बैशाख","जेठ","असार","साउन","भदौ","असोज","कार्तिक","मंसिर","पुष","माघ","फागुन","चैत"];
  return `${bs.year} साल ${bs.month_ne||months[Number(bs.month)-1]} ${bs.day}`.replace(/[0-9]/g,n=>"०१२३४५६७८९"[Number(n)]);
}
async function cachedCalendarDay(date) {
  const cache=await caches.open(CALENDAR_CACHE); const keys=await cache.keys();
  for(const request of keys){
    const response=await cache.match(request); if(!response)continue;
    let body;try{body=await response.clone().json()}catch{continue}
    const direct=String(body?.date||body?.ad||body?.calendars?.gregorian_ad||""); if(direct===date)return body;
    const days=Array.isArray(body?.days)?body.days:[]; const match=days.find((day)=>String(day?.date||day?.ad||day?.calendars?.gregorian_ad||"")===date); if(match)return match;
  }
  return null;
}
async function maybeMorningGreeting(force=false) {
  const config=await localGet(MORNING_CONFIG_KEY); if(!config?.enabled||config.mode==="push")return false;
  const date=nepalDate(); const sent=await localGet(MORNING_SENT_KEY); if(sent?.date===date)return false;
  const minute=nepalMinutes(); if(!force && (minute<360||minute>=720))return false;
  const day=await cachedCalendarDay(date); const name=String(config?.name||"").trim(); const who=name?` ${name}`:"";
  const weekday=new Intl.DateTimeFormat("ne-NP",{weekday:"long",timeZone:"Asia/Kathmandu"}).format(new Date());
  const snapshot=await (await caches.open(CALENDAR_CACHE)).match(OFFLINE_WINDOW);
  const doc=snapshot?await snapshot.json():null;
  const names=[...new Set((doc?.events||[]).filter(item=>item.ad_date===date).map(item=>item.name_ne||item.name_en).filter(Boolean))].slice(0,3);
  const tithi=panchangTithi(day);
  const detail=`आज मिति ${bsLabel(day)||date} गते, ${weekday}${tithi?`। तिथि: ${tithi}`:""}।${names.length?` आज: ${names.join(", ")}।`:""} शुभ दिन।`;
  await self.registration.showNotification(`शुभ प्रभात${who}`,{
    body:detail, icon:"/icon-192.png", badge:"/icon-192.png", tag:`aafnai-morning-${date}`, renotify:false,
    data:{url:"/today",date}, actions:[{action:"open",title:"आजको पात्रो"}]
  });
  await localPut(MORNING_SENT_KEY,{date,sentAt:new Date().toISOString()}); return true;
}

self.addEventListener("install", (event) => { event.waitUntil(warmInstallShell().then(() => self.skipWaiting())); });
self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, CALENDAR_CACHE, PUBLIC_DATA_CACHE, LOCAL_CONFIG_CACHE]);
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => !keep.has(key) && (key.startsWith("patro-shell-") || key.startsWith("mero-patro-shell-") || key.startsWith("meropatro-pwa-") || key.startsWith("aafnai-pwa-") || key.startsWith("aafnai-shell-") || key.startsWith("aafnai-calendar-") || key.startsWith("aafnai-public-data-") || key.startsWith("आफ्नै पात्रो-pwa-"))).map((key) => caches.delete(key)))).then(() => self.clients.claim()).then(()=>maybeMorningGreeting(false)));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "WARM_LANGUAGE_TOOLS") event.waitUntil(caches.open(SHELL_CACHE).then(warmLanguageTools));
  if (event.data?.type === "WARM_FEATURE_ASSETS") event.waitUntil(warmFeatureAssets().then(() => event.source?.postMessage({type:"FEATURE_ASSETS_READY",revision:VERSION})).catch(() => event.source?.postMessage({type:"FEATURE_ASSETS_RETRY",revision:VERSION})));
  if (event.data?.type === "WARM_OFFLINE") event.waitUntil(warmOffline());
  if (event.data?.type === "WARM_CALENDAR") event.waitUntil(warmCalendar());
  if (event.data?.type === "MORNING_CONFIG") event.waitUntil(localPut(MORNING_CONFIG_KEY,event.data.config||{enabled:false,name:""}));
  if (event.data?.type === "CHECK_MORNING") event.waitUntil(maybeMorningGreeting(false));
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("periodicsync", (event) => { if(event.tag==="aafnai-morning")event.waitUntil(maybeMorningGreeting(false)); });
self.addEventListener("push", event => {
  event.waitUntil((async()=>{
    let message;try{message=event.data?.json()}catch{}
    if(!message)message={title:"आफ्नै पात्रो",body:"नयाँ सूचना हेर्नुहोस्।",url:"/today"};
    const target=new URL(message.url||"/today",self.location.origin);
    const url=target.origin===self.location.origin?target.pathname+target.search:"/today";
    await self.registration.showNotification(String(message.title||"आफ्नै पात्रो"),{body:String(message.body||""),icon:"/icon-192.png",badge:"/icon-192.png",tag:message.tag||"aafnai-update",data:{url,date:message.date},actions:[{action:"open",title:"आजको पात्रो"}]});
    if(message.category==="morning")await localPut(MORNING_SENT_KEY,{date:message.date,sentAt:new Date().toISOString()});
  })());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); const value=new URL(event.notification?.data?.url||"/today",self.location.origin); const target=value.origin===self.location.origin?value.pathname+value.search:"/today";
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then((clients)=>{for(const client of clients){if("focus" in client){client.navigate?.(target);return client.focus()}}return self.clients.openWindow(target)}));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url); if (!isSameOrigin(url)) return;
  if (event.request.headers.has("authorization")) return;
  if(url.pathname===OFFLINE_WINDOW){event.respondWith(stalePublic(event.request,CALENDAR_CACHE,MAX_CALENDAR_ENTRIES,event));return;}

  if (isLanguageToolAsset(url)) { event.respondWith(cacheFirstShell(event.request)); return; }
  if (isSafeCalendarRequest(url)) { event.respondWith(stalePublic(event.request, CALENDAR_CACHE, MAX_CALENDAR_ENTRIES,event)); return; }
  if (isSafePublicDataRequest(url)) { event.respondWith(stalePublic(event.request, PUBLIC_DATA_CACHE, MAX_PUBLIC_DATA_ENTRIES,event)); return; }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/compat-api/") || url.pathname === "/mcp") return;

  if (event.request.mode === "navigate") { event.respondWith(networkFirstShell(event.request, "/")); return; }
  if (["script","style","image","worker","font"].includes(event.request.destination)) event.respondWith(cacheFirstShell(event.request));
});
