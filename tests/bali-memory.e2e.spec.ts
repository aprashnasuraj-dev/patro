import { expect, test } from "@playwright/test";

test("My Bali persists family Otonan and saved dates across reloads", async ({ page }) => {
  await page.goto("/bali-calendar", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#my-bali")).toBeVisible();

  await page.locator('#bali-person-form input[name="name"]').fill("Ibu");
  await page.locator('#bali-person-form select[name="relation"]').selectOption("parent");
  await page.locator('#bali-person-form input[name="birthDate"]').fill("1980-01-02");
  await page.locator('#bali-person-form select[name="boundary"]').selectOption("after");
  await page.locator("#bali-person-form button[type=submit]").click();

  await expect(page.locator("#bali-people-list")).toContainText("Ibu");
  await expect(page.locator("#bali-people-list")).toContainText("Otonan berikutnya");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#bali-people-list")).toContainText("Ibu");
  await expect(page.locator("#bali-return-summary")).toContainText("1 orang tersimpan");

  await page.locator('#bali-date-form input[name="date"]').fill("2026-11-14");
  await page.locator('#bali-date-form input[name="label"]').fill("Hari keluarga");
  await page.locator("#bali-date-form button[type=submit]").click();
  await expect(page.locator("#bali-saved-dates")).toContainText("Hari keluarga");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#bali-saved-dates")).toContainText("Hari keluarga");
  await expect(page.locator("#bali-return-summary")).toContainText("1 hari tersimpan");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#bali-export-memory").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("aafnai-bali-calendar-backup.json");
});

test("Palelintangan and long-range dynamic pages remain rich and fail-closed correctly", async ({ page }) => {
  await page.goto("/bali-calendar/palelintangan", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("Kala Sungsang");
  await expect(page.locator("body")).toContainText("Bhatara Wisnu");
  await expect(page.locator("body")).toContainText("ᬭᬤᬶᬢᬾ");

  const r = await page.goto("/bali-calendar/2129-12-31", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBe(200);
  await expect(page.locator("body")).toContainText("Konteks Bulan astronomis");
  await expect(page.locator("body")).toContainText("tidak menggantikan penetapan Purnama, Tilem, Sasih");

  const old = await page.goto("/bali-calendar/1929-01-01", { waitUntil: "domcontentloaded" });
  expect(old?.status()).toBe(200);
  await expect(page.locator("body")).toContainText("Wewaran lengkap");
});
