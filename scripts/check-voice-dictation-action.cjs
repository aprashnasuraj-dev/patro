const { chromium } = require("playwright");
const BASE = process.env.PATRO_TEST_BASE || "http://127.0.0.1:4173";

(async () => {
  const browser = await chromium.launch({ channel: 'chromium', headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await context.addInitScript(() => {
    class FakeSpeechRecognition {
      constructor() { this.lang = "ne-NP"; this.continuous = true; this.interimResults = true; this.maxAlternatives = 1; }
      start() {
        this.onstart?.();
        const transcript = this.lang === "en-US" ? "hello world period" : "नमस्ते नेपाल पूर्णविराम";
        setTimeout(() => {
          const item = [{ transcript }];
          item.isFinal = true;
          this.onresult?.({ resultIndex: 0, results: [item] });
          this.onend?.();
        }, 30);
      }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    window.SpeechRecognition = FakeSpeechRecognition;
    window.webkitSpeechRecognition = FakeSpeechRecognition;
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  const response = await page.goto(BASE + "/tools/voice-typing", { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!response?.ok()) throw new Error(`voice typing HTTP ${response?.status() ?? "no response"}`);
  const textarea = page.locator("main textarea").first();
  const nepaliStart = page.getByRole("button", { name: /नेपाली बोल्न सुरु/i });
  await nepaliStart.waitFor({ state: "visible", timeout: 10000 });
  if (await nepaliStart.isDisabled()) throw new Error("voice typing did not detect browser speech recognition");
  await nepaliStart.click();
  await page.waitForFunction(() => /नमस्ते नेपाल।/.test(document.querySelector("main textarea")?.value || ""), { timeout: 5000 });
  const nepali = await textarea.inputValue();

  await page.getByRole("button", { name: /English speech/i }).click();
  const englishStart = page.getByRole("button", { name: /Start English voice typing/i });
  await englishStart.waitFor({ state: "visible", timeout: 5000 });
  await englishStart.click();
  await page.waitForFunction(() => /hello world\./i.test(document.querySelector("main textarea")?.value || ""), { timeout: 5000 });
  const bilingual = await textarea.inputValue();
  if (!/नमस्ते नेपाल।/.test(bilingual) || !/hello world\./i.test(bilingual)) throw new Error(`voice typing language switch lost transcript: ${bilingual}`);

  await page.getByRole("button", { name: /खाली गर्नुहोस्|Clear/i }).click();
  if ((await textarea.inputValue()).trim()) throw new Error("voice typing clear action failed");
  if (errors.length) throw new Error(`voice typing browser errors: ${errors.join(" | ")}`);
  await browser.close();
  console.log(JSON.stringify({ ok: true, nepali, bilingual, languages: ["ne-NP", "en-US"], punctuation: true, clear: true }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
