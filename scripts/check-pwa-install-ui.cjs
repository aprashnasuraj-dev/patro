const { chromium } = require("playwright");
const BASE = process.env.PATRO_TEST_BASE || "http://127.0.0.1:4173";
const installLabel = "अहिले इन्स्टल गर्नुहोस्";

async function waitForNotice(page) {
  await page.locator(".ap-install-notice").waitFor({ state: "visible", timeout: 15000 });
  await page.locator(".ap-install-footer").waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("button", { name: installLabel, exact: true }).waitFor({ state: "visible", timeout: 5000 });
}

async function providePrompt(page, outcome) {
  await page.evaluate((choice) => {
    window.__installPromptCalls = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperty(event, "prompt", { value: async () => { window.__installPromptCalls += 1; } });
    Object.defineProperty(event, "userChoice", { value: Promise.resolve({ outcome: choice, platform: "web" }) });
    window.dispatchEvent(event);
  }, outcome);
}

(async () => {
  const browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--disable-dev-shm-usage"] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForNotice(page);

    // Clicking the large content area itself must invoke the native PWA prompt,
    // not merely show manual installation instructions.
    await providePrompt(page, "accepted");
    await page.locator(".ap-install-content").click();
    await page.waitForFunction(() => window.__installPromptCalls === 1, { timeout: 5000 });
    await page.getByText(/स्थापना पुष्टि भयो/).waitFor({ state: "visible", timeout: 5000 });
    if (await page.locator(".ap-install-footer.is-installed").count()) {
      throw new Error("Accepting a prompt was incorrectly treated as a completed installation");
    }
    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    await page.locator(".ap-install-notice").waitFor({ state: "hidden", timeout: 5000 });
    const installedButton = page.locator(".ap-install-footer.is-installed");
    await installedButton.waitFor({ state: "visible", timeout: 5000 });
    if (!(await installedButton.isDisabled())) throw new Error("App-installed footer should be disabled");
    await context.close();

    // Native prompt can be cancelled; never pretend installation succeeded.
    const cancelledContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const cancelled = await cancelledContext.newPage();
    await cancelled.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForNotice(cancelled);
    await providePrompt(cancelled, "dismissed");
    await cancelled.locator(".ap-install-primary").click();
    await cancelled.waitForFunction(() => window.__installPromptCalls === 1, { timeout: 5000 });
    await cancelled.getByText(/स्थापना रद्द भयो/).waitFor({ state: "visible", timeout: 5000 });
    await cancelled.getByText(/Add to Home screen/i).waitFor({ state: "visible", timeout: 5000 });
    if (await cancelled.locator(".ap-install-footer.is-installed").count()) {
      throw new Error("Dismissed native install prompt incorrectly marked app installed");
    }
    await cancelledContext.close();

    // No native prompt? CTA is still usable and explains the only supported
    // browser-controlled Add to Home Screen path.
    const manualContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    const manual = await manualContext.newPage();
    await manual.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForNotice(manual);
    await manual.locator(".ap-install-primary").click();
    await manual.getByText(/Add to Home screen/i).waitFor({ state: "visible", timeout: 5000 });
    await manualContext.close();

    const iosContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, serviceWorkers: "block",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"
    });
    const ios = await iosContext.newPage();
    await ios.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForNotice(ios);
    await ios.locator(".ap-install-content").click();
    await ios.getByText(/Safari.*Share.*Add to Home Screen/i).waitFor({ state: "visible", timeout: 5000 });
    await iosContext.close();

    console.log(JSON.stringify({
      ok: true, nativePromptFromCard: true, acceptedNotYetInstalled: true,
      appInstalledState: true, dismissedNotInstalled: true,
      noNativePromptGuide: true, iosGuide: true, alwaysInstallNow: true
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
