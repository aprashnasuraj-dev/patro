import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';

async function runtime(storage = new Map()) {
  const output = await build({ entryPoints: ['src/patro-tools/language/voice-engine.ts'], bundle: true, write: false, format: 'cjs' });
  const context = { module: { exports: {} }, localStorage: {
    getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value),
  } };
  runInNewContext(output.outputFiles[0].text, context);
  return context.module.exports;
}
test('browser engine hints expire, isolate languages, and retain existing storage', async () => {
  const storage = new Map([['nepalmiti.life.v1', 'private notes']]); const api = await runtime(storage);
  assert.equal(api.browserEngineHint('ne-NP', 100), null);
  api.rememberBrowserEngine('ne-NP', false, 100);
  api.rememberBrowserEngine('en-US', true, 200);
  assert.equal(api.browserEngineHint('ne-NP', 201), false);
  assert.equal(api.browserEngineHint('en-US', 201), true);
  assert.equal(api.browserEngineHint('ne-NP', 99), null);
  assert.equal(api.browserEngineHint('ne-NP', 86_400_100), null);
  assert.equal(storage.get('nepalmiti.life.v1'), 'private notes');
  assert.deepEqual([...storage.keys()].sort(), ['nepalmiti.life.v1', 'patro.voice.engine.v1']);
});
test('corrupt or blocked storage cannot break recognition', async () => {
  const storage = new Map([['patro.voice.engine.v1', '{broken']]); const api = await runtime(storage);
  assert.equal(api.browserEngineHint('ne-NP'), null);
  assert.doesNotThrow(() => api.rememberBrowserEngine('ne-NP', true));
  const blocked = await runtime({ get() { throw Error('blocked'); }, set() { throw Error('blocked'); } });
  assert.equal(blocked.browserEngineHint('ne-NP'), null);
  assert.doesNotThrow(() => blocked.rememberBrowserEngine('ne-NP', false));
});

test('Android event fixtures commit only new final words across cumulative snapshots and restarts', async () => {
  const { readFileSync } = await import('node:fs');
  const output = await build({ entryPoints: ['src/patro-tools/language/voice-results.ts'], bundle: true, write: false, format: 'cjs' });
  const context = { module: { exports: {} } }; runInNewContext(output.outputFiles[0].text, context);
  for (const fixture of JSON.parse(readFileSync('tests/fixtures/voice/android-results.json', 'utf8'))) {
    const diff = new context.module.exports.VoiceResultDiff(); const chunks = [];
    for (const session of fixture.sessions) {
      diff.restart();
      for (const snapshot of session) {
        const final = snapshot.map(transcript => Object.assign([{ transcript }], { isFinal: true }));
        const delta = diff.final(final); if (delta) chunks.push(delta);
        assert.equal(diff.final(final), '', 'redelivered snapshot');
      }
    }
    assert.equal(chunks.join(' '), fixture.expected, fixture.name);
  }
});

