const VERSION = "aafnai-pwa-v8";
const LOCAL_CONFIG_CACHE = "aafnai-local-config-v1";
const MORNING_CONFIG_KEY = "/__local/morning-config";
const MORNING_SENT_KEY = "/__local/morning-sent";
const CORE = [
  "/", "/today", "/tools", "/convert", "/rashifal", "/me", "/time-machine", "/on-this-day", "/samachar", "/fm", "/tv",
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
const REMINDER_SHELL = "/tools";

function isSameOrigin(url) { return url.origin === self.location.origin; }
function isSync(url) { return url.pathname === "/api/v1/sync"; }
function isCalendarApi(url) { return isSync(url) || url.pathname.startsWith("/api/v1/calendar/"); }
function isReminderShell(url) { return url.pathname === "/tools"; }
function isLanguageToolAsset(url) { return url.pathname.startsWith("/nepali-tools/"); }
function isLanguageLexicon(url) { return url.pathname === "/api/v1/typing/lexicon" && url.searchParams.get("format") === "words"; }
function iso(date) { return date.getUTCFullYear() + "-" + String(date.getUTCMonth()+1).padStart(2,"0") + "-" + String(date.getUTCDate()).padStart(2,"0"); }
function nepalClock(now = Date.now()) { return new Date(now + (5*60+45)*60*1000); }
function nepalDate(now = Date.now()) { return nepalClock(now).toISOString().slice(0,10); }
function nepalMinutes(now = Date.now()) { const d=nepalClock(now); return d.getUTCHours()*60+d.getUTCMinutes(); }
function currentMonthRange() {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(first); start.setUTCDate(1 - first.getUTCDay());
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 41);
  return { start: iso(start), end: iso(end) };
}
async function putIfOk(cache, request) {
  try { const response = await fetch(request); if (response.ok) await cache.put(request, response.clone()); return response; } catch { return null; }
}
async function warmLanguageTools(cache) {
  await Promise.allSettled(LANGUAGE_TOOL_ASSETS.map((url) => putIfOk(cache, new Request(url, { credentials:"same-origin", cache:"reload" }))));
  await putIfOk(cache, new Request(LANGUAGE_LEXICON, { headers:{accept:"text/plain,*/*"}, credentials:"same-origin" }));
}
async function warmOffline(cache) {
  await Promise.allSettled(CORE.map((url) => putIfOk(cache, new Request(url, { credentials:"same-origin" }))));
  await warmLanguageTools(cache);
  const today = nepalDate();
  await putIfOk(cache, new Request("/api/v1/sync?date=" + encodeURIComponent(today), { headers:{accept:"application/json"} }));
  const range = currentMonthRange();
  await putIfOk(cache, new Request("/api/v1/sync?start=" + encodeURIComponent(range.start) + "&end=" + encodeURIComponent(range.end), { headers:{accept:"application/json"} }));
}
async function cacheFirst(request) {
  const cache = await caches.open(VERSION); const hit = await cache.match(request, { ignoreVary:true }); if (hit) return hit;
  const response = await fetch(request); if (response.ok) await cache.put(request, response.clone()); return response;
}
async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION); const hit = await cache.match(request, { ignoreVary:true });
  const network = fetch(request).then(async (response) => { if (response.ok) await cache.put(request, response.clone()); return response; }).catch(() => null);
  return hit || (await network) || Response.error();
}
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(VERSION);
  try { const response = await fetch(request); if (response.ok) await cache.put(request, response.clone()); return response; }
  catch { return (await cache.match(request, {ignoreVary:true})) || (fallbackUrl ? await cache.match(fallbackUrl) : null) || Response.error(); }
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
  const cache=await caches.open(VERSION); const keys=await cache.keys();
  for(const request of keys){
    const url=new URL(request.url); if(url.pathname!=="/api/v1/sync")continue;
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

self.addEventListener("install", (event) => { event.waitUntil(caches.open(VERSION).then(warmOffline).then(() => self.skipWaiting())); });
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => (key.startsWith("patro-shell-") || key.startsWith("mero-patro-shell-") || key.startsWith("meropatro-pwa-") || key.startsWith("aafnai-pwa-") || key.startsWith("आफ्नै पात्रो-pwa-")) && key !== VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()).then(()=>maybeMorningGreeting(false)));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "WARM_LANGUAGE_TOOLS") event.waitUntil(caches.open(VERSION).then(warmLanguageTools));
  if (event.data?.type === "WARM_OFFLINE") event.waitUntil(caches.open(VERSION).then(warmOffline));
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
  if (event.request.method !== "GET") return; const url = new URL(event.request.url); if (!isSameOrigin(url)) return;
  if (isLanguageToolAsset(url) || isLanguageLexicon(url)) { event.respondWith(cacheFirst(event.request)); return; }
  if (isCalendarApi(url)) { event.respondWith(staleWhileRevalidate(event.request)); return; }
  if (isReminderShell(url)) { event.respondWith(networkFirst(event.request, REMINDER_SHELL)); return; }
  if (url.pathname.startsWith("/api/")) { event.respondWith(networkFirst(event.request)); return; }
  if (event.request.mode === "navigate") { event.respondWith(networkFirst(event.request, "/")); return; }
  if (["script","style","image","worker","font"].includes(event.request.destination)) event.respondWith(staleWhileRevalidate(event.request));
});
