/* Mobile-safe fallback if the primary React bundle cannot initialize.
 * No background polling, forced reloads, telemetry, or extra API requests. */
(() => {
  if (typeof document === "undefined") return;

  function checkBoot() {
    window.setTimeout(() => {
      const root = document.getElementById("root");
      if (!root || root.querySelector(".ap-shell") || document.getElementById("patro-boot-recovery")) return;
      // Keep the factual SEO HTML; add recovery only if no interactive app appeared.
      if (!root.querySelector("[data-seo-prerender]")) return;

      const panel = document.createElement("section");
      panel.id = "patro-boot-recovery";
      panel.setAttribute("role", "alert");
      panel.style.cssText = "box-sizing:border-box;max-width:800px;margin:12px auto 32px;padding:16px;border:1px solid #d1dfd5;border-radius:14px;background:#fff;color:#153d2a;font:600 15px/1.6 system-ui,sans-serif;";
      const title = document.createElement("strong");
      title.textContent = "पात्रो खोल्न समस्या भयो · Calendar did not finish loading";
      title.style.display = "block";
      const note = document.createElement("p");
      note.textContent = "पुरानो क्यासका कारण हुन सक्छ। पुनः लोड गर्नुहोस्। / An old browser cache may be causing this. Retry with a fresh page.";
      note.style.margin = "7px 0 12px";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "पुनः लोड / Retry";
      retry.style.cssText = "min-height:44px;padding:8px 16px;border:0;border-radius:9px;background:#176f3b;color:#fff;font:inherit;cursor:pointer";
      retry.addEventListener("click", () => {
        const url = new URL(location.href);
        url.searchParams.set("patro_refresh", String(Date.now()));
        location.replace(url.toString());
      });
      panel.append(title, note, retry);
      document.body.style.backgroundColor = "#f5f7f4";
      // React will replace the fallback (including this panel) upon successful boot.
      root.append(panel);
    }, 8000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", checkBoot, { once: true });
  else checkBoot();
})();
