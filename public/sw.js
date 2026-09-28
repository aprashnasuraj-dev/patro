const VERSION = "patro-shell-v3";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];
const isApi = (url) => url.pathname.startsWith("/api/v1/");
const isCalendarApi = (url) => url.pathname === "/api/v1/sync" || url.pathname.startsWith("/api/v1/calendar/");
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (isCalendarApi(url)) {
    event.respondWith(caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }).catch(() => cached || Response.error());
      return cached || network;
    }));
    return;
  }
  if (isApi(url)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((r) => r || Response.error())));
    return;
  }
  event.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(event.request);
    const network = fetch(event.request).then((response) => {
      if (response.ok && (event.request.destination === "document" || event.request.destination === "script" || event.request.destination === "style" || event.request.destination === "image")) {
        cache.put(event.request, response.clone());
      }
      return response;
    }).catch(() => cached || caches.match("/"));
    return cached || network;
  }));
});
