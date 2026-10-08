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
