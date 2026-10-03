const { chromium } = require("playwright");

const BASE = process.env.PATRO_TEST_BASE || "http://127.0.0.1:4173";
const TOOLS = [
  "astro","nepali-typing","preeti-converter","bstoad","adtobs","calc","age","clock","forex","gold","emi","vat","units","words","incometax","landconverter","nepaliqr","fuelprice","tithi-reminder","sait","baby-names","janmadin-akhbar","future-letter","spell-check","voice-typing","ocr","name-check","read-aloud","patro-bot"
];
const FAILURE = /coming soon|under development|placeholder|not implemented|Patro panchang unavailable|Invalid Patro panchang response|TypeError|ReferenceError|Cannot read/i;

function fail(message) { throw new Error(message); }

async function installFixtures(context) {
  await context.route("**/api/v1/panchang?date=*", async (route) => {
    const url = new URL(route.request().url());
    const ad = url.searchParams.get("date") || "2026-10-03";
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ad,
      panchang: {
        tithi: { number: 8, paksha: "shukla" },
        tithi_transition: { minutes: 870, time: "14:30" },
        nakshatra: { number: 5, pada: 2 },
        sunrise: "06:02",
        sunset: "17:51",
        location: "Kathmandu"
      }
    }) });
  });
  await context.route("**/api/v1/markets/latest?kind=forex*", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ items: [
      { asset: "USD", as_of: "2026-10-03", buy: 145.1, sell: 145.7, per: 1, source_label: "नेपाल राष्ट्र बैंक", source_url: "https://www.nrb.org.np" },
      { asset: "EUR", as_of: "2026-10-03", buy: 170.2, sell: 171.0, per: 1, source_label: "नेपाल राष्ट्र बैंक", source_url: "https://www.nrb.org.np" },
      { asset: "JPY", as_of: "2026-10-03", buy: 96.4, sell: 96.9, per: 100, source_label: "नेपाल राष्ट्र बैंक", source_url: "https://www.nrb.org.np" }
    ] })
  }));
  await context.route("**/api/v1/noc/fuel-prices*", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true, source: "Nepal Oil Corporation", sourceUrl: "https://noc.org.np", fetchedAt: "2026-10-03T00:00:00Z", effectiveDate: "2026-10-03", freshness: "live", stale: false,
      zones: [{ depots: ["Kathmandu"], petrol: 159, diesel: 145, kerosene: 145, atfDutyFreeUsdPerKl: 890, atfDomesticNprPerL: 136, lpgNprPerCylinder: 1910 }]
    })
  }));
}

async function signature(page) {
  return page.evaluate(() => {
    const selectors = [
      ".ref-result", ".tool-status", ".tool-preview", ".tool-verdict", ".patro-tool-result", ".utility-result", ".converter-result", ".bot-chat", ".qr-preview", ".name-grid", ".tool-event-list", "[role=status]", "[aria-live=polite]"
    ];
    const text = selectors.flatMap((selector) => [...document.querySelectorAll(selector)].map((node) => (node.textContent || "").trim())).filter(Boolean).join(" | ");
    return { text, storage: JSON.stringify({ ...localStorage }), path: location.pathname + location.search };
  });
}

async function exerciseNepaliTools(page, slug) {
  await page.waitForFunction(() => {
    const host = document.querySelector("[data-nepali-tools-host]");
    return Boolean(host?.shadowRoot || document.querySelector("iframe[data-nepali-tools-fallback]"));
  }, { timeout: 15000 });
  const fallback = await page.locator('iframe[data-nepali-tools-fallback]').count();
  if (fallback) {
    const frame = page.frameLocator('iframe[data-nepali-tools-fallback]');
    if (slug === "nepali-typing") {
      const editor = frame.locator("#editor");
      await editor.fill("namaste ");
      await page.waitForTimeout(250);
      const value = await editor.inputValue();
      if (!value.trim()) fail(`${slug}: editor rejected typed text`);
      return `editor=${value.slice(0,30)}`;
    }
    const source = frame.locator("#source");
    const output = frame.locator("#output");
    await source.fill(slug === "preeti-converter" ? "g]kfn" : "नेपाल");
    await page.waitForTimeout(450);
    const value = await output.inputValue();
    if (!value.trim()) fail(`${slug}: conversion produced no output`);
    return `conversion=${value.slice(0,30)}`;
  }
  const result = await page.evaluate(async ({ slug }) => {
    const root = document.querySelector("[data-nepali-tools-host]")?.shadowRoot;
    if (!root) return null;
    if (slug === "nepali-typing") {
      const editor = root.querySelector("#editor");
      editor.value = "namaste ";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "namaste " }));
      editor.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "e" }));
      await new Promise((resolve) => setTimeout(resolve, 250));
      return { value: editor.value, status: root.querySelector("#status")?.textContent || "" };
    }
    const source = root.querySelector("#source");
    const output = root.querySelector("#output");
    source.value = "g]kfn";
    source.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "g]kfn" }));
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { value: output.value, status: root.querySelector("#warnings")?.textContent || "" };
  }, { slug });
  if (!result?.value?.trim()) fail(`${slug}: primary editor/conversion action produced no value (${result?.status || "no status"})`);
  return `${slug}=${String(result.value).slice(0,30)}`;
}

