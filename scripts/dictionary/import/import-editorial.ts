/**
 * Convert editorial TSV files (data/editorial/*.tsv) → data/lexicon.editorial.json
 *
 *   node scripts/dictionary/import/import-editorial.ts
 *
 * TSV is the easiest format for editors (Google Sheets / Excel → "Download as TSV").
 * Columns:  lemma | pos | nepali definition | english glosses (comma) | example ne | example en
 *   • several lines with the same lemma = several senses
 *   • lines starting with # are comments
 *   • pos: n adj v adv pron post conj part num intj phrase  (or the full English names)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LexiconEntry, PartOfSpeech } from '../../../src/lib/dictionary-core/types.ts';

const ROOT = process.cwd();
const DIR = join(ROOT, 'data/dictionary/editorial');

const POS: Record<string, PartOfSpeech> = {
  n: 'noun', noun: 'noun', adj: 'adjective', adjective: 'adjective', v: 'verb', verb: 'verb',
  adv: 'adverb', adverb: 'adverb', pron: 'pronoun', pronoun: 'pronoun', post: 'postposition', postposition: 'postposition',
  conj: 'conjunction', conjunction: 'conjunction', part: 'particle', particle: 'particle', num: 'numeral', numeral: 'numeral',
  intj: 'interjection', interjection: 'interjection', phrase: 'phrase',
};

const clean = (s = '') => s.normalize('NFC').replace(/[​﻿]/g, '').trim();
const byLemma = new Map<string, LexiconEntry & { src: string[] }>();
const problems: string[] = [];
let lines = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.tsv')).sort()) {
  readFileSync(join(DIR, file), 'utf8').split('\n').forEach((raw, i) => {
    if (!raw.trim() || raw.startsWith('#')) return;
    const [lemmaRaw, posRaw, ne, en, exNe, exEn] = raw.split('\t').map(clean);
    const lemma = lemmaRaw.replace(/[‌‍]/g, '');
    const pos = POS[(posRaw ?? '').toLowerCase()];
    if (!lemma || !pos || !ne) {
      problems.push(`${file}:${i + 1} missing lemma/pos/definition`);
      return;
    }
    lines++;
    let e = byLemma.get(lemma);
    if (!e) {
      e = { lemma, senses: [], status: 'reviewed', src: ['patro-editorial'] };
      byLemma.set(lemma, e);
    }
    // identical definition twice (same word in two files) → keep the first
    if (e.senses.some((s) => s.ne === ne)) return;
    e.senses.push({
      id: `s${e.senses.length + 1}`,
      pos,
      ne: /[।?!]$/.test(ne) ? ne : ne + '।',
      ...(en ? { en: en.split(',').map((x) => x.trim()).filter(Boolean) } : {}),
      ...(exNe ? { examples: [{ ne: exNe, ...(exEn ? { en: exEn } : {}) }] } : {}),
    });
  });
}

// ── Gloss overlays: English glosses for senses that came from another source ──
// data/editorial/glosses/*.tsv   lemma | sense id (as in lexicon.open.json) | english glosses (comma)
const glossOverlay: Record<string, Record<string, string[]>> = {};
let glossLines = 0;
const GDIR = join(DIR, 'glosses');
if (existsSync(GDIR)) {
  for (const file of readdirSync(GDIR).filter((f) => f.endsWith('.tsv')).sort()) {
    readFileSync(join(GDIR, file), 'utf8').split('\n').forEach((raw, i) => {
      if (!raw.trim() || raw.startsWith('#')) return;
      const [lemma, sid, en] = raw.split('\t').map(clean);
      if (!lemma || !/^s\d+$/.test(sid ?? '') || !en) {
        problems.push(`glosses/${file}:${i + 1} expected: lemma<TAB>s1<TAB>glosses`);
        return;
      }
      (glossOverlay[lemma] ??= {})[sid] = en.split(',').map((x) => x.trim()).filter(Boolean);
      glossLines++;
    });
  }
}

const entries = [...byLemma.values()];
writeFileSync(
  join(ROOT, 'data/dictionary/lexicon.editorial.json'),
  JSON.stringify({ _note: 'GENERATED from data/editorial/*.tsv — edit the TSV files, not this.', glossOverlay, entries }, null, 1),
);
console.log(`✔ editorial: ${lines} lines → ${entries.length} entries; ${glossLines} English gloss overlays`);
if (problems.length) console.warn(problems.join('\n'));
