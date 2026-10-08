const { chromium } = require("playwright");

const BASE = process.env.PATRO_TEST_BASE || "http://127.0.0.1:4173";

function fail(message) { throw new Error(message); }

(async () => {
  const browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--disable-dev-shm-usage"] });

  const firstPaint = await browser.newContext({ viewport: { width: 375, height: 812 }, javaScriptEnabled: false });
  const noJs = await firstPaint.newPage();
  await noJs.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  const paint = await noJs.evaluate(() => {
    const shell = document.querySelector(".ap-prerender-home");
    const hero = document.querySelector(".ap-prerender-hero");
    const calendar = document.querySelector(".ap-prerender-calendar");
    const copy = document.querySelector(".ap-prerender-copy");
    const legacy = document.querySelector("main.seo-prerender:not(.ap-prerender-home) .seo-related-searches");
    const rect = (node) => node ? node.getBoundingClientRect() : null;
    return {
      shell: Boolean(shell), hero: rect(hero), calendar: rect(calendar), copy: rect(copy), legacy: Boolean(legacy),
      overflow: document.documentElement.scrollWidth - innerWidth,
      firstScreen: document.elementFromPoint(187, 760)?.closest(".ap-prerender-copy") ? "copy" : "product"
    };
  });
  if (!paint.shell || !paint.hero || !paint.calendar) fail("homepage prerender is missing branded calendar-first shell");
  if (paint.legacy) fail("legacy raw SEO related-search block leaked into homepage first paint");
  if (paint.copy && paint.calendar.top >= paint.copy.top) fail("SEO copy appears before the prerender calendar");
  if (paint.calendar.top > 760) fail(`prerender calendar starts too low on 375px viewport (${Math.round(paint.calendar.top)}px)`);
  if (paint.overflow > 1) fail(`homepage prerender overflows 375px viewport by ${paint.overflow}px`);
  await firstPaint.close();

  const failureContext = await browser.newContext({ viewport: { width: 375, height: 812 }, serviceWorkers: "block", reducedMotion: "reduce" });
  await failureContext.route("**/api/**", (route) => route.fulfill({
    status: 503,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: '{"error":"forced_release_test_failure"}'
  }));
  const page = await failureContext.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("crash", () => console.error("RELEASE_BROWSER_CRASH: homepage Chromium target crashed"));
  page.on("console", (message) => { if (message.type() === "error") console.error("RELEASE_BROWSER_CONSOLE:",message.text()); });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator(".rh-calendar .rh-cell:not(.is-empty)").first().waitFor({ state: "visible", timeout: 20000 }).catch(async (error) => {
    const diagnostic = await page.evaluate(() => ({
      url: location.href,
      rootText: document.querySelector("#root")?.textContent?.slice(0, 600),
      calendarNodes: document.querySelectorAll(".rh-calendar").length,
      cells: document.querySelectorAll(".rh-cell").length,
      jsAssets: [...document.scripts].map(s => s.src).filter(Boolean).slice(-5)
    }));
    throw new Error(`Homepage calendar unavailable with APIs offline: ${error.message}; browser errors=${JSON.stringify(errors)}; diagnostic=${JSON.stringify(diagnostic)}`);
  });
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
    // Day cell (Oct 2026 layout): festival · AD date / BS day / tithi / Nepal Sambat.
    const sample = cells.find((cell) => cell.querySelector(".pc-bs")) || first;
    const richSelectors = [".pc-ad", ".pc-ns", ".pc-bs", ".pc-tithi"];
    const rich = richSelectors.map((selector) => {
      const node = sample?.querySelector(selector);
      if (!node) return { selector, exists: false, visible: false, font: 0 };
      const style = getComputedStyle(node), box = node.getBoundingClientRect();
      return { selector, exists: true, visible: style.display !== "none" && style.visibility !== "hidden" && box.height > 0, font: parseFloat(style.fontSize) || 0 };
    });
    const calendar = document.querySelector(".rh-calendar")?.getBoundingClientRect();
    return {
      count: cells.length,
      hasBs: Boolean(first?.querySelector(".pc-bs")),
      hasAd: Boolean(first?.querySelector(".pc-ad")),
      hasWeekday: document.querySelectorAll(".rh-calendar .rh-weekheads > *").length === 7,
      hasTithi: Boolean(first?.querySelector(".pc-tithi")),
      hasEvent: Boolean(first?.querySelector(".pc-event")),
      rich,
      calendarTop: calendar?.top ?? 9999,
      badFailureCopy: /आजको पात्रो लोड हुन सकेन|आजको पात्रो तयार हुँदैछ/.test(text),
      navs, visibleDesktopNav, overflow: document.documentElement.scrollWidth - innerWidth,
      badCell: Boolean(badCell),
      todayHeading: (document.querySelector("#rh-today-title")?.textContent || "").trim()
    };
  });
  if (runtime.count < 27) fail(`local month grid rendered only ${runtime.count} days with APIs down`);
  if (!runtime.hasBs || !runtime.hasAd || !runtime.hasWeekday || !runtime.hasTithi || !runtime.hasEvent) fail("rich local day cell lost required core fields");
  for (const metric of runtime.rich) {
    if (!metric.exists || !metric.visible) fail(`375px calendar field ${metric.selector} is hidden`);
    if (metric.font < 13) fail(`375px calendar field ${metric.selector} is ${metric.font}px; minimum is 13px`);
  }
  if (runtime.calendarTop > 760) fail(`main calendar starts too low on 375px viewport (${Math.round(runtime.calendarTop)}px)`);
  if (runtime.badFailureCopy) fail("homepage exposed the old API failure/loading copy");
  if (runtime.navs !== 1) fail(`expected one authoritative mobile nav, found ${runtime.navs}`);
  if (runtime.visibleDesktopNav) fail("desktop navigation remained visible alongside mobile navigation at 375px");
  if (runtime.overflow > 1 || runtime.badCell) fail("rich calendar cells overflow the 375px mobile viewport");
  if (!runtime.todayHeading) fail("local-first today heading is empty with APIs down");
  if (errors.length) fail(`homepage browser errors: ${errors.join(" | ")}`);

  // Regression for the public month/year selectors: URL changes MUST update
  // the real React calendar, even when every API endpoint returns 503.
  async function assertCalendarRoute(year, month) {
    const path = `/calendar/${year}/${String(month).padStart(2, "0")}`;
    await page.waitForURL((url) => url.pathname === path, { timeout: 12000 });
    await page.waitForFunction(({ year, month }) => {
      const yearSelect = document.querySelector('select[aria-label="विक्रम संवत् वर्ष"]');
      const monthSelect = document.querySelector('select[aria-label="विक्रम संवत् महिना"]');
      const cells = document.querySelectorAll(".rh-calendar .rh-grid .rh-cell:not(.is-empty)");
      const active = document.querySelector(".rh-calendar .rh-card-head h2")?.textContent || "";
      const label = document.querySelector(".rh-card-head h2")?.textContent || "";
      return yearSelect?.value === String(year) && monthSelect?.value === String(month)
        && cells.length >= 27 && Boolean(active || label);
    }, { year, month }, { timeout: 12000 });
    const data = await page.evaluate(() => ({
      calendarDays: document.querySelectorAll(".rh-calendar .rh-grid .rh-cell:not(.is-empty)").length,
      title: document.querySelector(".rh-calendar .rh-card-head h2")?.textContent?.trim(),
      year: document.querySelector('select[aria-label="विक्रम संवत् वर्ष"]')?.value,
      month: document.querySelector('select[aria-label="विक्रम संवत् महिना"]')?.value,
    }));
    if(data.calendarDays < 27 || data.year !== String(year) || data.month !== String(month) || !data.title) fail("Calendar picker blank or stale: "+JSON.stringify({ path, data }));
    return data;
  }
  const pickerYear = page.getByRole("combobox", { name: "विक्रम संवत् वर्ष" });
  const pickerMonth = page.getByRole("combobox", { name: "विक्रम संवत् महिना" });
  await pickerMonth.selectOption("8");
  const mangsir = await assertCalendarRoute(2083, 8);
  await pickerYear.selectOption("2084");
  await assertCalendarRoute(2084, 8);
  await pickerMonth.selectOption("1");
  await assertCalendarRoute(2084, 1);
  await page.goBack();
  await assertCalendarRoute(2084, 8);
  await page.goBack();
  await assertCalendarRoute(2083, 8);
  await page.getByRole("button", { name: "अर्को महिना" }).click();
  await assertCalendarRoute(2083, 9);
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertCalendarRoute(2083, 9);
  if (errors.length) fail(`month picker browser errors: ${errors.join(" | ")}`);
  await failureContext.close();

  await browser.close();
  console.log(JSON.stringify({ ok: true, firstPaint: paint, apiFailureHome: runtime, calendarMonthPicker: mangsir }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
