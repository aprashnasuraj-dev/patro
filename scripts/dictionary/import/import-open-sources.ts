/**
 * Build the open Nepali lexicon from openly-licensed sources vendored in data/sources/.
 *
 *   node scripts/dictionary/import/import-open-sources.ts
 *
 * Inputs (see data/sources/SOURCES.md for licenses & provenance):
 *   libreoffice-ne_NP/ne_NP.dic + .aff   Hunspell stems + affix rules        LGPL-2.1 (Madan Puraskar Pustakalaya)
 *   libreoffice-ne_NP/th_ne_NP_v2.dat    thesaurus: POS, Nepali glosses, synonyms   (same package)
 *   nepali-stemmer/headwords.txt         headword list (words only)          MIT
 *   nepalitokenizers/word-logprob.tsv    corpus unigram log-probabilities    Apache-2.0
 *
 * Outputs:
 *   data/lexicon.open.json                       merged entries (stubs + defined)
 *   src/lib/dictionary-core/morph-rules.generated.ts   compiled affix rules for runtime
 *   dict-build/import-report.json                counts + anomalies for review
 *
 * Facts about the language (which words exist, their part of speech, how they inflect)
 * come from these sources; wording we add ourselves is marked with src "patro-editorial".
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { citationForm, type AffixRule, type MorphRules } from '../../../src/lib/dictionary-core/morph.ts';
import type { LexiconEntry, PartOfSpeech, Sense } from '../../../src/lib/dictionary-core/types.ts';

const ROOT = process.cwd();
const SRC = join(ROOT, 'data/dictionary/sources');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');
const report: Record<string, unknown> = {};

// ───────────────────────── text cleanup ─────────────────────────
/** Fix legacy-input artefacts common in older Nepali Unicode data. */
export function fixText(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[​‌‍﻿]/g, '')
    .replace(/अा/g, 'आ')
    .replace(/ाे/g, 'ो')
    .replace(/ाै/g, 'ौ')
    .replace(/ेे/g, 'े')
    .replace(/[।|]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
const isDeva = (s: string) => /^[ऀ-ॿ\s-]+$/.test(s) && /[क-हअ-औ]/.test(s);

// ───────────────────────── 1. Hunspell affix rules ─────────────────────────
function parseAff(text: string): MorphRules {
  const rules: AffixRule[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim().split(/\s+/);
    if ((t[0] !== 'SFX' && t[0] !== 'PFX') || t.length < 5) continue;
    if (t.length === 4 && /^[YN]$/.test(t[2])) continue; // header
    if (/^[YN]$/.test(t[2]) && /^\d+$/.test(t[3])) continue; // header with trailing junk
    const [, f, strip, addRaw, cond] = t;
    const add = addRaw.split('/')[0];
    rules.push({ f, k: t[0] === 'SFX' ? 'S' : 'P', s: strip === '0' ? '' : strip, a: add === '0' ? '' : add, c: cond ?? '.' });
  }
  const citation: Record<string, number> = {};
  rules.forEach((r, i) => {
    if (r.k === 'S' && r.a === 'नु' && citation[r.f] === undefined) citation[r.f] = i;
  });
  return { rules, citation };
}

const morph = parseAff(read('libreoffice-ne_NP/ne_NP.aff'));
report.affixRules = morph.rules.length;
report.verbFlags = Object.keys(morph.citation);

// ───────────────────────── 2. Hunspell stems ─────────────────────────
const VERB = new Set(Object.keys(morph.citation));
function posFromFlags(flags: string[]): PartOfSpeech | undefined {
  if (flags.some((f) => VERB.has(f))) return 'verb';
  if (flags.includes('14')) return 'adjective';
  if (flags.includes('7') || flags.includes('16') || flags.includes('13')) return 'pronoun';
  if (flags.includes('15') || flags.includes('18')) return 'noun';
  return undefined;
}

type Draft = LexiconEntry & { src: string[] };
const lex = new Map<string, Draft>();
function upsert(lemma: string, patch: Partial<Draft>, src: string) {
  if (!lemma || !isDeva(lemma)) return;
  const cur = lex.get(lemma);
  if (!cur) {
    lex.set(lemma, { lemma, senses: [], status: 'stub', ...patch, src: [src] } as Draft);
    return;
  }
  if (!cur.src.includes(src)) cur.src.push(src);
  if (patch.inflection && !cur.inflection) cur.inflection = patch.inflection;
  if (patch.posHint && !cur.posHint) cur.posHint = patch.posHint;
  if (patch.variants) cur.variants = [...new Set([...(cur.variants ?? []), ...patch.variants])].filter((v) => v !== lemma);
}

let dicCount = 0;
for (const line of read('libreoffice-ne_NP/ne_NP.dic').split('\n').slice(1)) {
  const raw = line.trim();
  if (!raw) continue;
  const [wordPart, flagPart = ''] = raw.split(/\s+/)[0].split('/');
  const stem = fixText(wordPart);
  const flags = flagPart.split(',').map((f) => f.trim()).filter(Boolean);
  if (!isDeva(stem)) continue;
  dicCount++;
  const lemma = flags.length ? citationForm(stem, flags, morph) : stem;
  upsert(lemma, { inflection: flags.length ? { stem, flags } : undefined, posHint: posFromFlags(flags) }, 'mpp-hunspell');
}
report.hunspellStems = dicCount;

// ───────────────────────── 3. Headword list (nepali-stemmer) ─────────────────────────
let hwCount = 0;
for (const line of read('nepali-stemmer/headwords.txt').split('\n')) {
  let w = fixText(line).replace(/[०-९0-9]+$/u, '');
  if (!w || /^-|-$/.test(w)) continue;
  w = w.replace(/[–—-]नु$/u, 'नु').replace(/[–—]/g, '');
  const [lemma, ...variants] = w.split('/').map((x) => fixText(x.replace(/[–—-]नु$/u, 'नु'))).filter(Boolean);
  if (!lemma || [...lemma].length < 2) continue; // bare letters (अ, क) are not useful pages
  hwCount++;
  upsert(lemma, { variants: variants.filter(isDeva), posHint: lemma.endsWith('नु') ? 'verb' : undefined }, 'stemmer-headwords');
}
report.headwordList = hwCount;

// ───────────────────────── 4. Thesaurus (definitions + synonyms) ─────────────────────────
const POS: Record<string, PartOfSpeech> = {
  ना: 'noun', नाा: 'noun', न: 'noun', वि: 'adjective', क्रियो: 'adverb', क्रयो: 'adverb', क्रिुयो: 'adverb', क्रिया: 'verb',
  अक्रि: 'verb', सक्रि: 'verb', कक्रि: 'verb', प्रेक्रि: 'verb', प्रक्रि: 'verb',
  नायो: 'postposition', विबो: 'interjection', संयो: 'conjunction', संवा: 'conjunction', सर्व: 'pronoun',
  उप: 'particle', 'टु.': 'phrase', टु: 'phrase', विभ: 'particle',
};
const unknownPos: Record<string, number> = {};
let thesEntries = 0;
let thesSenses = 0;
{
  const lines = read('libreoffice-ne_NP/th_ne_NP_v2.dat').split('\n');
  let i = 1; // skip encoding line
  while (i < lines.length) {
    const head = lines[i++]?.trim();
    if (!head) continue;
    const [hw, nStr] = head.split('|');
    const n = Number(nStr) || 0;
    const lemma = fixText(hw);
    const senses: Sense[] = [];
    const syns = new Set<string>();
    for (let j = 0; j < n && i < lines.length; j++) {
      const parts = lines[i++].split('|').map(fixText).filter(Boolean);
      // "(ना)|def" normally; some lines lack the pipe: "(ना)def"
      const m0 = /^\(([^)]*)\)\s*(.*)$/u.exec(parts.shift() ?? '');
      const posCode = m0?.[1] ?? '';
      if (m0?.[2]) parts.unshift(m0[2]);
      const codes = posCode.split('/');
      const pos = POS[codes[0]] ?? POS[codes[1] ?? ''];
      if (!pos) unknownPos[posCode] = (unknownPos[posCode] ?? 0) + 1;
      const defs: string[] = [];
      parts.forEach((p, k) => {
        if (k === 0 || /\s/.test(p)) defs.push(p);
        else syns.add(p);
        if (k === 0 && !/\s/.test(p)) syns.add(p);
      });
      if (!defs.length) continue;
      senses.push({
        id: `s${senses.length + 1}`,
        pos: pos ?? 'noun',
        ne: defs.join('; ') + '।',
        ...(codes[0] === 'टु.' || codes[0] === 'टु' ? { register: 'colloquial' as const, usageNote: 'टुक्का (idiomatic use)' } : {}),
      });
    }
    if (!lemma || !isDeva(lemma) || !senses.length) continue;
    thesEntries++;
    thesSenses += senses.length;
    upsert(lemma, {}, 'mpp-thesaurus');
    const e = lex.get(lemma)!;
    e.senses = [...e.senses, ...senses.map((s, k) => ({ ...s, id: `s${e.senses.length + k + 1}` }))];
    e.synonyms = [...new Set([...(e.synonyms ?? []), ...syns])].filter((s) => s !== lemma && isDeva(s));
    e.status = 'reviewed';
    delete e.posHint;
  }
}
report.thesaurusEntries = thesEntries;
report.thesaurusSenses = thesSenses;
report.unknownPosCodes = unknownPos;

