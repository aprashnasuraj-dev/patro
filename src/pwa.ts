export function registerPatroServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/astro/sw.js", { scope: "/astro/" }).catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