test('recorded segments have independent containers, upload in order, and flush on stop', async () => {
  const output = await build({ entryPoints: ['src/patro-tools/language/voice-chunks.ts'], bundle: true, write: false, format: 'cjs' });
  let id = 0, stopped = 0; const texts = [], uploads = [], recorders = []; const timers = new Map();
  class Recorder {
    constructor() { this.id = ++id; this.state = 'inactive'; this.mimeType = 'audio/webm'; recorders.push(this); }
    start(timeslice) { assert.equal(timeslice, undefined, 'must not use undecodable timeslice fragments'); this.state = 'recording'; }
    stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable({ data: new Blob([`HEADER-${this.id}`]) }); this.onstop(); }); }
  }
  const context = { module: { exports: {} }, Blob, AbortController, Date, MediaRecorder: Recorder,
    setTimeout: fn => { const key = timers.size + 1; timers.set(key, fn); return key; }, clearTimeout: key => timers.delete(key), setInterval: () => 99, clearInterval() {} };
  runInNewContext(output.outputFiles[0].text, context);
  let release; const blocked = new Promise(resolve => { release = resolve; }); let ended = false;
  const session = context.module.exports.recordVoiceChunks({ stream: { getTracks: () => [{ stop() { stopped++; } }] }, mimeType: 'audio/webm',
    async transcribe(blob) { const value = await blob.text(); uploads.push(value); if (value === 'HEADER-1') await blocked; return value; },
    onText: text => texts.push(text), onProgress() {}, onError: error => { throw error; }, onEnd() { ended = true; } });
  recorders[0].stop(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(recorders.length, 2); recorders[1].stop(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(uploads, ['HEADER-1'], 'second upload waits for the first');
  session.stop(); await new Promise(resolve => setImmediate(resolve)); assert.equal(ended, false, 'wait for pending transcripts');
  release(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(uploads, ['HEADER-1', 'HEADER-2', 'HEADER-3']); assert.deepEqual(texts, uploads);
  assert.equal(ended, true); assert.ok(stopped > 0);
});

test('dictation inserts at the cursor, replaces selection, and respects existing editor limits', async () => {
  const output = await build({ entryPoints: ['src/patro-tools/language/voice-insertion.ts'], bundle: true, write: false, format: 'cjs' });
  const context = { module: { exports: {} } }; runInNewContext(output.outputFiles[0].text, context);
  const insert = context.module.exports.insertDictatedText;
  assert.equal(insert('Hello world', 'Nepal ', 6, 11).text, 'Hello Nepal ');
  assert.equal(insert('आज राम्रो छ', 'मौसम ', 3, 3).text, 'आज मौसम राम्रो छ');
  assert.equal(insert('hello', 'world ').text, 'hello world ');
  assert.equal(insert('abcXYZ', '123456', 3, 3, 8).text, 'abc 1XYZ');
  assert.equal(insert('', 'नमस्ते ').cursor, 'नमस्ते '.length);
});

test('browser guidance distinguishes service failure from permission and removes private query fields from open-browser links', async () => {
  const output = await build({ entryPoints: ['src/patro-tools/language/voice-guidance.ts'], bundle: true, write: false, format: 'cjs' });
  const context = { module: { exports: {} }, URL }; runInNewContext(output.outputFiles[0].text, context);
  const api = context.module.exports;
  assert.match(api.speechError('en-US', 'not-allowed'), /allow microphone/);
  assert.doesNotMatch(api.speechError('en-US', 'service-not-allowed'), /allow microphone/);
  assert.match(api.speechError('en-US', 'service-not-allowed'), /Siri/);
  for (const app of ['FBAN', 'FBAV', 'Instagram', 'Line/14', 'TikTok', 'Viber']) {
    const info = api.voiceBrowserGuidance(`Android ${app}`, 'https://aafnaipatro.com/tools/voice-typing?name=private#secret');
    assert.equal(info.inApp, true); assert.match(info.chromeIntent, /^intent:\/\/aafnaipatro.com\/tools\/voice-typing#Intent;/);
    assert.equal(info.copyUrl, 'https://aafnaipatro.com/tools/voice-typing'); assert.ok(!info.chromeIntent.includes('private'));
  }
  assert.equal(api.voiceBrowserGuidance('iPhone Safari', 'https://aafnaipatro.com/').ios, true);
});

test('local recognition requires a local pack, handles installation, and times out stalled availability/downloads', async () => {
  const output = await build({ entryPoints: ['src/patro-tools/language/voice-local.ts'], bundle: true, write: false, format: 'cjs' });
  const context = { module: { exports: {} }, Date, Promise, setTimeout, clearTimeout }; runInNewContext(output.outputFiles[0].text, context);
  const api = context.module.exports; let installed = false;
  const sr = { async available(options) { assert.equal(options.processLocally, true); assert.deepEqual([...options.langs], ['ne-NP']); return installed ? 'available' : 'downloadable'; }, async install(options) { assert.equal(options.processLocally, true); installed = true; return true; } };
  assert.equal(await api.localSpeechStatus(sr, 'ne-NP', 30), 'downloadable');
  assert.equal(await api.installLocalSpeech(sr, 'ne-NP', 30), 'available');
  assert.equal(await api.localSpeechStatus(null, 'ne-NP'), 'unavailable');
  assert.equal(await api.localSpeechStatus({ available: () => new Promise(() => {}) }, 'ne-NP', 5), 'unavailable');
  assert.equal(await api.localSpeechStatus({ available: async () => 'downloading' }, 'ne-NP', 8), 'unavailable');
  assert.equal(await api.installLocalSpeech({ install: () => new Promise(() => {}) }, 'ne-NP', 5), 'unavailable');
  const controller = new AbortController(); controller.abort();
  assert.equal(await api.localSpeechStatus(sr, 'ne-NP', 30, controller.signal), 'unavailable');
});

test('the bundled Roman voice adapter preserves the existing keyboard mappings', async () => {
  const { transliterateRoman: original } = await import('../public/nepali-tools/core/roman.mjs');
  const output = await build({ entryPoints: ['src/patro-tools/language/roman-keyboard.ts'], bundle: true, write: false, format: 'cjs' });
  const context = { module: { exports: {} } }; runInNewContext(output.outputFiles[0].text, context);
  for (const word of ['nepaal','namaste','kathmandu','English','school','ksh','gy','shr','aa','aai','chha','raam','mero','~','M','H','x','Hello world']) assert.equal(context.module.exports.transliterateRoman(word), original(word), word);
});
