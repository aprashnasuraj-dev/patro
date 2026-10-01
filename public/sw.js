const VERSION = "aafnai-pwa-v4";
const CORE = ["/", "/tools", "/me", "/time-machine", "/on-this-day", "/samudaya", "/embed/today", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/maskable-512.png"];
const REMINDER_SHELL = "/tools";

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}
function isSync(url) {
  return url.pathname === "/api/v1/sync";
}
function isCalendarApi(url) {
  return isSync(url) || url.pathname.startsWith("/api/v1/calendar/");
}
function isReminderShell(url) {
  return url.pathname === "/tools";
}
function iso(date) {
  return date.getUTCFullYear() + "-" + String(date.getUTCMonth()+1).padStart(2,"0") + "-" + String(date.getUTCDate()).padStart(2,"0");
}
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
  } catch {
    return null;
  }
}
async function warmOffline(cache) {
  await Promise.allSettled(CORE.map((url) => putIfOk(cache, new Request(url, { credentials:"same-origin" }))));
  const today = iso(new Date());
  await putIfOk(cache, new Request("/api/v1/sync?date=" + encodeURIComponent(today), { headers:{accept:"application/json"} }));
  const range = currentMonthRange();
  await putIfOk(cache, new Request("/api/v1/sync?start=" + encodeURIComponent(range.start) + "&end=" + encodeURIComponent(range.end), { headers:{accept:"application/json"} }));
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
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!isSameOrigin(url)) return;

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
