const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function mock(page, scenario, server = true) {
  await page.route('**/api/nepali/speech-capabilities', route => route.fulfill({ json: { stt: { server } } }));
  await page.route('**/api/nepali/stt', route => route.fulfill({ json: { text: 'नमस्ते नेपाल', language: 'ne-NP', provider: 'mock' } }));
  await page.addInitScript(({ scenario }) => {
    localStorage.setItem('nepalmiti.life.v1', '{"version":1,"sentinel":"preserve"}');
    window.__voice = { media: 0, starts: 0, tracksStopped: 0 };
    class Recognition {
      start() {
        window.__voice.starts++;
        window.__voice.recognition = this;
        queueMicrotask(() => {
          this.onstart?.();
          if (scenario === 'desktop') this.onaudiostart?.();
          else if (scenario !== 'silent') this.onerror?.({ error: scenario });
        });
      }
      abort() { this.onend?.(); }
      stop() { this.onend?.(); }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: scenario === 'none' ? undefined : Recognition });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => { window.__voice.media++; return { getTracks: () => [{ stop() { window.__voice.tracksStopped++; } }] }; },
    } });
    class Recorder {
      static isTypeSupported() { return true; }
      constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
      start() { this.state = 'recording'; }
      stop() {
        this.state = 'inactive';
        queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['independent audio'], { type: this.mimeType }) }); this.onstop?.(); });
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: Recorder });
  }, { scenario });
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.VOICE_CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-webgl'] });
  const origin = process.env.VOICE_TEST_ORIGIN || 'http://127.0.0.1:4173';
  try {
    for (const scenario of ['desktop', 'network', 'service-not-allowed', 'language-not-supported', 'silent', 'none', 'unconfigured', 'cancel']) {
      const page = await browser.newPage();
      await mock(page, ['unconfigured'].includes(scenario) ? 'none' : scenario === 'cancel' ? 'silent' : scenario, scenario !== 'unconfigured');
      await page.goto(origin + '/tools/voice-typing');
      const mic = page.locator('.voice-record-button'); await mic.waitFor();
      await page.waitForFunction(() => document.querySelector('.voice-capture-status').textContent.includes('Live recognition') || document.querySelector('.voice-capture-status').textContent.includes('Accurate server') || document.querySelector('.voice-capture-status').textContent.includes('उपलब्ध छैन'));
      assert.equal(await page.evaluate(() => window.__voice.media), 0, 'microphone must require a gesture');
      if (scenario === 'unconfigured') {
        assert.equal(await mic.isVisible(), true); assert.equal(await mic.isDisabled(), true);
      } else {
        await mic.click();
        if (scenario === 'desktop') {
          await page.evaluate(() => {
            const final = Object.assign([{ transcript: 'नमस्ते' }], { isFinal: true });
            window.__voice.recognition.onresult({ resultIndex: 0, results: [final] });
          });
          await page.waitForFunction(() => document.querySelector('.voice-transcript-label textarea').value.includes('नमस्ते'));
          assert.equal(await page.evaluate(() => window.__voice.media), 0);
          await mic.click();
        } else if (scenario === 'cancel') {
          await mic.click(); await page.waitForTimeout(3200);
          assert.equal(await page.evaluate(() => window.__voice.media), 0, 'cancelled probe must not start recording');
        } else {
          await page.waitForFunction(() => window.__voice.media === 1);
          await page.waitForFunction(() => document.querySelector('.voice-record-button').textContent.includes('रोक्नुहोस्'));
          await mic.click();
          await page.waitForFunction(() => document.querySelector('.voice-transcript-label textarea').value.includes('नमस्ते नेपाल'));
          assert.equal(await page.evaluate(() => window.__voice.media), 1, 'fallback uses the original tap');
        }
      }
      assert.equal(await page.evaluate(() => localStorage.getItem('nepalmiti.life.v1')), '{"version":1,"sentinel":"preserve"}');
      console.log('Voice browser passed:', scenario); await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
