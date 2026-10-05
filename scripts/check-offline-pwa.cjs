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
const STATIC_INDEX_PATH = "/data/calendar/offline-24-months/index.json";
const INTERACTIVE_SELECTOR = "button, input, textarea, select, a[href], [contenteditable=true]";

async function waitForApp(page) {
  await page.waitForFunction(() => {
    const main = document.querySelector("main");
    return Boolean(main && (main.innerText || "").trim().length >= 20);
  }, null, { timeout: 20000 });
}

async function waitForInteractiveSurface(page) {
  await page.waitForFunction((selector) => {
    const main = document.querySelector("main");
    if (!main) return false;
    if (main.querySelector(selector)) return true;
    for (const element of main.querySelectorAll("*")) if (element.shadowRoot?.querySelector(selector)) return true;
    for (const frame of main.querySelectorAll("iframe")) {
      try { if (frame.contentDocument?.querySelector(selector)) return true; } catch {}
    }
    return false;
  }, INTERACTIVE_SELECTOR, { timeout: 8000 }).catch(() => undefined);
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
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.controller?.postMessage({ type: "WARM_OFFLINE" }));

  // The PWA must fully prewarm the index + all 25 concrete month entries (12 back + current + 12 forward).
  await page.waitForFunction(async () => {
    const name = (await caches.keys()).find((key) => key.startsWith("aafnai-static-calendar-24m-"));
    if (!name) return false;
    const cache = await caches.open(name);
    return (await cache.keys()).length >= 26;
  }, null, { timeout: 25000 });

  const before = await page.evaluate(async () => {
    const result = {};
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      result[name] = (await cache.keys()).map((request) => request.url);
    }
    return result;
  });

  const calendarCache = Object.entries(before).find(([name]) => name.startsWith("aafnai-calendar-") && !name.includes("static"));
  const staticCalendarCache = Object.entries(before).find(([name]) => name.startsWith("aafnai-static-calendar-24m-"));
  const publicCache = Object.entries(before).find(([name]) => name.startsWith("aafnai-public-data-"));
  if (!calendarCache) throw new Error("bounded API calendar cache was not created");
  if (calendarCache[1].length > 10) throw new Error(`calendar API cache exceeded limit: ${calendarCache[1].length}`);
  if (!staticCalendarCache) throw new Error("24-month static calendar cache was not created");
  if (staticCalendarCache[1].length !== 26) throw new Error(`24-month static cache expected 26 objects (index + 25 months); got ${staticCalendarCache[1].length}`);
  if (publicCache && publicCache[1].length > 18) throw new Error(`public data cache exceeded limit: ${publicCache[1].length}`);

  const boundary = await page.evaluate(async (indexPath) => {
    const name = (await caches.keys()).find((key) => key.startsWith("aafnai-static-calendar-24m-"));
    if (!name) return null;
    const cache = await caches.open(name);
    const response = await cache.match(indexPath, { ignoreVary: true });
    if (!response) return null;
    const index = await response.json();
    const months = Array.isArray(index?.months) ? index.months : [];
    return {
      past: Number(index?.past_months || 0),
      future: Number(index?.future_months || 0),
      count: months.length,
      first: months[0] || null,
      last: months[months.length - 1] || null,
      totalBytes: months.reduce((sum, month) => sum + Number(month?.bytes || 0), 0),
    };
  }, STATIC_INDEX_PATH);
  if (!boundary || boundary.past !== 12 || boundary.future !== 12 || boundary.count !== 25 || !boundary.first || !boundary.last) {
    throw new Error(`invalid 24-month static index: ${JSON.stringify(boundary)}`);
  }

  for (const urls of Object.values(before)) {
    for (const raw of urls) {
      const url = new URL(raw);
      if (/^\/(me|notes|planner|family|settings|my-data|admin)(\/|$)/.test(url.pathname)) throw new Error(`private route leaked into CacheStorage: ${url.pathname}`);
      if (url.pathname.startsWith("/api/") && !SAFE_API.some((pattern) => pattern.test(url.pathname + url.search))) throw new Error(`unexpected API cached offline: ${url.pathname}${url.search}`);
    }
  }

  await context.setOffline(true);

  const results = [];
  for (const route of OFFLINE_ROUTES) {
    const response = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null);
    await waitForApp(page);
    await waitForInteractiveSurface(page);
    const snapshot = await page.evaluate((selector) => {
      const main = document.querySelector("main");
      let interactive = main?.querySelectorAll(selector).length || 0;
      let shadowInteractive = 0;
      let frameInteractive = 0;
      if (main) {
        for (const element of main.querySelectorAll("*")) {
          const count = element.shadowRoot?.querySelectorAll(selector).length || 0;
          shadowInteractive += count; interactive += count;
        }
        for (const frame of main.querySelectorAll("iframe")) {
          try { const count = frame.contentDocument?.querySelectorAll(selector).length || 0; frameInteractive += count; interactive += count; } catch {}
        }
      }
      return { title: document.title, text: (main?.innerText || "").trim(), interactive, shadowInteractive, frameInteractive, controlled: Boolean(navigator.serviceWorker.controller) };
    }, INTERACTIVE_SELECTOR);
    if (!snapshot.controlled) throw new Error(`${route} lost service-worker control offline`);
    if (!snapshot.title) throw new Error(`${route} has no title offline`);
    if (snapshot.text.length < 20) throw new Error(`${route} rendered too little offline content`);
    if (snapshot.interactive < 1) throw new Error(`${route} has no interactive surface offline`);
    results.push({ route, status: response?.status() || "service-worker", title: snapshot.title, interactive: snapshot.interactive, shadowInteractive: snapshot.shadowInteractive, frameInteractive: snapshot.frameInteractive });
  }

  // Prove both ±12-month boundaries render full Tithi + Nepal Sambat with the network disabled.
  const boundaryResults = [];
  for (const meta of [boundary.first, boundary.last]) {
    const route = `/calendar/${meta.year}/${String(meta.month).padStart(2, "0")}`;
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null);
    await waitForApp(page);
    await page.waitForFunction(() => document.querySelectorAll(".pc-tithi").length >= 28, null, { timeout: 8000 });
    const facts = await page.evaluate(() => {
      const clean = (selector) => [...document.querySelectorAll(selector)].map((node) => (node.textContent || "").trim()).filter((value) => value && value !== "—").length;
      return { cells: document.querySelectorAll(".pc-bs").length, tithi: clean(".pc-tithi"), ns: clean(".pc-ns") };
    });
    if (facts.cells < 28 || facts.tithi < 25 || facts.ns < 25) throw new Error(`${route} did not retain full offline calendar facts: ${JSON.stringify(facts)}`);
    boundaryResults.push({ route, ...facts });
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
  console.log(JSON.stringify({ ok: true, cachedCalendarEntries: calendarCache[1].length, cachedStaticCalendarEntries: staticCalendarCache[1].length, staticCalendarBytes: boundary.totalBytes, cachedPublicEntries: publicCache?.[1].length || 0, converted, routes: results, boundaryMonths: boundaryResults }, null, 2));
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
