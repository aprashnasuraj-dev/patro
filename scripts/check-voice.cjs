const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function mock(page, scenario, server = true) {
  await page.route('https://**/*', route => route.abort());
  await page.route('**/api/nepali/speech-capabilities', route => route.fulfill({ json: { stt: { server } } }));
  await page.route('**/api/nepali/stt', route => { const english = route.request().postData()?.includes('en-US'); return route.fulfill({ json: { text: english ? 'Hello Nepal' : 'नमस्ते नेपाल', language: english ? 'en-US' : 'ne-NP', provider: 'mock' } }); });
  await page.addInitScript(({ scenario, server }) => {
    localStorage.setItem('nepalmiti.life.v1', '{"version":1,"sentinel":"preserve"}');
    if (!server) Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Android FBAN' });
    if (scenario === 'android') Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 Android Chrome/133' });
    window.__voice = { media: 0, starts: 0, tracksStopped: 0, installs: 0 };
    class Recognition {
      start() {
        window.__voice.starts++;
        window.__voice.recognition = this;
        queueMicrotask(() => {
          this.onstart?.();
          if (['desktop', 'android', 'locale', 'local', 'cleanup', 'session-ended'].includes(scenario)) this.onaudiostart?.();
          else if (scenario !== 'silent') this.onerror?.({ error: scenario });
        });
      }
      abort() { this.onend?.(); }
      stop() { this.onend?.(); }
    }
    if (scenario === 'local') { Recognition.available = async options => { if (options.processLocally !== true) throw Error('not local'); return window.__voice.installs ? 'available' : 'downloadable'; }; Recognition.install = async options => { if (options.processLocally !== true) throw Error('not local'); window.__voice.installs++; return true; }; }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: scenario === 'none' ? undefined : Recognition });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => { window.__voice.media++; return { getTracks: () => [{ stop() { window.__voice.tracksStopped++; } }] }; },
    } });
    class Recorder {
      static isTypeSupported() { return true; }
      constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; window.__voice.recorder = this; }
      start() { this.state = 'recording'; }
      stop() {
        this.state = 'inactive';
        queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['independent audio'], { type: this.mimeType }) }); this.onstop?.(); });
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: Recorder });
  }, { scenario, server });
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.VOICE_CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-webgl'] });
  const origin = process.env.VOICE_TEST_ORIGIN || 'http://127.0.0.1:4173';
  try {
    for (const scenario of ['desktop', 'local', 'cleanup', 'session-ended', 'locale', 'server-locale', 'android', 'chunked', 'network', 'service-not-allowed', 'language-not-supported', 'silent', 'none', 'unconfigured', 'cancel'].filter(scenario => !process.env.VOICE_CASE || scenario === process.env.VOICE_CASE)) {
      const page = await browser.newPage();
      await mock(page, ['unconfigured'].includes(scenario) ? 'none' : scenario === 'cancel' ? 'silent' : ['chunked', 'server-locale'].includes(scenario) ? 'none' : scenario, scenario !== 'unconfigured');
      await page.goto(origin + '/tools/voice-typing');
      const mic = page.locator('.voice-record-button'); await mic.waitFor();
      await page.waitForFunction(() => document.querySelector('.voice-capture-status').textContent.includes('Live recognition') || document.querySelector('.voice-capture-status').textContent.includes('Accurate server') || document.querySelector('.voice-capture-status').textContent.includes('उपलब्ध छैन'));
      assert.equal(await page.evaluate(() => window.__voice.media), 0, 'microphone must require a gesture');
      if (scenario === 'unconfigured') {
        assert.equal(await mic.isVisible(), true); assert.equal(await mic.isDisabled(), true);
        assert.equal(await page.locator('.voice-browser-help a[href^="intent://"]').count(), 1);
      } else {
        if (scenario === 'local') {
          await page.getByRole('button', { name: 'अफलाइन आवाज डाउनलोड गर्नुहोस्', exact: true }).click();
          await page.getByRole('checkbox', { name: /On-device recognition/ }).check();
          assert.equal(await page.evaluate(() => window.__voice.installs), 1);
        }
        if (scenario === 'cleanup') {
          await page.locator('.voice-cleanup-options input').nth(0).check();
          await page.locator('.voice-cleanup-options input').nth(1).click();
          await page.waitForFunction(() => document.querySelectorAll('.voice-cleanup-options input')[1].checked).catch(async error => { console.error(await page.locator('.voice-cleanup-options').textContent()); throw error; });
        }
        await mic.click();
        if (scenario === 'session-ended') {
          await page.evaluate(() => window.__voice.recognition.onend());
          await page.locator('.voice-language-picker button').filter({ hasText: 'English' }).click();
          await page.waitForTimeout(550); assert.equal(await page.evaluate(() => window.__voice.starts), 1, 'idle language changes must not activate a mic');
        } else if (scenario === 'local') {
          assert.equal(await page.evaluate(() => window.__voice.recognition.processLocally), true); await mic.click();
        } else if (scenario === 'cleanup') {
          await page.evaluate(() => window.__voice.recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'सात बजे nepaal पूर्ण विराम' }], { isFinal: true })] }));
          await page.waitForFunction(() => document.querySelector('.voice-transcript-label textarea').value === '७ बजे नेपाल। ');
          await page.locator('.voice-transcript-label textarea').fill('');
          await page.evaluate(() => window.__voice.recognition.onresult({ resultIndex: 1, results: [Object.assign([{ transcript: 'सात बजे nepaal पूर्ण विराम' }], { isFinal: true }),Object.assign([{ transcript: 'आजको युवाको प्रश्नको उत्तर दिने सामर्थ्य ६.' }], { isFinal: true })] }));
          await page.waitForFunction(() => document.querySelector('.voice-transcript-label textarea').value.trim() === 'आजको युवाको प्रश्नको उत्तर दिने सामर्थ्य छ.').catch(async error=>{console.error('copula output:',await page.locator('.voice-transcript-label textarea').inputValue());throw error;});

          await mic.click();
        } else if (scenario === 'server-locale') {
          await page.waitForFunction(() => window.__voice.media === 1);
          await page.locator('.voice-language-picker button').filter({ hasText: 'English' }).click();
          await page.waitForFunction(() => window.__voice.media === 2);
          await page.waitForFunction(() => document.querySelector('.voice-record-button').textContent.includes('Stop listening'));
          await mic.click();
          await page.waitForFunction(() => document.querySelector('.voice-transcript-label textarea').value.includes('Hello Nepal'));
          assert.equal((await page.locator('.voice-transcript-label textarea').inputValue()).trim(), 'नमस्ते नेपाल Hello Nepal');
        } else if (scenario === 'locale') {
          assert.equal(await page.evaluate(() => window.__voice.recognition.lang), 'ne-NP');
          await page.locator('.voice-language-picker button').filter({ hasText: 'English' }).click();
          await page.waitForFunction(() => window.__voice.starts === 2 && window.__voice.recognition.lang === 'en-US');
          await page.evaluate(() => window.__voice.recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'Hello Nepal' }], { isFinal: true })] }));
          await page.waitForFunction(() => document.querySelector('.voice-transcript-label textarea').value === 'Hello Nepal ');
          await mic.click();
        } else if (scenario === 'android') {
          const emit = async text => page.evaluate(text => {
            const final = Object.assign([{ transcript: text }], { isFinal: true });
            window.__voice.recognition.onresult({ resultIndex: 0, results: [final] });
          }, text);
          assert.equal(await page.evaluate(() => window.__voice.recognition.continuous), false);
          await emit('आज मौसम'); await emit('आज मौसम');
          await page.evaluate(() => window.__voice.recognition.onend());
          await page.waitForFunction(() => window.__voice.starts === 2);
          await emit('आज मौसम राम्रो छ'); await emit('आज मौसम राम्रो छ');
          assert.equal((await page.locator('.voice-transcript-label textarea').inputValue()).trim(), 'आज मौसम राम्रो छ');
          await mic.click(); await page.waitForTimeout(550);
          assert.equal(await page.evaluate(() => window.__voice.starts), 2, 'stop prevents restarts');
        } else if (scenario === 'desktop') {
          await page.locator('.voice-transcript-label textarea').fill('Hello world');
          await page.evaluate(() => {
            const editor = document.querySelector('.voice-transcript-label textarea'); editor.setSelectionRange(6, 11);
            const interim = Object.assign([{ transcript: 'नमस्ते' }], { isFinal: false });
            window.__voice.recognition.onresult({ resultIndex: 0, results: [interim] });
          });
          await page.locator('.dictation-inline-preview').waitFor();
          assert.equal(await page.locator('.voice-transcript-label textarea').inputValue(), 'Hello world', 'interim must not commit');
          await page.evaluate(() => {
            const final = Object.assign([{ transcript: 'नमस्ते' }], { isFinal: true });
            window.__voice.recognition.onresult({ resultIndex: 0, results: [final] });
          });
          await page.waitForFunction(() => document.querySelector('.voice-transcript-label textarea').value.includes('नमस्ते'));
          assert.equal(await page.evaluate(() => window.__voice.media), 0);
          assert.equal(await page.locator('.voice-transcript-label textarea').inputValue(), 'Hello नमस्ते ');
          await mic.click();
        } else if (scenario === 'cancel') {
          await mic.click(); await page.waitForTimeout(3200);
          assert.equal(await page.evaluate(() => window.__voice.media), 0, 'cancelled probe must not start recording');
        } else {
          await page.waitForFunction(() => window.__voice.media === 1);
          await page.waitForFunction(() => document.querySelector('.voice-record-button').textContent.includes('रोक्नुहोस्'));
          if (scenario === 'chunked') {
            await page.evaluate(() => window.__voice.recorder.stop());
            await page.waitForFunction(() => document.querySelector('.voice-transcript-label textarea').value.includes('नमस्ते नेपाल'));
            assert.equal(await page.evaluate(() => window.__voice.tracksStopped), 0, 'stream remains open between segments');
          }
          await mic.click();
          await page.waitForFunction(() => document.querySelector('.voice-transcript-label textarea').value.includes('नमस्ते नेपाल'));
          if (scenario === 'chunked') await page.waitForFunction(() => document.querySelector('.voice-transcript-label textarea').value.trim() === 'नमस्ते नेपाल नमस्ते नेपाल');
          assert.equal(await page.evaluate(() => window.__voice.media), 1, 'fallback uses the original tap');
        }
      }
      assert.equal(await page.evaluate(() => localStorage.getItem('nepalmiti.life.v1')), '{"version":1,"sentinel":"preserve"}');
      console.log('Voice browser passed:', scenario); await page.close();
    }
    for (const [route, selector] of [['/', '.qn-mic'], ['/me/notes', '.mp-note-modes button:last-child']]) {
      const page = await browser.newPage(); await mock(page, 'none', false); await page.goto(origin + route);
      const mic = page.locator(selector); await mic.waitFor(); await page.locator('.voice-browser-help').first().waitFor();
      assert.equal(await mic.isVisible(), true); assert.equal(await mic.isDisabled(), true);
      assert.equal(await page.evaluate(() => window.__voice.media), 0);
      console.log('Visible unsupported mic passed:', route); await page.close();
    }
    for (const [route, micSelector, englishSelector] of [['/', '.qn-mic', '.qn-lang button:last-child'], ['/me/notes', '.mp-note-modes button:last-child', '.mp-note-modes button:first-child']]) {
      const page = await browser.newPage(); await mock(page, 'desktop'); await page.goto(origin + route);
      await page.locator(micSelector).click(); await page.waitForFunction(() => window.__voice.starts === 1);
      await page.locator(englishSelector).click();
      await page.waitForFunction(() => window.__voice.starts === 2 && window.__voice.recognition.lang === 'en-US');
      if (route === '/me/notes') assert.equal(await page.locator(micSelector).evaluate(el => el.classList.contains('active')), true);
      await page.locator(micSelector).click(); console.log('Live language switch passed:', route); await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
