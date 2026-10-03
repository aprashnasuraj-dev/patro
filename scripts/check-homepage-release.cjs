const { chromium } = require("playwright");

const BASE = process.env.PATRO_TEST_BASE || "http://127.0.0.1:4173";

function fail(message) { throw new Error(message); }

(async () => {
  const browser = await chromium.launch({ headless: true });

  // First paint: JavaScript-disabled HTML must already look like a product shell,
  // not the old long raw SEO article that escaped into production.
  const firstPaint = await browser.newContext({ viewport: { width: 375, height: 812 }, javaScriptEnabled: false });
  const noJs = await firstPaint.newPage();
  await noJs.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  const paint = await noJs.evaluate(() => {
    const shell = document.querySelector(".ap-prerender-home");
    const calendar = document.querySelector(".ap-prerender-calendar");
    const copy = document.querySelector(".ap-prerender-copy");
    const legacy = document.querySelector("main.seo-prerender:not(.ap-prerender-home) .seo-related-searches");
    const rect = (node) => node ? node.getBoundingClientRect() : null;
    return {
      shell: Boolean(shell), calendar: rect(calendar), copy: rect(copy), legacy: Boolean(legacy),
      overflow: document.documentElement.scrollWidth - innerWidth,
      firstScreen: document.elementFromPoint(187, 760)?.closest(".ap-prerender-copy") ? "copy" : "product"
    };
  });
  if (!paint.shell || !paint.calendar || !paint.copy) fail("homepage prerender is missing branded calendar-first shell");
  if (paint.legacy) fail("legacy raw SEO related-search block leaked into homepage first paint");
  if (paint.calendar.top >= paint.copy.top) fail("SEO copy appears before the prerender calendar");
  if (paint.overflow > 1) fail(`homepage prerender overflows 375px viewport by ${paint.overflow}px`);
  await firstPaint.close();

  // Force every API call to fail. The homepage must still render its BS date and
  // month grid locally and must never turn into an error-looking landing page.
  const failureContext = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: "block" });
  await failureContext.route("**/api/**", (route) => route.fulfill({
    status: 503,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: '{"error":"forced_release_test_failure"}'
  }));
  const page = await failureContext.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator(".rh-calendar .rh-cell:not(.is-empty)").first().waitFor({ state: "visible", timeout: 20000 });
  const runtime = await page.evaluate(() => {
    const cells = [...document.querySelectorAll(".rh-calendar .rh-cell:not(.is-empty)")];
    const first = cells[0];
    const text = document.querySelector("main")?.innerText || "";
    const navs = document.querySelectorAll(".ap-tabbar").length;
    const desktopNav = document.querySelector(".ap-nav");
    const visibleDesktopNav = desktopNav ? getComputedStyle(desktopNav).display !== "none" : false;
    const badCell = cells.find((cell) => {
      const box = cell.getBoundingClientRect();
      return box.left < -1 || box.right > innerWidth + 1;
    });
    return {
      count: cells.length,
      hasBs: Boolean(first?.querySelector(".rh-cell-main strong")),
      hasAd: Boolean(first?.querySelector(".rh-ad-date")),
      hasWeekday: Boolean(first?.querySelector(".rh-weekday")),
      badFailureCopy: /आजको पात्रो लोड हुन सकेन|आजको पात्रो तयार हुँदैछ/.test(text),
      navs, visibleDesktopNav, overflow: document.documentElement.scrollWidth - innerWidth,
      badCell: Boolean(badCell),
      todayHeading: (document.querySelector("#rh-today-title")?.textContent || "").trim()
    };
  });
  if (runtime.count < 27) fail(`local month grid rendered only ${runtime.count} days with APIs down`);
  if (!runtime.hasBs || !runtime.hasAd || !runtime.hasWeekday) fail("rich local day cell lost required core fields");
  if (runtime.badFailureCopy) fail("homepage exposed the old API failure/loading copy");
  if (runtime.navs !== 1) fail(`expected one authoritative mobile nav, found ${runtime.navs}`);
  if (runtime.visibleDesktopNav) fail("desktop navigation remained visible alongside mobile navigation at 375px");
  if (runtime.overflow > 1 || runtime.badCell) fail("rich calendar cells overflow the 375px mobile viewport");
  if (!runtime.todayHeading) fail("local-first today heading is empty with APIs down");
  if (errors.length) fail(`homepage browser errors: ${errors.join(" | ")}`);
  await failureContext.close();

  await browser.close();
  console.log(JSON.stringify({ ok: true, firstPaint: paint, apiFailureHome: runtime }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
