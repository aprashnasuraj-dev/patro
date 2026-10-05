const VERSION = "aafnai-pwa-v10";
const SHELL_CACHE = "aafnai-shell-v10";
const CALENDAR_CACHE = "aafnai-calendar-v4";
const PUBLIC_DATA_CACHE = "aafnai-public-data-v4";
const LOCAL_CONFIG_CACHE = "aafnai-local-config-v1";
const MORNING_CONFIG_KEY = "/__local/morning-config";
const MORNING_SENT_KEY = "/__local/morning-sent";
const MAX_CALENDAR_ENTRIES = 10;
const MAX_PUBLIC_DATA_ENTRIES = 18;
const MAX_CALENDAR_RANGE_DAYS = 45;
const MAX_PUBLIC_RESPONSE_BYTES = 1024 * 1024;
const PUBLIC_DATA_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CORE = [
  "/", "/today", "/tools", "/convert", "/rashifal", "/time-machine", "/on-this-day", "/samachar", "/fm", "/tv",
  "/tools/astro", "/tools/nepali-typing", "/tools/preeti-converter",
  "/samudaya", "/nepal-sambat/mandala", "/samudaya/lhosar", "/samudaya/tharu", "/samudaya/mithila", "/samudaya/kirat", "/samudaya/hijri", "/samudaya/chakra",
  "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/maskable-512.png"
];
const LANGUAGE_TOOL_ASSETS = [
  "/nepali-tools/index.html", "/nepali-tools/styles.css", "/nepali-tools/app.mjs", "/nepali-tools/worker.mjs",
  "/nepali-tools/core/roman.mjs", "/nepali-tools/core/converter.mjs", "/nepali-tools/core/suggestions.mjs", "/nepali-tools/core/aliases.mjs",
  "/nepali-tools/licenses/DICTIONARY-NOTICE.txt"
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
async function warmOffline() {
  const shell = await caches.open(SHELL_CACHE);
  await Promise.allSettled(CORE.map((url) => putIfOk(shell, new Request(url, { credentials:"same-origin" }))));
  await warmLanguageTools(shell);
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
async function cacheFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE); const hit = await cache.match(request, { ignoreVary:true }); if (hit) return hit;
  const response = await fetch(request); if (responseAllowsStorage(response)) await cache.put(request, response.clone()); return response;
}
async function stalePublic(request, cacheName, maxEntries) {
  const hit = await validCached(cacheName, request);
  const network = fetch(request).then(async (response) => { if (responseAllowsStorage(response)) await putBounded(cacheName, request, response, maxEntries); return response; }).catch(() => null);
  return hit || (await network) || Response.error();
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
  return String(t?.ne||t?.name_ne||t?.tithi_name_ne||p?.tithi_name_ne||"").trim();
}
function bsLabel(payload) {
  const bs=payload?.calendars?.bikram_sambat_detail||payload?.bs||null;
  return String(bs?.formatted||[bs?.day,bs?.month_ne,bs?.year].filter(Boolean).join(" ")).trim();
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
  const config=await localGet(MORNING_CONFIG_KEY); if(!config?.enabled)return false;
  const date=nepalDate(); const sent=await localGet(MORNING_SENT_KEY); if(sent?.date===date)return false;
  const minute=nepalMinutes(); if(!force && minute<360)return false;
  const day=await cachedCalendarDay(date); const name=String(config?.name||"").trim(); const who=name?` ${name}`:"";
  const facts=[bsLabel(day),panchangTithi(day)].filter(Boolean).join(" · ");
  const transition=day?.archive_panchang?.tithi_transition?.time||day?.panchang?.tithi_transition?.time||"";
  const detail=facts?`आज ${facts}${transition?` · तिथि परिवर्तन ${transition}`:""}। `:"आजको पात्रो हेर्नुहोस्। ";
  await self.registration.showNotification(`शुभ प्रभात${who}`,{
    body:`${detail}तपाईंको दिन शुभ रहोस्।`, icon:"/icon-192.png", badge:"/icon-192.png", tag:"aafnai-morning", renotify:false,
    data:{url:"/today",date}, actions:[{action:"open",title:"आजको पात्रो"}]
  });
  await localPut(MORNING_SENT_KEY,{date,sentAt:new Date().toISOString()}); return true;
}

self.addEventListener("install", (event) => { event.waitUntil(warmOffline().then(() => self.skipWaiting())); });
self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, CALENDAR_CACHE, PUBLIC_DATA_CACHE, LOCAL_CONFIG_CACHE]);
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => !keep.has(key) && (key.startsWith("patro-shell-") || key.startsWith("mero-patro-shell-") || key.startsWith("meropatro-pwa-") || key.startsWith("aafnai-pwa-") || key.startsWith("aafnai-shell-") || key.startsWith("aafnai-calendar-") || key.startsWith("aafnai-public-data-") || key.startsWith("आफ्नै पात्रो-pwa-"))).map((key) => caches.delete(key)))).then(() => self.clients.claim()).then(()=>maybeMorningGreeting(false)));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "WARM_LANGUAGE_TOOLS") event.waitUntil(caches.open(SHELL_CACHE).then(warmLanguageTools));
  if (event.data?.type === "WARM_OFFLINE") event.waitUntil(warmOffline());
  if (event.data?.type === "MORNING_CONFIG") event.waitUntil(localPut(MORNING_CONFIG_KEY,event.data.config||{enabled:false,name:""}));
  if (event.data?.type === "CHECK_MORNING") event.waitUntil(maybeMorningGreeting(false));
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("periodicsync", (event) => { if(event.tag==="aafnai-morning")event.waitUntil(maybeMorningGreeting(false)); });
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); const target=event.notification?.data?.url||"/today";
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then((clients)=>{for(const client of clients){if("focus" in client){client.navigate?.(target);return client.focus()}}return self.clients.openWindow(target)}));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url); if (!isSameOrigin(url)) return;
  if (event.request.headers.has("authorization")) return;

  if (isLanguageToolAsset(url)) { event.respondWith(cacheFirstShell(event.request)); return; }
  if (isSafeCalendarRequest(url)) { event.respondWith(stalePublic(event.request, CALENDAR_CACHE, MAX_CALENDAR_ENTRIES)); return; }
  if (isSafePublicDataRequest(url)) { event.respondWith(stalePublic(event.request, PUBLIC_DATA_CACHE, MAX_PUBLIC_DATA_ENTRIES)); return; }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/compat-api/") || url.pathname === "/mcp") return;

  if (event.request.mode === "navigate") { event.respondWith(networkFirstShell(event.request, "/")); return; }
  if (["script","style","image","worker","font"].includes(event.request.destination)) event.respondWith(cacheFirstShell(event.request));
});