const { chromium } = require("playwright");
const BASE = process.env.PATRO_TEST_BASE || "http://127.0.0.1:4173";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator(".ap-install-notice").waitFor({ state: "visible", timeout: 10000 });
  await page.locator(".ap-install-footer").waitFor({ state: "visible", timeout: 10000 });

  await page.evaluate(() => {
    window.__installPromptCalls = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperty(event, "prompt", { value: async () => { window.__installPromptCalls += 1; } });
    Object.defineProperty(event, "userChoice", { value: Promise.resolve({ outcome: "accepted", platform: "web" }) });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: /^Install$/ }).waitFor({ state: "visible", timeout: 5000 });
  await page.getByRole("button", { name: /^Install$/ }).click();
  await page.waitForFunction(() => window.__installPromptCalls === 1, { timeout: 5000 });
  await page.evaluate(() => {
    window.__notificationPermissionCalls=0;
    Notification.requestPermission=async()=>{window.__notificationPermissionCalls++;return "denied"};
    window.dispatchEvent(new Event("appinstalled"));
  });
  const installedButton = page.locator(".ap-install-footer.is-installed");
  await installedButton.waitFor({ state: "visible", timeout: 5000 });
  if (!(await installedButton.isDisabled())) throw new Error("PWA install footer did not switch to installed state after accepted prompt");

  await page.locator(".ap-morning-setup").waitFor({state:"visible"});
  if(await page.evaluate(()=>window.__notificationPermissionCalls)!==0)throw new Error("permission was requested without an explicit enable click");
  await page.getByRole("button",{name:"अनुमति दिएर सक्रिय गर्नुहोस्"}).click();
  await page.getByText("अनुमति दिइएन। फेरि स्वतः सोधिने छैन।").waitFor();
  if(await page.evaluate(()=>window.__notificationPermissionCalls)!==1)throw new Error("notification permission must be requested once");
  await page.getByRole("button",{name:"अहिले चाहिँदैन"}).click();
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForTimeout(500);
  await page.evaluate(()=>window.dispatchEvent(new Event("appinstalled")));
  await page.waitForTimeout(200);
  if(await page.locator(".ap-morning-setup").count())throw new Error("notification offer repeated after reload/decline");
  const noticeCount = await page.locator(".ap-install-notice:not(.ap-morning-setup)").count();
  if (noticeCount && await page.locator(".ap-install-notice:not(.ap-morning-setup)").isVisible().catch(() => false)) throw new Error("install notice stayed visible after appinstalled");
  await context.close();

  const iosContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"
  });
  const ios = await iosContext.newPage();
  await ios.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await ios.locator(".ap-install-notice").waitFor({ state: "visible", timeout: 10000 });
  await ios.getByRole("button", { name: /कसरी Install गर्ने/i }).click();
  await ios.getByText(/Add to Home Screen/i).waitFor({ state: "visible", timeout: 5000 });
  await iosContext.close();
  await browser.close();
  console.log(JSON.stringify({ ok: true, chromiumPrompt: true, footerAction: true, appInstalledState: true, iosGuide: true }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
