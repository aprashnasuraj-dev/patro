const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const BASE = process.env.PATRO_TEST_BASE || "http://127.0.0.1:4173";

(async () => {
  const browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--disable-dev-shm-usage"] });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
      serviceWorkers: "block"
    });
    await context.route("**/api/**", (route) => route.fulfill({
      status: 503,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: '{"error":"forced_mytime_ring_test_failure"}'
    }));

    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    const response = await page.goto(BASE + "/mytime", { waitUntil: "domcontentloaded", timeout: 30000 });
    assert(response && response.ok(), `My Time route failed: HTTP ${response?.status() ?? "no-response"}`);
    await page.locator(".mt-polar-wrap").waitFor({ state: "visible", timeout: 30000 });
    await page.waitForFunction(() => document.querySelectorAll(".mt-polar-hit-target").length > 0, null, { timeout: 30000 });

    const targets = page.locator(".mt-polar-hit-target");
    const count = await targets.count();
    assert(count >= 2, `expected at least two selectable main-ring intervals, found ${count}`);

    const first = targets.nth(0);
    const targetMetrics = await first.evaluate((element) => ({
      role: element.getAttribute("role"),
      tabIndex: element.getAttribute("tabindex"),
      width: Number(element.getAttribute("stroke-width")),
      pointerEvents: getComputedStyle(element).pointerEvents
    }));
    assert.equal(targetMetrics.role, "button", "main ring intervals must expose button semantics");
    assert.equal(targetMetrics.tabIndex, "0", "main ring intervals must be keyboard reachable");
    assert(targetMetrics.width >= 22, `mobile hit target is too small: ${targetMetrics.width}`);
    assert.equal(targetMetrics.pointerEvents, "stroke", "invisible touch target must receive pointer events on the stroke");

    // Click the actual center-line of an SVG arc, not the center of its rectangular bounding box.
    const point = await first.evaluate((element) => {
      const path = element;
      const length = path.getTotalLength();
      const local = path.getPointAtLength(length * 0.5);
      const screen = new DOMPoint(local.x, local.y).matrixTransform(path.ownerSVGElement.getScreenCTM());
      return { x: screen.x, y: screen.y };
    });
    await first.evaluate((element) => {
      window.__myTimeRingPointer = { pointerdown: 0, click: 0 };
      element.addEventListener("pointerdown", () => { window.__myTimeRingPointer.pointerdown += 1; }, true);
      element.addEventListener("click", () => { window.__myTimeRingPointer.click += 1; }, true);
    });
    const hitTest = await page.evaluate(({ x, y }) => {
      const hit = document.elementFromPoint(x, y);
      return {
        tag: hit?.tagName ?? null,
        className: hit?.getAttribute("class") ?? null,
        role: hit?.getAttribute("role") ?? null,
        label: hit?.getAttribute("aria-label") ?? null,
        isRingTarget: hit?.classList?.contains("mt-polar-hit-target") ?? false,
        point: { x, y },
        viewport: { width: innerWidth, height: innerHeight, scrollY },
        rect: hit ? (() => { const r = hit.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; })() : null
      };
    }, point);
    console.log("MYTIME_RING_TAP_DIAGNOSTIC=" + JSON.stringify({ point, targetMetrics, hitTest }));
    await page.mouse.click(point.x, point.y);
    const observedPointer = await page.evaluate(() => window.__myTimeRingPointer);
    console.log("MYTIME_RING_POINTER_EVENTS=" + JSON.stringify(observedPointer));
    const panel = page.locator(".mt-selected-event");
    await panel.waitFor({ state: "visible", timeout: 5000 });
    const clickDetails = await page.locator(".mt-selected-event-copy").innerText();
    assert.match(clickDetails, /SELECTED TIME WINDOW|चयन गरिएको समय खण्ड/, "tap must open the selected-period detail panel");
    assert((await page.locator(".mt-selected-event-copy p").count()) >= 2, "selected-period panel must include interval and explanation");

    // Verify keyboard operation independently, and ensure the focused segment becomes selected.
    const second = targets.nth(1);
    await first.focus();
    await page.keyboard.press("Tab");
    assert.equal(await second.evaluate((element) => element === document.activeElement), true, "Tab must move keyboard focus to the next ring segment");
    const focusStroke = await second.evaluate((element) => getComputedStyle(element).stroke);
    assert.notEqual(focusStroke, "rgba(0, 0, 0, 0)", "keyboard focus must be visible on the ring");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-pressed") === "true", null, { timeout: 5000 });
    const keyboardDetails = await page.locator(".mt-selected-event-copy").innerText();
    assert(keyboardDetails.trim().length > 20, "keyboard activation must update the selected-period details");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false, "mobile My Time page must not introduce horizontal overflow");
    assert.deepEqual(pageErrors, [], `My Time JavaScript errors: ${pageErrors.join(" | ")}`);

    console.log(`My Time main-ring browser checks passed: ${count} selectable segments, mobile tap, keyboard Enter, visible focus, selected-period explanation, and no mobile overflow.`);
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
