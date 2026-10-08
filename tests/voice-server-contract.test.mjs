import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';

async function runtime(entry = 'worker/speech.ts', fetcher = () => { throw Error('Unexpected upstream'); }, overrides = {}) {
  const output = await build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node', logLevel: 'silent' });
  const rows = new Map();
  const context = { module: { exports: {} }, exports: {}, require: createRequire(import.meta.url),
    Request, Response, Headers, URL, FormData, Blob, File, TextEncoder, AbortController, crypto: webcrypto,
    Date: class extends Date { static now() { return Date.UTC(2026, 9, 8, 12); } },
    setTimeout, clearTimeout, fetch: fetcher,
    caches: { default: { match: async key => rows.get(String(key))?.clone(), put: async (key, value) => rows.set(String(key), value.clone()) } },
    ...overrides,
  };
  context.exports = context.module.exports;
  runInNewContext(output.outputFiles[0].text, context);
  return { api: context.module.exports, rows };
}
function request(ip = '192.0.2.10', language = 'ne-NP', bytes = 'test audio') {
  const body = new FormData(); body.set('audio', new Blob([bytes], { type: 'audio/webm' }), 'speech.webm'); body.set('language', language);
  return new Request('https://aafnaipatro.com/api/nepali/stt', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body });
}
function noDatabase(env) { return new Proxy(env, { get(target, key) { if (key === 'DB') throw Error('Speech accessed D1'); return target[key]; } }); }

