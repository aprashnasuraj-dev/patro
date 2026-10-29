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

  const puraSelect = page.locator('#bali-pura-form select[name="slug"]');
  await expect(puraSelect).toBeVisible();
  const firstPura = await puraSelect.locator('option:not([value="pura-luhur-batukaru"]):not([value=""])').first().getAttribute("value");
  expect(firstPura).toBeTruthy();
  expect(firstPura).not.toBe("pura-luhur-batukaru");
  await puraSelect.selectOption(firstPura!);
  await page.locator("#bali-pura-form button[type=submit]").click();
  await expect(page.locator("#bali-pura-list article")).toHaveCount(1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#bali-return-summary")).toContainText("1 Pura tersimpan");
  await expect(page.locator("#bali-return-summary")).toContainText("Yang terdekat untukmu");
  await expect(page.locator("#bali-pura-list article")).toHaveCount(1);

  await page.goto("/bali-calendar/piodalan/pura-luhur-batukaru", { waitUntil: "domcontentloaded" });
  await expect(page.locator('script[src="/bali-calendar/pwa.js"]')).toBeAttached();
  await expect(page.locator("[data-bali-save-pura]")).toBeVisible();
  await page.locator("[data-bali-save-pura]").click();
  await page.goto("/bali-calendar#my-bali", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#bali-pura-list article")).toHaveCount(2);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#bali-export-memory").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("aafnai-bali-calendar-backup.json");
});

test("direct date jump reaches the supported historical and future window", async ({ page }) => {
  await page.goto("/bali-calendar", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".bali-date-jump")).toBeVisible();
  await page.locator('.bali-date-jump input[name="tanggal"]').fill("1929-01-01");
  await page.locator(".bali-date-jump button").click();
  await expect(page).toHaveURL(/\/bali-calendar\/1929-01-01$/);
  await expect(page.locator("body")).toContainText("Wewaran lengkap");
});

test("Palelintangan is visually rich and long-range pages remain culturally clear", async ({ page }) => {
  await page.goto("/bali-calendar/palelintangan", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("Kala Sungsang");
  await expect(page.locator("body")).toContainText("Bhatara Wisnu");
  await expect(page.locator("body")).toContainText("ᬭᬤᬶᬢᬾ");
  await expect(page.locator("body")).toContainText("ᬓᬮᬲᬸᬗ᭄ᬲᬂ");
  await expect(page.locator(".pal-hero")).toBeVisible();
  await expect(page.locator(".pal-cell")).toHaveCount(35);
  await expect(page.locator("body")).toContainText("Cara membaca Palelintangan Bali");

  const r = await page.goto("/bali-calendar/2129-12-31", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBe(200);
  await expect(page.locator("body")).toContainText("Fase Bulan");
  await expect(page.locator("body")).toContainText("Palelintangan hari ini");
  await expect(page.locator("body")).toContainText("Pelindung Saptawara");
  await expect(page.locator("body")).toContainText("Penetapan Purnama, Tilem, Sasih");
  await expect(page.locator('a[href="/bali-calendar/sasih-saka?tanggal=2129-12-31"]').first()).toBeVisible();
  await page.goto("/bali-calendar/sasih-saka?tanggal=2129-12-31", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("Kalender Sasih lengkap 2129 belum tersedia");
  await expect(page.locator("body")).toContainText("Fase Bulan");
  await page.goto("/bali-calendar/palelintangan?tanggal=2129-12-31", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText("2129");
  await expect(page.locator("body")).toContainText("tanggal dipilih");

  const old = await page.goto("/bali-calendar/1929-01-01", { waitUntil: "domcontentloaded" });
  expect(old?.status()).toBe(200);
  await expect(page.locator("body")).toContainText("Wewaran lengkap");
});


test("permanent Lintang profile has human cultural copy, navigation and a mobile-safe layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bali-calendar/palelintangan/kala-sungsang", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Lintang Kala Sungsang dalam Palelintangan Bali" })).toBeVisible();
  await expect(page.locator(".lintang-portrait")).toBeVisible();
  await expect(page.locator(".lintang-art")).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://aafnaipatro.com/bali-calendar/palelintangan/kala-sungsang");
  await expect(page.locator(".lintang-directory a")).toHaveCount(35);
  await expect(page.getByRole("heading", { name: /Kisah lain dalam tema/ })).toBeVisible();
  await expect(page.getByText("Sosok terbalik", { exact: false }).first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.goto("/bali-calendar/palelintangan/hulanjar", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Lintang Hulanjar dalam Palelintangan Bali" })).toBeVisible();
  await expect(page.getByText("Nama dalam naskah dan koleksi")).toBeVisible();
});
