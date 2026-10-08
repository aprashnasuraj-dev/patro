const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.VOICE_CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-webgl'] });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.route('https://**/*', route => route.abort());
    await page.route('**/api/nepali/speech-capabilities', route => route.fulfill({ json: { stt: { server: false } } }));
    await page.addInitScript(() => {
      window.__voiceFeature = { spoken: [], starts: 0 };
      class Recognition {
        start() { window.__voiceFeature.recognition = this; window.__voiceFeature.starts++; queueMicrotask(() => { this.onstart?.(); this.onaudiostart?.(); }); }
        stop() { this.onend?.(); } abort() { this.onend?.(); }
      }
      Object.defineProperty(window, 'SpeechRecognition', { value: Recognition, configurable: true });
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(text) { this.text = text; } } });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices: () => [{ name: 'Nepali', lang: 'ne-NP', localService: true }], cancel() {}, resume() {}, addEventListener() {}, removeEventListener() {},
        speak(utterance) { window.__voiceFeature.spoken.push(utterance.text); queueMicrotask(() => utterance.onend?.()); },
      } });
    });
    await page.goto((process.env.VOICE_TEST_ORIGIN || 'http://127.0.0.1:4173') + '/tools/patro-bot');
    const mic = page.locator('.bot-voice-button'); await mic.waitFor();
    assert.equal(await page.getByRole('textbox', { name: 'आफ्नै Bot प्रश्न' }).inputValue(), 'आज');
    assert.equal(await page.evaluate(() => window.__voiceFeature.starts), 0);
    await mic.click();
    await page.evaluate(() => window.__voiceFeature.recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'दशैं कहिले' }], { isFinal: true })] }));
    await page.waitForFunction(() => document.querySelector('.bot-input input').value.trim() === 'दशैं कहिले');
    assert.equal(await page.getByRole('button', { name: 'पठाउनुहोस्', exact: true }).isDisabled(), true);
    await mic.click(); await page.getByRole('button', { name: 'पठाउनुहोस्', exact: true }).click();
    await page.waitForFunction(() => window.__voiceFeature.spoken.length > 0);
    const answer = await page.locator('.bot-bubble.bot').last().locator('p').textContent();
    assert.match(answer, /दशैं|दशै|विजया/);
    const spoken = await page.evaluate(() => window.__voiceFeature.spoken.join(' '));
    assert.equal(spoken.replace(/\s+/g, ' ').trim(), answer.replace(/\s+/g, ' ').trim());
    assert.equal(await page.locator('meta[name=robots]').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    console.log('Voice bot passed: default typed question preserved, gesture-only mic, transcript review, shared bot answer and automatic existing TTS, mobile overflow.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