test('capabilities preserve their contract and detect either server provider without D1', async () => {
  const { api } = await runtime();
  const req = () => new Request('https://aafnaipatro.com/api/nepali/speech-capabilities');
  for (const [env, available] of [[{}, false], [{ GROQ_API_KEY: 'test-key' }, true], [{ AI: { run() {} } }, true]]) {
    const response = await api.speechApiResponse(req(), noDatabase(env));
    const body = await response.json(); assert.equal(body.stt.server, available); assert.equal(body.stt.databaseRequired, false);
    assert.equal(body.tts.browser, true); assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
  }
});
test('Workers AI receives base64 and language hints, and both output schemas normalize identically', async () => {
  const { api, rows } = await runtime(); let called = 0;
  const env = noDatabase({ AI: { async run(model, input) {
    called++; assert.equal(model, '@cf/openai/whisper-large-v3-turbo'); assert.equal(Buffer.from(input.audio, 'base64').toString(), 'test audio');
    assert.equal(input.language, called === 1 ? 'ne' : 'en');
    if (called === 1) { assert.match(input.initial_prompt, /नेपाली/); return { transcription_info: { text: ' नमस्ते ' } }; }
    assert.equal(input.initial_prompt, undefined); return { text: ' Hello ' };
  } } });
  for (const language of ['ne-NP', 'en-US']) {
    const response = await api.speechApiResponse(request('192.0.2.10', language), env);
    assert.equal(response.status, 200); const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ['language', 'provider', 'text']); assert.equal(body.language, language);
    assert.equal(body.text, language === 'ne-NP' ? 'नमस्ते' : 'Hello');
  }
  assert.equal(called, 2);
  for (const [key, response] of rows) { assert.ok(!key.includes('192.0.2.10')); const text = await response.text(); assert.ok(!/test audio|नमस्ते|Hello/.test(text)); }
});
test('AI failure falls through to the existing Groq contract; Groq-only remains supported', async () => {
  let calls = 0;
  const { api } = await runtime('worker/speech.ts', async (url, options) => {
    calls++; assert.equal(url, 'https://api.groq.com/openai/v1/audio/transcriptions'); assert.equal(options.headers.authorization, 'Bearer test-key');
    assert.equal(options.body.get('language'), 'ne'); assert.equal(options.body.get('model'), 'whisper-large-v3-turbo');
    return Response.json({ text: ' परीक्षण ' });
  });
  for (const env of [{ AI: { run: async () => { throw Error('AI unavailable'); } }, GROQ_KEY: 'test-key' }, { Groq_API: 'test-key' }]) {
    const response = await api.speechApiResponse(request(), noDatabase(env)); assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { text: 'परीक्षण', language: 'ne-NP', provider: 'whisper-large-v3-turbo' });
  }
  assert.equal(calls, 2);
});
test('unconfigured, empty, invalid, and no-speech requests keep explicit JSON errors', async () => {
  const { api } = await runtime();
  assert.deepEqual(await (await api.speechApiResponse(request(), {})).json(), { error: 'speech_backend_unconfigured' });
  const env = { AI: { run: async () => ({ text: '' }) } };
  assert.equal((await api.speechApiResponse(request('192.0.2.10', 'ne-NP', ''), env)).status, 400);
  const invalid = new Request('https://aafnaipatro.com/api/nepali/stt', { method: 'POST', body: '{}' });
  assert.equal((await api.speechApiResponse(invalid, env)).status, 400);
  assert.equal((await api.speechApiResponse(request(), env)).status, 422);
  assert.equal((await api.speechApiResponse(new Request('https://aafnaipatro.com/api/nepali/stt'), env)).status, 405);
});
test('minute and day counters reset independently, isolate IPs, and serialize concurrent requests', async () => {
  const { api } = await runtime('worker/speech-quota.ts'); const limits = { minute: 2, day: 3 };
  const at = Date.UTC(2026, 9, 8, 12); const req = request();
  const concurrent = await Promise.all(Array.from({ length: 5 }, () => api.consumeSpeechQuota(req, limits, at)));
  assert.equal(concurrent.filter(row => row.allowed).length, 2);
  assert.equal((await api.consumeSpeechQuota(request('192.0.2.11'), limits, at)).allowed, true);
  assert.equal((await api.consumeSpeechQuota(req, limits, at + 60_000)).allowed, true);
  assert.equal((await api.consumeSpeechQuota(req, limits, at + 120_000)).allowed, false);
  assert.equal((await api.consumeSpeechQuota(req, limits, at + 86_400_000)).allowed, true);
});
test('quota denial returns 429 with Retry-After before invoking a provider', async () => {
  const { api } = await runtime(); let called = 0; const env = { AI: { run: async () => { called++; return { text: 'Hello' }; } } };
  for (let i = 0; i < 12; i++) assert.equal((await api.speechApiResponse(request(), env)).status, 200);
  const denied = await api.speechApiResponse(request(), env); assert.equal(denied.status, 429); assert.ok(Number(denied.headers.get('retry-after')) > 0);
  assert.equal(called, 12); assert.equal((await denied.json()).error, 'speech_rate_limited');
});
test('an AI timeout returns the existing timeout error without retaining audio', async () => {
  const { api } = await runtime('worker/speech.ts', undefined, {
    setTimeout(fn) { queueMicrotask(fn); return 1; }, clearTimeout() {},
  });
  const response = await api.speechApiResponse(request(), { AI: { run: () => new Promise(() => {}) } });
  assert.equal(response.status, 504); assert.equal((await response.json()).error, 'speech_provider_timeout');
});
test('a broken quota cache fails safely before billable provider work', async () => {
  const { api } = await runtime('worker/speech.ts', undefined, { caches: { default: { match() { throw Error('Unavailable'); } } } });
  const response = await api.speechApiResponse(request(), { AI: { run() { throw Error('Must not be called'); } } });
  assert.equal(response.status, 503); assert.equal((await response.json()).error, 'speech_rate_limit_unavailable');
});
test('the AI binding is declared without changing runtime or data bindings', () => {
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8')); assert.equal(config.ai.binding, 'AI');
  assert.equal(config.main, 'worker/optimized-entry.ts'); assert.equal(config.d1_databases[0].binding, 'DB'); assert.equal(config.preview_urls, false);
});
