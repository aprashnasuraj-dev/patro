const VERSION = "aafnai-pwa-v7";
const CORE = [
  "/", "/today", "/tools", "/convert", "/rashifal", "/me", "/time-machine", "/on-this-day", "/samachar", "/fm", "/tv",
  "/tools/astro", "/tools/nepali-typing", "/tools/preeti-converter",
  "/samudaya", "/nepal-sambat/mandala", "/samudaya/lhosar", "/samudaya/tharu", "/samudaya/mithila", "/samudaya/kirat", "/samudaya/hijri", "/samudaya/chakra",
  "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/maskable-512.png"
];
const LANGUAGE_TOOL_ASSETS = [
  "/nepali-tools/index.html",
  "/nepali-tools/styles.css",
  "/nepali-tools/app.mjs",
  "/nepali-tools/worker.mjs",
  "/nepali-tools/core/roman.mjs",
  "/nepali-tools/core/converter.mjs",
  "/nepali-tools/core/suggestions.mjs",
  "/nepali-tools/core/aliases.mjs",
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
function currentMonthRange() {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 41);
  return { start: iso(start), end: iso(end) };
}
async function putIfOk(cache, request) {
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch { return null; }
}
async function warmLanguageTools(cache) {
  await Promise.allSettled(LANGUAGE_TOOL_ASSETS.map((url) => putIfOk(cache, new Request(url, { credentials:"same-origin", cache:"reload" }))));
  await putIfOk(cache, new Request(LANGUAGE_LEXICON, { headers:{accept:"text/plain,*/*"}, credentials:"same-origin" }));
}
async function warmOffline(cache) {
  await Promise.allSettled(CORE.map((url) => putIfOk(cache, new Request(url, { credentials:"same-origin" }))));
  await warmLanguageTools(cache);
  const today = iso(new Date());
  await putIfOk(cache, new Request("/api/v1/sync?date=" + encodeURIComponent(today), { headers:{accept:"application/json"} }));
  const range = currentMonthRange();
  await putIfOk(cache, new Request("/api/v1/sync?start=" + encodeURIComponent(range.start) + "&end=" + encodeURIComponent(range.end), { headers:{accept:"application/json"} }));
}
async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request, { ignoreVary:true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}
async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request, { ignoreVary:true });
  const network = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return hit || (await network) || Response.error();
}
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request, {ignoreVary:true})) || (fallbackUrl ? await cache.match(fallbackUrl) : null) || Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then(warmOffline).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => (key.startsWith("patro-shell-") || key.startsWith("mero-patro-shell-") || key.startsWith("meropatro-pwa-") || key.startsWith("aafnai-pwa-") || key.startsWith("आफ्नै पात्रो-pwa-")) && key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "WARM_LANGUAGE_TOOLS") {
    event.waitUntil(caches.open(VERSION).then(warmLanguageTools));
  }
  if (event.data?.type === "WARM_OFFLINE") {
    event.waitUntil(caches.open(VERSION).then(warmOffline));
  }
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!isSameOrigin(url)) return;

  if (isLanguageToolAsset(url) || isLanguageLexicon(url)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  if (isCalendarApi(url)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  if (isReminderShell(url)) {
    event.respondWith(networkFirst(event.request, REMINDER_SHELL));
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "/"));
    return;
  }
  if (["script","style","image","worker","font"].includes(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
