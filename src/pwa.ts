type IdleWindow = Window & typeof globalThis & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number };

const OFFLINE_MODULE_LOADERS = [
  () => import("./utilities/UtilitySuite"),
  () => import("./features/nepali-tools/NepaliTools"),
  () => import("./patro-tools-integration/PatroToolsShell"),
  () => import("./components/MyDiary"),
];

const SW_REVISION = "2026-10-05-runtime-recovery-v3";
const CACHE_EPOCH_KEY = "patro.runtime.cache-epoch";
const STALE_CACHE_PREFIXES = [
  "aafnai-shell-",
  "aafnai-calendar-",
  "aafnai-public-data-",
  "aafnai-pwa-",
  "patro-shell-",
  "mero-patro-shell-",
  "meropatro-pwa-",
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
    try {
      await load();
    } catch {
      // Offline prewarming is best-effort; route-level lazy loading remains authoritative.
    }
  }
}

async function clearStaleRuntimeCaches() {
  try {
    if (localStorage.getItem(CACHE_EPOCH_KEY) === SW_REVISION) return;
    if (!("caches" in window)) return;
    const names = await caches.keys();
    await Promise.all(names.filter((name) => STALE_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix))).map((name) => caches.delete(name)));
    localStorage.setItem(CACHE_EPOCH_KEY, SW_REVISION);
  } catch {
    // Cache recovery must never prevent the live application from booting.
  }
}

function askWorkerToWarm(registration: ServiceWorkerRegistration) {
  const worker = registration.active || registration.waiting || registration.installing || navigator.serviceWorker.controller;
  worker?.postMessage({ type: "WARM_OFFLINE" });
}

export function registerPatroServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`/sw.js?rev=${encodeURIComponent(SW_REVISION)}`, { scope: "/", updateViaCache: "none" }).then(async (registration) => {
      try {
        await clearStaleRuntimeCaches();
        await registration.update();
        if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
        await navigator.serviceWorker.ready;
        askWorkerToWarm(registration);
        runWhenIdle(() => { void prewarmOfflineModules(); });
      } catch {
        // The application remains fully usable online if service-worker setup is unavailable.
      }
    }).catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