async function exerciseReadAloud(page) {
  const textarea = page.locator("main textarea").first();
  await textarea.fill("नमस्ते नेपाल। आजको दिन राम्रो छ।");
  const button = page.getByRole("button", { name: /सुन्नुहोस्|पढ|आवाज/i }).first();
  await button.click();
  await page.waitForTimeout(150);
  const calls = await page.evaluate(() => window.__patroSpeechCalls || 0);
  if (calls < 1) fail("read-aloud: speech action did not call browser speech synthesis");
  return `speechCalls=${calls}`;
}

async function exerciseOcr(page) {
  const input = page.locator('main input[type=file]').first();
  if (!await input.count()) fail("ocr: file input missing");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=", "base64");
  await input.setInputFiles({ name: "nepali-test.png", mimeType: "image/png", buffer: png });
  await page.waitForTimeout(300);
  const text = (await page.locator("main").innerText()).trim();
  if (!/nepali-test|तस्बिर|छवि|OCR|पढ/i.test(text)) fail("ocr: uploaded image did not reach the OCR surface");
  return "image accepted";
}

async function exerciseVoice(page) {
  const textarea = page.locator("main textarea").first();
  if (!await textarea.count()) fail("voice-typing: transcript editor missing");
  await textarea.fill("यो परीक्षण आवाजबाट आएको पाठ हो।");
  const clear = page.getByRole("button", { name: /खाली|मेट|clear/i }).first();
  if (await clear.count()) await clear.click();
  const after = await textarea.inputValue();
  if (after.trim()) fail("voice-typing: editable transcript/clear action failed");
  return "editable transcript + clear";
}

async function exercisePatroBot(page) {
  const input = page.locator("main .bot-input input");
  await input.fill("2083-06-13 AD");
  const before = await page.locator(".bot-bubble.bot").count();
  await page.locator("main .bot-input button[type=submit]").click();
  await page.waitForFunction((count) => document.querySelectorAll(".bot-bubble.bot").length > count, before, { timeout: 10000 });
  const answer = (await page.locator(".bot-bubble.bot").last().innerText()).trim();
  if (!answer || FAILURE.test(answer)) fail(`patro-bot: no usable answer: ${answer}`);
  return `answer=${answer.slice(0,60)}`;
}

async function mutateFirstControl(page) {
  const controls = page.locator('main textarea, main input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), main select');
  const count = await controls.count();
  for (let i = 0; i < count; i++) {
    const control = controls.nth(i);
    if (!await control.isVisible().catch(() => false) || !await control.isEnabled().catch(() => false)) continue;
    const tag = await control.evaluate((el) => el.tagName.toLowerCase());
    if (tag === "select") {
      const options = await control.locator("option").evaluateAll((nodes) => nodes.map((n) => n.value));
      const current = await control.inputValue();
      const next = options.find((value) => value !== current);
      if (next != null) { await control.selectOption(next); return `select:${current}->${next}`; }
      continue;
    }
    const type = (await control.getAttribute("type")) || "text";
    const current = await control.inputValue();
    let next = current;
    if (type === "date") next = current === "2026-09-29" ? "2026-09-28" : "2026-09-29";
    else if (type === "range") next = String(Math.max(Number(await control.getAttribute("min") || 0), Math.min(Number(await control.getAttribute("max") || 100), Number(current || 0) + Number(await control.getAttribute("step") || 1) * 2)));
    else if (["number","decimal"].includes(type) || (await control.getAttribute("inputmode")) === "decimal") next = String((Number(current) || 7) + 3);
    else next = (current ? current + " परीक्षण" : "परीक्षण 123").slice(0, 80);
    await control.fill(next);
    return `${type}:${current}->${next}`;
  }
  return "";
}