// ───────────────────────── 5. Frequency ─────────────────────────
const lp = new Map<string, number>();
for (const line of read('nepalitokenizers/word-logprob.tsv').split('\n')) {
  const [w, s] = line.split('\t');
  if (w && s) lp.set(fixText(w), Number(s));
}
const ranked = [...lex.values()]
  .map((e) => {
    // verbs: corpus has inflected forms more than -नु; use the best of lemma / stem forms
    const cands = [e.lemma, e.inflection?.stem, e.lemma.replace(/नु$/, 'ने'), e.lemma.replace(/नु$/, 'को')].filter(Boolean) as string[];
    const best = Math.max(...cands.map((c) => lp.get(c) ?? -Infinity));
    return { e, best };
  })
  .filter((x) => Number.isFinite(x.best))
  .sort((a, b) => b.best - a.best);
ranked.forEach((x, k) => (x.e.freq = k + 1));
report.withFrequency = ranked.length;

// ───────────────────────── 6. Emit ─────────────────────────
const entries = [...lex.values()].sort((a, b) => (a.freq ?? 1e9) - (b.freq ?? 1e9) || a.lemma.localeCompare(b.lemma, 'ne'));
for (const e of entries) {
  if (!e.variants?.length) delete e.variants;
  if (!e.synonyms?.length) delete e.synonyms;
  if (e.status === 'stub' && !e.posHint) delete e.posHint;
}
report.totalEntries = entries.length;
report.defined = entries.filter((e) => e.senses.length).length;
report.stubs = entries.length - (report.defined as number);

