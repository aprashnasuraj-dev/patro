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
      localStorage.setItem('nepalmiti.life.v1', JSON.stringify({ version: 1, notes: [{ id: 'keep', text: 'original private note' }], due: [], tithiEvents: [], privateExtra: { retain: true } }));
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
    await page.goto((process.env.VOICE_TEST_ORIGIN || 'http://127.0.0.1:4173') + '/tools/tithi-reminder');
    const baselineLife = await page.evaluate(() => localStorage.getItem('nepalmiti.life.v1'));
    await page.getByRole('button', { name: '🎙 बोलेर सम्झना थप्नुहोस्', exact: true }).click();
    const panel = page.locator('.voice-reminder-composer'); await panel.waitFor();
    await panel.getByRole('button', { name: '🎙 सम्झना बोल्नुहोस्', exact: true }).click();
    await page.evaluate(() => window.__voiceFeature.recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'भोलि बिहान ७ बजे औषधि' }], { isFinal: true })] }));
    await panel.getByRole('button', { name: '■ रोक्नुहोस्', exact: true }).click();
    await panel.getByRole('button', { name: 'सम्झना जाँच्नुहोस्', exact: true }).click();
    const confirmation = page.getByRole('dialog'); await confirmation.waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('nepalmiti.life.v1')), baselineLife, 'review must not write');
    await confirmation.getByRole('button', { name: 'रद्द गर्नुहोस्', exact: true }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('nepalmiti.life.v1')), baselineLife, 'cancel must not write');
    await panel.getByRole('button', { name: 'सम्झना जाँच्नुहोस्', exact: true }).click();
    await confirmation.getByRole('button', { name: 'पक्का गरी सुरक्षित गर्नुहोस्', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('nepalmiti.life.v1')).due.length === 1);
    const life = await page.evaluate(() => JSON.parse(localStorage.getItem('nepalmiti.life.v1')));
    assert.equal(life.due[0].title, 'औषधि'); assert.equal(life.due[0].remindAt, '07:00'); assert.equal(life.notes[0].text, 'original private note'); assert.equal(life.privateExtra.retain, true);
    await panel.locator('textarea').fill('असोज २५ गते आमाको तिथि');
    await panel.getByRole('button', { name: 'सम्झना जाँच्नुहोस्', exact: true }).click();
    const sourceDate = await confirmation.locator('input[type="date"]').inputValue();
    await page.route('**/data/calendar/ad/*.json', route => route.fulfill({ json: { schema: 1, calendar: 'ad', year: Number(sourceDate.slice(0,4)), rows: [{ ad: sourceDate, bs: { year: 2083, month: 6, day: 25 }, panchang: { tithi: { number: 12, paksha: 'Shukla Paksha' } } }] } }));
    await page.route('**/api/v1/tithi/next?**', route => route.fulfill({ json: { occurrences: [] } }));
    await confirmation.getByRole('button', { name: 'पक्का गरी सुरक्षित गर्नुहोस्', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('nepalmiti.life.v1')).tithiEvents.length === 1);
    const event = await page.evaluate(() => JSON.parse(localStorage.getItem('nepalmiti.life.v1')).tithiEvents[0]);
    assert.equal(event.sourceDate, sourceDate); assert.equal(event.rule.tithi, 12); assert.equal(event.rule.paksha, 'shukla');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    console.log('Voice reminders passed: spoken medicine, review/cancel without writes, confirmed existing due/tithi records, private-data preservation and static archive tithi.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