async function clickPrimary(page) {
  const candidates = page.locator('main .tool-primary-button:not(:disabled), main .ref-primary:not(:disabled), main button[type=submit]:not(:disabled), main button:not(:disabled)');
  const count = await candidates.count();
  for (let i = 0; i < Math.min(count, 20); i++) {
    const button = candidates.nth(i);
    if (!await button.isVisible().catch(() => false)) continue;
    const text = ((await button.innerText().catch(() => "")) || "").trim();
    if (/copy|कपी|share|शेयर|download|डाउनलोड|बन्द|close|undo|redo|फेरि जोड|पूरा पर्दा/i.test(text)) continue;
    await button.click({ timeout: 5000 }).catch(() => undefined);
    return text || "button";
  }
  return "";
}

async function exerciseGeneric(page, slug) {
  const before = await signature(page);
  const mutation = await mutateFirstControl(page);
  await page.waitForTimeout(350);
  let after = await signature(page);
  if (after.text !== before.text || after.storage !== before.storage || after.path !== before.path) {
    if (FAILURE.test(after.text)) fail(`${slug}: interaction ended in technical failure: ${after.text.slice(0,180)}`);
    return `${mutation}; reactive-result`;
  }
  const clicked = await clickPrimary(page);
  await page.waitForTimeout(900);
  after = await signature(page);
  if (FAILURE.test(after.text)) fail(`${slug}: primary action ended in technical failure: ${after.text.slice(0,180)}`);
  if (after.text === before.text && after.storage === before.storage && after.path === before.path) {
    fail(`${slug}: primary interaction produced no observable result (mutation=${mutation || "none"}, button=${clicked || "none"})`);
  }
  return `${mutation || "no-input"}; ${clicked || "action"}; result-changed`;
}

(async () => {
  if (TOOLS.length !== 29 || new Set(TOOLS).size !== 29) fail("tool-action inventory must remain exactly 29 unique tools");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await context.addInitScript(() => {
    window.__patroSpeechCalls = 0;
    class FakeUtterance {
      constructor(text) { this.text = text; this.lang = "ne-NP"; this.rate = 1; this.onend = null; this.onerror = null; }
    }
    window.SpeechSynthesisUtterance = FakeUtterance;
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      getVoices: () => [{ lang: "ne-NP", name: "Test Nepali" }],
      addEventListener: () => {}, removeEventListener: () => {}, cancel: () => {},
      speak: (utterance) => { window.__patroSpeechCalls += 1; setTimeout(() => utterance.onend?.(), 0); }
    }});
  });
  await installFixtures(context);
  const page = await context.newPage();
  const evidence = [];

  for (const slug of TOOLS) {
    const errors = [];
    const onError = (error) => errors.push(String(error));
    page.on("pageerror", onError);
    const response = await page.goto(`${BASE}/tools/${slug}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!response?.ok()) fail(`${slug}: HTTP ${response?.status() ?? "no response"}`);
    await page.locator("main").first().waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(300);
    let action;
    if (slug === "nepali-typing" || slug === "preeti-converter") action = await exerciseNepaliTools(page, slug);
    else if (slug === "read-aloud") action = await exerciseReadAloud(page);
    else if (slug === "ocr") action = await exerciseOcr(page);
    else if (slug === "voice-typing") action = await exerciseVoice(page);
    else if (slug === "patro-bot") action = await exercisePatroBot(page);
    else action = await exerciseGeneric(page, slug);
    page.off("pageerror", onError);
    if (errors.length) fail(`${slug}: browser errors during primary action: ${errors.join(" | ")}`);
    evidence.push({ slug, action });
  }

  await browser.close();
  console.log(JSON.stringify({ ok: true, count: evidence.length, kind: "primary-user-action", evidence }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
