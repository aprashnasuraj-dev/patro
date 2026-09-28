export function registerPatroServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const isTools = window.location.pathname === "/tools" || window.location.pathname.startsWith("/tools/");
    const script = isTools ? "/tools/sw.js" : "/astro/sw.js";
    const scope = isTools ? "/tools/" : "/astro/";

    navigator.serviceWorker.register(script, { scope }).catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