const out = {
  $schema: './entry.schema.json',
  _note: 'GENERATED by scripts/import/import-open-sources.ts — do not edit; put corrections in data/lexicon.curated.json (it overrides this file).',
  sourceRegistry: {
    'mpp-hunspell': { name: 'Nepali spell-check dictionary, Madan Puraskar Pustakalaya (LibreOffice ne_NP)', license: 'LGPL-2.1', url: 'https://github.com/LibreOffice/dictionaries/tree/master/ne_NP' },
    'mpp-thesaurus': { name: 'Nepali thesaurus, Madan Puraskar Pustakalaya (LibreOffice ne_NP)', license: 'LGPL-2.1', url: 'https://github.com/LibreOffice/dictionaries/tree/master/ne_NP' },
    'stemmer-headwords': { name: 'nepali-stemmer headword list', license: 'MIT', url: 'https://github.com/oya163/nepali-stemmer' },
    'nepalitokenizers': { name: 'nepalitokenizers SentencePiece (frequency)', license: 'Apache-2.0', url: 'https://github.com/basnetsoyuj/nepali-tokenizers' },
    'patro-editorial': { name: 'Patro editorial team', license: 'CC BY-SA 4.0' },
  },
  entries,
};
writeFileSync(join(ROOT, 'data/dictionary/lexicon.open.json'), JSON.stringify(out));

const ts = `// GENERATED from data/sources/libreoffice-ne_NP/ne_NP.aff (LGPL-2.1, Madan Puraskar Pustakalaya)
// by scripts/import/import-open-sources.ts — do not edit.
import type { MorphRules } from './morph.ts';
export const NE_MORPH: MorphRules = ${JSON.stringify(morph)};
`;
writeFileSync(join(ROOT, 'src/lib/dictionary-core/morph-rules.generated.ts'), ts);

mkdirSync(join(ROOT, 'dict-build'), { recursive: true });
writeFileSync(join(ROOT, 'dict-build/import-report.json'), JSON.stringify(report, null, 2));
console.log(report);
