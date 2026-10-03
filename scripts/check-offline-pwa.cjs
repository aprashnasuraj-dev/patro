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

async function waitForApp(page) {
  await page.waitForFunction(() => {
    const main = document.querySelector("main");
    return Boolean(main && (main.innerText || "").trim().length >= 20);
  }, { timeout: 20000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForApp(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.controller?.postMessage({ type: "WARM_OFFLINE" }));

  // Give the registered PWA enough idle time to prewarm local feature bundles.
  await page.waitForTimeout(7500);

  const before = await page.evaluate(async () => {
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
    const snapshot = await page.evaluate(() => ({
      title: document.title,
      text: (document.querySelector("main")?.innerText || "").trim(),
      interactive: document.querySelectorAll("main button, main input, main textarea, main select, main a[href], main [contenteditable=true]").length,
      controlled: Boolean(navigator.serviceWorker.controller),
    }));
    if (!snapshot.controlled) throw new Error(`${route} lost service-worker control offline`);
    if (!snapshot.title) throw new Error(`${route} has no title offline`);
    if (snapshot.text.length < 20) throw new Error(`${route} rendered too little offline content`);
    if (snapshot.interactive < 1) throw new Error(`${route} has no interactive surface offline`);
    results.push({ route, status: response?.status() || "service-worker", title: snapshot.title, interactive: snapshot.interactive });
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
