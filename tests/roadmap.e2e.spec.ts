import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, context }) => {
  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.emulateNetworkConditions", {
    offline: false, latency: 150, downloadThroughput: 1_600_000 / 8,
    uploadThroughput: 750_000 / 8, connectionType: "cellular4g",
  });
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
});

test("Nepal Map boots with list, route controls and privacy disclosures", async ({ page }) => {
  await page.goto("/nepalmap", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("Nepal map");
  await expect(page.locator("#np-list")).toBeAttached();
  await expect(page.locator('[data-tab="route"]')).toBeVisible();
  await expect(page.locator("#np-location-privacy")).toContainText("Privacy");
  await page.locator('[data-tab="route"]').click();
  await expect(page.locator("#np-route")).toBeVisible();
  await expect(page.locator("#np-route")).toContainText("FOSSGIS");
});

test("Bali Calendar answers the current day without client JavaScript", async ({ page }) => {
  await page.goto("/bali-calendar", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("Kalender Bali");
  await expect(page.locator("body")).toContainText("Wewaran lengkap");
  await expect(page.locator('a[href*="/bali-calendar/wuku/"]').first()).toBeVisible();
});

test("Bali Otonan exposes the sunrise boundary option", async ({ page }) => {
  await page.goto("/bali-calendar/otonan", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("matahari terbit");
  await expect(page.locator('select[name="waktu"]')).toBeVisible();
  await expect(page.locator('select[name="waktu"] option[value="before"]')).toContainText("sebelum matahari terbit");
});
