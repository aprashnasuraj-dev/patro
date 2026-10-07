type IdleWindow = Window & typeof globalThis & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number };

const OFFLINE_MODULE_LOADERS = [
  () => import("./utilities/UtilitySuite"),
  () => import("./features/nepali-tools/NepaliTools"),
  () => import("./patro-tools-integration/PatroToolsShell"),
  () => import("./components/MyDiary"),
];

const SW_REVISION = "aafnai-pwa-v12";
const CACHE_EPOCH_KEY = "patro.runtime.cache-epoch";
const RELOAD_EPOCH_KEY = "patro.runtime.controller-epoch";
const STALE_CACHE_PREFIXES = [
  "aafnai-shell-",
  "aafnai-calendar-",
  "aafnai-public-data-",
  "aafnai-pwa-",
  "patro-shell-",
  "mero-patro-shell-",
  "आफ्नै पात्रो-pwa-",
];

function runWhenIdle(task: () => void) {
  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    idleWindow.requestIdleCallback(() => task(), { timeout: 6000 });
    return;
  }
  window.setTimeout(task, 2500);
}

async function prewarmOfflineModules() {
  if (!navigator.onLine) return;
  for (const load of OFFLINE_MODULE_LOADERS) {
    try { await load(); } catch { /* best-effort offline prewarm */ }
  }
}

async function clearStaleRuntimeCaches() {
  try {
    if (localStorage.getItem(CACHE_EPOCH_KEY) === SW_REVISION) return;
    if (!("caches" in window)) return;
    const names = await caches.keys();
    await Promise.all(names.filter((name) => STALE_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix))).map((name) => caches.delete(name)));
    localStorage.setItem(CACHE_EPOCH_KEY, SW_REVISION);
  } catch { /* cache recovery must never block app boot */ }
}

function installControllerRefresh() {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    try {
      if (sessionStorage.getItem(RELOAD_EPOCH_KEY) === SW_REVISION) return;
      sessionStorage.setItem(RELOAD_EPOCH_KEY, SW_REVISION);
    } catch { /* session storage is optional */ }
    refreshing = true;
    window.location.reload();
  });
}

export function registerPatroServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  installControllerRefresh();
  window.addEventListener("patro:prepare-offline", () => {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ type: "WARM_OFFLINE" });
    }).catch(() => undefined);
    runWhenIdle(() => { void prewarmOfflineModules(); });
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`/sw.js?rev=${encodeURIComponent(SW_REVISION)}`, { scope: "/", updateViaCache: "none" }).then(async (registration) => {
      try {
        await clearStaleRuntimeCaches();
        await registration.update();
        if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
        await navigator.serviceWorker.ready;
      } catch { /* app remains usable if service worker setup fails */ }
    }).catch((error) => console.warn("Service worker registration failed", error));
  });
}
