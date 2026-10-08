const { chromium } = require("playwright");
const BASE = process.env.PATRO_TEST_BASE || "http://127.0.0.1:4173";

function fail(message) { throw new Error(message); }
function fakePromptScript(outcome = "accepted") {
  return (outcome) => {
    window.__installPromptCalls = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperty(event, "prompt", { value: async () => { window.__installPromptCalls += 1; } });
    Object.defineProperty(event, "userChoice", { value: Promise.resolve({ outcome, platform: "web" }) });
    window.dispatchEvent(event);
  };
}

(async () => {
  const browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  const banner = page.locator(".ap-install-notice");
  const surface = page.locator(".ap-install-surface");
  await banner.waitFor({ state: "visible", timeout: 10000 });
  await page.locator(".ap-install-footer").waitFor({ state: "visible", timeout: 10000 });
  if (!(await surface.getByText(/Install Now/).isVisible())) fail("Install Now CTA is not visible");
  if ((await banner.locator("button").count()) !== 2) fail("Install card must contain one full-card button and one separate close button");
  if (await banner.getByText(/कसरी Install गर्ने/).count()) fail("Outdated How to Install CTA is still visible");

  await page.evaluate(fakePromptScript(), "accepted");
  await surface.locator(".ap-install-mark").click(); // clicking the mark must activate the entire card
  await page.waitForFunction(() => window.__installPromptCalls === 1, { timeout: 5000 });
  if (await page.locator(".ap-install-footer.is-installed").count()) fail("Accepted choice alone falsely marked app installed");
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await page.locator(".ap-install-footer.is-installed").waitFor({ state: "visible", timeout: 5000 });
  if (!(await page.locator(".ap-install-footer.is-installed").isDisabled())) fail("Installed footer must be disabled");
  if (await banner.isVisible().catch(() => false)) fail("Install notice remained after appinstalled");
  await context.close();

  // User can tap any portion of the card even before Chrome emits its native prompt.
  const lateContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const late = await lateContext.newPage();
  await late.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await late.locator(".ap-install-notice").waitFor({ state: "visible", timeout: 10000 });
  await late.locator(".ap-install-copy strong").click();
  await late.getByText(/Install app \/ Add to Home screen/).waitFor({ state: "visible", timeout: 5000 });
  if (!(await late.getByText(/Install Now/).isVisible())) fail("Fallback replaced Install Now with obsolete instructions CTA");
  await late.evaluate(fakePromptScript(), "dismissed");
  await late.locator(".ap-install-surface").click();
  await late.waitForFunction(() => window.__installPromptCalls === 1, { timeout: 5000 });
  await late.getByText(/Install app \/ Add to Home screen/).waitFor({ state: "visible", timeout: 5000 });
  if (await late.locator(".ap-install-footer.is-installed").count()) fail("Dismissed prompt falsely marked app installed");
  await late.locator(".ap-install-close").click();
  if (await late.locator(".ap-install-notice").isVisible().catch(() => false)) fail("Close control did not dismiss banner");
  await late.locator(".ap-install-footer").click();
  await late.locator(".ap-install-notice").waitFor({ state: "visible", timeout: 5000 });
  await lateContext.close();

  // iOS cannot invoke the Android/Chromium install API; display Safari Add to Home Screen steps.
  const iosContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"
  });
  const ios = await iosContext.newPage();
  await ios.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await ios.locator(".ap-install-notice").waitFor({ state: "visible", timeout: 10000 });
  await ios.locator(".ap-install-surface .ap-install-description").click();
  await ios.getByText(/Add to Home Screen/).waitFor({ state: "visible", timeout: 5000 });
  if (!(await ios.getByText(/Install Now/).isVisible())) fail("iOS card should still present Install Now");
  if (await ios.locator(".ap-install-footer.is-installed").count()) fail("Showing iOS instructions falsely marked installed");
  await iosContext.close();
  await browser.close();
  console.log(JSON.stringify({ ok: true, fullCardTap: true, chromiumPrompt: true, acceptedChoiceWaitsForAppInstalled: true, dismissedChoice: true, latePrompt: true, closeAndFooter: true, iosGuide: true }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
