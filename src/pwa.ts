type IdleWindow = Window & typeof globalThis & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number };

const OFFLINE_MODULE_LOADERS = [
  () => import("./utilities/UtilitySuite"),
  () => import("./features/nepali-tools/NepaliTools"),
  () => import("./patro-tools-integration/PatroToolsShell"),
  () => import("./components/MyDiary"),
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

function askWorkerToWarm(registration: ServiceWorkerRegistration) {
  const worker = registration.active || registration.waiting || registration.installing || navigator.serviceWorker.controller;
  worker?.postMessage({ type: "WARM_OFFLINE" });
}

export function registerPatroServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async (registration) => {
      try {
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
