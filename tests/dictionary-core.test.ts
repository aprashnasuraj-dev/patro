// Run: node --test tests/   (Node 22.18+ strips TS types natively)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  romanize, romanKey, looseKey, rhymeInfo, devKey, parseQuery, stemCandidates,
  searchRows, findRhymes, computeKeys, decodeSlug, slugFor, wordOfTheDay, hashKey,
  type IndexRow, type LexiconEntry,
} from '../src/lib/dictionary-core/index.ts';

test('romanize: Nepali schwa rules', () => {
  const cases: Record<string, string> = {
    घर: 'ghar', सहर: 'sahar', जीवन: 'jiban', शिविर: 'shibir', स्वर: 'swar', सपना: 'sapana', कमल: 'kamal',
    सत्य: 'satya', धर्म: 'dharma', समय: 'samaya', म: 'ma', माया: 'maya',
    गाउँ: 'gaun', सम्बन्ध: 'sambandha', ज्ञान: 'gyan', विवाह: 'bibah', 'आकाशको फल': 'akashko phal',
  };
  for (const [dev, lat] of Object.entries(cases)) assert.equal(romanize(dev), lat, dev);
});

test('romanKey folds what users type', () => {
  assert.equal(romanKey('Ghaar'), 'ghar');
  assert.equal(romanKey('shahar'), romanKey('sahar'));
  assert.equal(romanKey('vivah'), romanKey('bibah'));
  assert.equal(romanKey('phool'), romanKey('ful'));
  assert.equal(romanKey('jeevan'), romanKey(romanize('जीवन')));
  assert.equal(looseKey('sapna'), looseKey(romanize('सपना')));
});

test('devKey folds spelling variants and is idempotent', () => {
  const pairs = [['शहर', 'सहर'], ['पूजा', 'पुजा'], ['दुःख', 'दुख'], ['संबन्ध', 'सम्बन्ध'], ['छन्', 'छन'], ['गाउँ', 'गाउं'], ['क़लम', 'कलम']];
  for (const [a, b] of pairs) assert.equal(devKey(a), devKey(b), `${a} ~ ${b}`);
  for (const w of ['शहर', 'सम्बन्ध', 'हृदय']) assert.equal(devKey(devKey(w)), devKey(w));
});

test('rhyme keys', () => {
  assert.equal(rhymeInfo('घर').single, rhymeInfo('सहर').single);
  assert.equal(rhymeInfo('पानी').single, rhymeInfo('कहानी').single);
  assert.equal(rhymeInfo('माया').single, rhymeInfo('छाया').single);
  assert.equal(rhymeInfo('मन').single, rhymeInfo('जीवन').single);
  assert.notEqual(rhymeInfo('घर').single, rhymeInfo('मन').single);
  assert.equal(rhymeInfo('सहर').double, rhymeInfo('लहर').double);
  assert.equal(rhymeInfo('गाउँ').single, rhymeInfo('ठाउँ').single);
  assert.equal(rhymeInfo('घर').slant, rhymeInfo('जल').slant); // r/l both liquids
});

test('query parsing', () => {
  assert.deepEqual(parseQuery('घरको अर्थ'), { term: 'घर', intent: 'meaning', script: 'deva' });
  assert.equal(parseQuery('ghar meaning in nepali').term, 'ghar');
  assert.deepEqual(parseQuery('words that rhyme with maya'), { term: 'maya', intent: 'rhyme', script: 'latin' });
  assert.equal(parseQuery('सुखको विपरीत शब्द').intent, 'antonym');
  assert.ok(stemCandidates('घरहरूमा').includes('घर'));
});

test('slugs & decoding', () => {
  assert.equal(slugFor('आकाशको फल'), 'आकाशको-फल');
  assert.equal(slugFor('लेख', 2), 'लेख-2');
  assert.equal(decodeSlug(encodeURIComponent('घर')), 'घर');
  assert.equal(decodeSlug(encodeURIComponent(encodeURIComponent('घर'))), 'घर');
  assert.match(hashKey('घर'), /^[0-9a-f]{8}$/);
});

