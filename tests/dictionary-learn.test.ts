// Learning features: English index keys, SRS, spelling, spell checker, quiz builder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  englishKeys, englishSlug, englishFromSlug, levelForRank, newCard, reviewCard, dueCards,
  spellingVariants, buildSpellIndex, checkSpelling, seededShuffle,
} from '../src/lib/dictionary-core/index.ts';
import { buildQuiz } from '../src/features/dictionary/learn/quiz.ts';

test('englishKeys: strips articles/parentheses, keeps short phrases', () => {
  assert.deepEqual(englishKeys('to eat'), ['eat']);
  assert.ok(englishKeys('a house (building)').includes('house'));
  assert.equal(englishKeys('one two three four five six').length, 0);
  assert.ok(englishKeys('big house').includes('house'), 'noun phrase yields its head');
});

test('englishSlug round-trips simple keys', () => {
  for (const k of ['house', 'thank you', 'ice cream']) assert.equal(englishFromSlug(englishSlug(k)), k);
});

test('levels by frequency rank', () => {
  assert.equal(levelForRank(10), 'A1');
  assert.equal(levelForRank(1000), 'A2');
  assert.equal(levelForRank(2500), 'B1');
  assert.equal(levelForRank(5000), 'B2');
  assert.equal(levelForRank(50000), 'C1');
  assert.equal(levelForRank(undefined), 'C1');
});

test('SM-2 spaced repetition', () => {
  let c = newCard('घर', 'घर', 'house', 'ne-en', 100);
  assert.equal(c.due, 100);
  c = reviewCard(c, 4, 100);
  assert.equal(c.interval, 1);
  c = reviewCard(c, 4, 101);
  assert.equal(c.interval, 3); // gentler 1 → 3 → ×ease ladder for learners
  const longer = reviewCard(c, 5, 104);
  assert.ok(longer.interval > 3 && longer.ease >= c.ease);
  const lapsed = reviewCard(longer, 0, 130);
  assert.equal(lapsed.reps, 0);
  assert.ok(lapsed.due <= 131);
  assert.ok(lapsed.ease >= 1.3);
  assert.deepEqual(dueCards([longer, newCard('x', 'x', 'y', 'ne-en', 50)], 60).map((x) => x.id), ['x']);
});

test('spellingVariants swaps confusable letters', () => {
  assert.ok(spellingVariants('पूजा').includes('पुजा'));
  assert.ok(spellingVariants('विश्वास').some((v) => v.includes('स')));
});

test('checkSpelling flags confusable misspellings, accepts inflected forms', () => {
  const idx = buildSpellIndex(['पूजा', 'विश्वास', 'पानी', 'घर', 'राम्रो', 'खुसी', 'खुशी']);
  const toks = checkSpelling('घरमा पुजा भयो, पानि राम्रा।', idx);
  const st = (w: string) => toks.find((t) => t.text === w)?.status;
  assert.equal(st('घरमा'), 'ok');
  assert.equal(st('राम्रा'), 'ok');
  assert.equal(st('पुजा'), 'suspect');
  assert.deepEqual(toks.find((t) => t.text === 'पुजा')?.suggestions?.[0], 'पूजा');
  assert.equal(st('पानि'), 'suspect');
});

test('seededShuffle is deterministic', () => {
  const a = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(seededShuffle(a, 42), seededShuffle(a, 42));
  assert.deepEqual([...seededShuffle(a, 42)].sort(), a);
});

const bankFile = 'public/data/dict/v1/quiz/bank.json';
test('buildQuiz produces valid 4-option questions for every mode', { skip: !existsSync(bankFile) && 'run npm run dict:build first' }, () => {
  const bank = JSON.parse(readFileSync(bankFile, 'utf8'));
  for (const kind of ['synonym', 'antonym', 'spelling', 'ukhan', 'meaning-en', 'meaning-ne'] as const) {
    const qs = buildQuiz(bank, kind, 'all', 10, 7);
    assert.equal(qs.length, 10, kind);
    for (const q of qs) {
      assert.ok(q.options.length >= 3 && q.options.length <= 4, kind);
      assert.equal(new Set(q.options).size, q.options.length, `${kind}: duplicate options`);
      assert.ok(q.answer >= 0 && q.answer < q.options.length);
    }
  }
  assert.deepEqual(buildQuiz(bank, 'synonym', 'A2', 5, 1), buildQuiz(bank, 'synonym', 'A2', 5, 1));
});
