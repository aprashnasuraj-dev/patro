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

test('voice reminders parse dates and time without writing storage or silently inventing a source year', async () => {
  const { parseVoiceReminder } = await runtime('src/patro-tools/language/voice-reminder.ts');
  const calls = []; const context = { today: '2026-10-08', bsYear: 2083, toAD(year, month, day) { calls.push([year, month, day]); return `${year === 2083 ? 2026 : year === 2084 ? 2027 : 2025}-${day === 10 ? '09-26' : '10-11'}`; } };
  const medicine = parseVoiceReminder('भोलि बिहान सात बजे औषधि', context);
  assert.equal(medicine.kind, 'reminder'); assert.equal(medicine.title, 'औषधि'); assert.equal(medicine.date, '2026-10-09'); assert.equal(medicine.time, '07:00');
  const tithi = parseVoiceReminder('असोज २५ गते आमाको तिथि', context);
  assert.equal(tithi.kind, 'tithi'); assert.equal(tithi.date, '2026-10-11'); assert.ok(tithi.warnings.some(value => value.includes('वर्ष'))); assert.deepEqual(calls[0], [2083, 6, 25]);
  const nextYear = parseVoiceReminder('असोज १० गते जन्मदिन', context); assert.equal(nextYear.date, '2027-09-26');
  const evening = parseVoiceReminder('tomorrow 7 pm medicine', context); assert.equal(evening.time, '19:00'); assert.equal(evening.title, 'medicine');
  assert.equal(parseVoiceReminder('औषधि', context), null);
  assert.equal(parseVoiceReminder('भोलि २५ बजे औषधि', context), null);
  assert.equal(parseVoiceReminder('2026-02-30 औषधि', context), null);
});

test('the calendar adapter reads and caches static year assets without requesting an API or D1', async () => {
  const output = await build({ entryPoints: ['src/patro-tools-integration/staticCalendar.ts'], bundle: true, write: false, format: 'cjs' });
  let calls = 0; const row = { ad: '2026-10-08', bs: { year: 2083, month: 6, day: 22 }, panchang: { tithi: { number: 27, paksha: 'Krishna Paksha' } } };
  const context = { module: { exports: {} }, Date, DOMException, async fetch(url) { calls++; assert.equal(url, '/data/calendar/ad/2026.json'); return { ok: true, async json() { return { schema: 1, calendar: 'ad', year: 2026, rows: [row] }; } }; } };
  runInNewContext(output.outputFiles[0].text, context);
  assert.equal((await context.module.exports.archiveDay('2026-10-08')).panchang.tithi.number, 27);
  await context.module.exports.archiveDay('2026-10-08'); assert.equal(calls, 1);
  await assert.rejects(context.module.exports.archiveDay('2026-10-09'), /अभिलेख/);
});

test('voice Preeti conversion reuses the core Nepali mapping and preserves Latin text', async () => {
  const { unicodeToPreeti, preetiToUnicode } = await runtime('packages/core/src/preeti.ts');
  for (const text of ['नेपाल', 'मेरो नाम सुरज हो।']) assert.equal(preetiToUnicode(unicodeToPreeti(text)), text);
  assert.ok(unicodeToPreeti('नेपाल Office 2026').includes('Office 2026'));
});

test('application templates include only supplied facts and preserve literal text', async () => {
 const { applicationLetter, LETTER_DEFAULTS } = await runtime('src/patro-tools/language/application-letter.ts');
 assert.deepEqual(Object.keys(LETTER_DEFAULTS), ['leave','recommendation','office']);
 const result = applicationLetter({ recipient: 'शाखा प्रमुख', name: 'सुरज', subject: 'बिदा', body: '<script>literal</script>', date: '2083-06-22' });
 assert.match(result, /सुरज/); assert.match(result, /2083-06-22/); assert.match(result, /<script>literal<\/script>/); assert.ok(!result.includes('स्वीकृत'));
});
