import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';

async function runtime(entry) {
  const output = await build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node', logLevel: 'silent' });
  const context = { module: { exports: {} }, require: createRequire(import.meta.url), URL, Date, console,
    fetch() { throw Error('Unexpected API or database read'); } };
  runInNewContext(output.outputFiles[0].text, context); return context.module.exports;
}
test('spoken and typed festival questions use the same deterministic bot answer without another API read', async () => {
  const engine = await runtime('src/patro-tools-integration/patroBotEngine.ts');
  const typed = await engine.answerPatroQuestion('दशैं कहिले', 'https://aafnaipatro.com', { helpFallback: true });
  const spoken = await engine.answerPatroQuestion('दशैं कहिले? ', 'https://aafnaipatro.com', { helpFallback: true });
  assert.equal(spoken.intent.type, 'festival'); assert.equal(spoken.answer, typed.answer); assert.match(spoken.answer, /दशैं|दशै|विजया/);
});