const entries: LexiconEntry[] = [
  { lemma: 'घर', senses: [{ id: 's1', pos: 'noun', ne: 'बस्ने ठाउँ', en: ['house', 'home'] }], freq: 50 },
  { lemma: 'सहर', variants: ['शहर'], senses: [{ id: 's1', pos: 'noun', ne: 'नगर', en: ['city'] }], freq: 400 },
  { lemma: 'सपना', senses: [{ id: 's1', pos: 'noun', ne: 'निद्रामा देखिने दृश्य', en: ['dream'] }], freq: 300 },
  { lemma: 'घाम', senses: [{ id: 's1', pos: 'noun', ne: 'सूर्यको प्रकाश', en: ['sunshine'] }], freq: 500 },
];
const rows: IndexRow[] = entries.map((e) => {
  const k = computeKeys(e);
  return [k.slug, e.lemma, k.roman, k.devKey, k.romanKey, k.looseKey, e.freq ?? 0, e.senses[0].en?.join(', ') ?? ''];
});

test('search tiers', () => {
  assert.equal(searchRows(rows, 'घर')[0].slug, 'घर');
  assert.equal(searchRows(rows, 'शहर')[0].slug, 'सहर'); // variant spelling
  assert.equal(searchRows(rows, 'ghaar')[0].slug, 'घर'); // romanized, long vowel typed
  assert.equal(searchRows(rows, 'sapna')[0].slug, 'सपना'); // loose tier
  assert.equal(searchRows(rows, 'house')[0].slug, 'घर'); // English gloss
  assert.equal(searchRows(rows, 'घरको')[0].slug, 'घर'); // inflected form
  assert.equal(searchRows(rows, 'shaher')[0].slug, 'सहर'); // fuzzy
});

test('rhymes rank double > single', () => {
  const mk = (lemma: string) => {
    const k = computeKeys({ lemma, senses: [] });
    return { slug: k.slug, lemma, roman: k.roman, syllables: k.syllables, rhyme: k.rhyme };
  };
  const hits = findRhymes(mk('सहर'), ['घर', 'लहर', 'मन', 'डर'].map(mk));
  assert.equal(hits[0].lemma, 'लहर');
  assert.equal(hits[0].strength, 'double');
  assert.ok(!hits.some((h) => h.lemma === 'मन'));
});

test('word of the day is deterministic and accepts Devanagari digits', () => {
  const cfg = { pool: ['घर', 'सहर', 'सपना', 'घाम'] };
  assert.equal(wordOfTheDay('२०८३-०६-१४', cfg), wordOfTheDay('2083-06-14', cfg));
  assert.equal(wordOfTheDay('2083-06-14', { ...cfg, overrides: { '2083-06-14': 'घाम' } }), 'घाम');
});

// ───────────── morphology (Hunspell rules, LibreOffice ne_NP) ─────────────
import { NE_MORPH, analyze, generateForms, lemmaCandidates, mergeEntries, stubFromRow, indexRow, compileEntries } from '../src/lib/dictionary-core/index.ts';

test('morphology: inflected forms resolve to headwords', () => {
  assert.ok(analyze('गरेको', NE_MORPH).includes('गर्नु'));
  assert.ok(analyze('नगर्नु', NE_MORPH).includes('गर्नु'));
  assert.ok(analyze('राम्रा', NE_MORPH).includes('राम्रो'));
  assert.ok(lemmaCandidates('घरहरूमा').includes('घर'));
  const forms = generateForms('गर्', ['1'], NE_MORPH);
  for (const f of ['गर्नु', 'गर्छ', 'गरेको', 'गर्दै', 'नगर्नु']) assert.ok(forms.includes(f), f);
});

test('mergeEntries: later sources lead, arrays union, stubs upgraded', () => {
  const [m] = mergeEntries([
    [{ lemma: 'घर', senses: [], status: 'stub', freq: 67, inflection: { stem: 'घर', flags: ['15'] }, src: ['mpp-hunspell'] }],
    [{ lemma: 'घर', senses: [{ id: 's1', pos: 'noun', ne: 'बस्ने ठाउँ।', en: ['house'] }], synonyms: ['गृह'], status: 'reviewed', src: ['patro-editorial'] }],
  ]);
  assert.equal(m.status, 'reviewed');
  assert.equal(m.freq, 67);
  assert.deepEqual(m.src, ['mpp-hunspell', 'patro-editorial']);
  assert.equal(m.senses[0].en?.[0], 'house');
  assert.ok(m.inflection);
});

test('stub rows round-trip through the static index', () => {
  const [c] = compileEntries([{ lemma: 'हेर्नु', senses: [], status: 'stub', posHint: 'verb', inflection: { stem: 'हेर्', flags: ['1'] } }]);
  const e = stubFromRow(indexRow(c));
  assert.equal(e.lemma, 'हेर्नु');
  assert.equal(e.posHint, 'verb');
  assert.deepEqual(e.inflection, { stem: 'हेर्', flags: ['1'] });
});
