const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:4173";
const OFFLINE_ROUTES = ["/", "/convert", "/tools/calc", "/tools/nepali-typing", "/me/notes"];
const SAFE_API = [
  /^\/api\/v1\/sync(?:\?|$)/,
  /^\/api\/v1\/calendar\//,
  /^\/api\/v1\/today(?:\?|$)/,
  /^\/api\/v1\/festivals(?:\?|$)/,
  /^\/api\/v1\/holidays(?:\?|$)/,
  /^\/api\/v1\/on-this-day(?:\?|$)/,
  /^\/api\/v1\/time-machine(?:\?|$)/,
  /^\/api\/v1\/typing\/lexicon(?:\?|$)/,
];

const INTERACTIVE_SELECTOR = "button, input, textarea, select, a[href], [contenteditable=true]";

async function waitForApp(page) {
  await page.waitForFunction(() => {
    const main = document.querySelector("main");
    return Boolean(main && (main.innerText || "").trim().length >= 20);
  }, { timeout: 20000 });
}

async function waitForInteractiveSurface(page) {
  await page.waitForFunction((selector) => {
    const main = document.querySelector("main");
    if (!main) return false;
    if (main.querySelector(selector)) return true;

    for (const element of main.querySelectorAll("*")) {
      if (element.shadowRoot?.querySelector(selector)) return true;
    }

    for (const frame of main.querySelectorAll("iframe")) {
      try {
        if (frame.contentDocument?.querySelector(selector)) return true;
      } catch {}
    }

    return false;
  }, INTERACTIVE_SELECTOR, { timeout: 8000 }).catch(() => undefined);
}

async function waitForServiceWorkerControl(page) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), { timeout: 10000 });
      await waitForApp(page);
      // controllerchange can trigger the one intentional PWA reload immediately after
      // navigator.serviceWorker.controller becomes truthy. Give that navigation a chance to settle.
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      await page.waitForTimeout(250);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => undefined);
      await waitForApp(page);
    }
  }
  throw lastError || new Error("service worker never took control");
}

async function stableEvaluate(page, fn, arg) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await page.evaluate(fn, arg);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || error || "");
      if (!message.includes("Execution context was destroyed") || attempt === 2) throw error;
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      await waitForApp(page).catch(() => undefined);
      await page.waitForTimeout(250);
    }
  }
  throw lastError;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForApp(page);
  await stableEvaluate(page, async () => { await navigator.serviceWorker.ready; });
  // pwa.ts intentionally reloads once on controllerchange. Do not race that navigation
  // with a second explicit page.reload(); just wait until the new worker controls the page.
  await waitForServiceWorkerControl(page);
  await stableEvaluate(page, () => navigator.serviceWorker.controller?.postMessage({ type: "WARM_OFFLINE" }));

  // Give the registered PWA enough idle time to prewarm local feature bundles.
  await page.waitForTimeout(7500);

  const before = await stableEvaluate(page, async () => {
    const result = {};
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      result[name] = (await cache.keys()).map((request) => request.url);
    }
    return result;
  });

  const calendarCache = Object.entries(before).find(([name]) => name.startsWith("aafnai-calendar-"));
  const publicCache = Object.entries(before).find(([name]) => name.startsWith("aafnai-public-data-"));
  if (!calendarCache) throw new Error("bounded calendar cache was not created");
  if (calendarCache[1].length > 10) throw new Error(`calendar cache exceeded limit: ${calendarCache[1].length}`);
  if (publicCache && publicCache[1].length > 18) throw new Error(`public data cache exceeded limit: ${publicCache[1].length}`);

  for (const urls of Object.values(before)) {
    for (const raw of urls) {
      const url = new URL(raw);
      if (/^\/(me|notes|planner|family|settings|my-data|admin)(\/|$)/.test(url.pathname)) {
        throw new Error(`private route leaked into CacheStorage: ${url.pathname}`);
      }
      if (url.pathname.startsWith("/api/") && !SAFE_API.some((pattern) => pattern.test(url.pathname + url.search))) {
        throw new Error(`unexpected API cached offline: ${url.pathname}${url.search}`);
      }
    }
  }

  await context.setOffline(true);

  const results = [];
  for (const route of OFFLINE_ROUTES) {
    const response = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null);
    await waitForApp(page);
    await waitForInteractiveSurface(page);
    const snapshot = await stableEvaluate(page, (selector) => {
      const main = document.querySelector("main");
      let interactive = main?.querySelectorAll(selector).length || 0;
      let shadowInteractive = 0;
      let frameInteractive = 0;

      if (main) {
        for (const element of main.querySelectorAll("*")) {
          const count = element.shadowRoot?.querySelectorAll(selector).length || 0;
          shadowInteractive += count;
          interactive += count;
        }

        for (const frame of main.querySelectorAll("iframe")) {
          try {
            const count = frame.contentDocument?.querySelectorAll(selector).length || 0;
            frameInteractive += count;
            interactive += count;
          } catch {}
        }
      }

      return {
        title: document.title,
        text: (main?.innerText || "").trim(),
        interactive,
        shadowInteractive,
        frameInteractive,
        controlled: Boolean(navigator.serviceWorker.controller),
      };
    }, INTERACTIVE_SELECTOR);
    if (!snapshot.controlled) throw new Error(`${route} lost service-worker control offline`);
    if (!snapshot.title) throw new Error(`${route} has no title offline`);
    if (snapshot.text.length < 20) throw new Error(`${route} rendered too little offline content`);
    if (snapshot.interactive < 1) throw new Error(`${route} has no interactive surface offline`);
    results.push({
      route,
      status: response?.status() || "service-worker",
      title: snapshot.title,
      interactive: snapshot.interactive,
      shadowInteractive: snapshot.shadowInteractive,
      frameInteractive: snapshot.frameInteractive,
    });
  }

  await page.goto(BASE + "/convert", { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null);
  await waitForApp(page);
  await page.locator('input[type="date"]').fill("2026-10-03");
  await page.getByRole("button", { name: "रूपान्तरण गर्नुहोस्" }).click();
  await page.locator(".ap-convert-result strong").waitFor({ state: "visible", timeout: 5000 });
  const converted = (await page.locator(".ap-convert-result strong").innerText()).trim();
  if (!converted || converted === "—") throw new Error("BS/AD converter did not produce an offline result");

  if (pageErrors.length) throw new Error(`offline browser page errors: ${pageErrors.join(" | ")}`);

  await browser.close();
  console.log(JSON.stringify({ ok: true, cachedCalendarEntries: calendarCache[1].length, cachedPublicEntries: publicCache?.[1].length || 0, converted, routes: results }, null, 2));
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
