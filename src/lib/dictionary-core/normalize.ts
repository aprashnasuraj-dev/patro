/**
 * Devanagari text normalization.
 *
 * Two levels:
 *   cleanLemma()  – what we STORE and SHOW. Canonical Unicode, nothing folded.
 *   devKey()      – what we MATCH on. Aggressively folds spelling variation that
 *                   Nepali writers use interchangeably (ि/ी, ु/ू, श/ष/स, ब/व, ँ/ं,
 *                   nasal conjunct vs anusvara, visarga, trailing halanta…).
 *
 * Never show a devKey to users — it is intentionally "wrong" Nepali.
 */

const ZERO_WIDTH = /[​-‍⁠﻿]/g; // ZWSP, ZWNJ, ZWJ, WJ, BOM
const NUKTA = /़/g;
const DANDA_PUNCT = /[।॥॰.,;:!?'"“”‘’()[\]{}<>\-–—_/\\|]+/g;

export const DEVANAGARI_RE = /[ऀ-ॿ]/;

export function hasDevanagari(s: string): boolean {
  return DEVANAGARI_RE.test(s);
}

/** Canonical stored form of a headword. */
export function cleanLemma(input: string): string {
  return input
    .normalize('NFC')
    .replace(ZERO_WIDTH, '')
    .replace(/[।॥]+$/g, '') // trailing danda
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Folded Devanagari matching key. Deterministic and idempotent:
 * devKey(devKey(x)) === devKey(x).
 */
export function devKey(input: string): string {
  let s = input.normalize('NFD'); // splits क़ → क + ़ so the nukta can be dropped
  s = s.replace(ZERO_WIDTH, '').replace(NUKTA, '').normalize('NFC');
  s = s.replace(DANDA_PUNCT, ' ');

  s = s
    // long ↔ short vowels (Nepali spelling is famously inconsistent here)
    .replace(/ी/g, 'ि') // ी → ि
    .replace(/ू/g, 'ु') // ू → ु
    .replace(/ई/g, 'इ') // ई → इ
    .replace(/ऊ/g, 'उ') // ऊ → उ
    // ऋ / ृ → रि
    .replace(/ऋ/g, 'रि')
    .replace(/ृ/g, '्रि')
    // sibilants and ब/व
    .replace(/[शष]/g, 'स') // श ष → स
    .replace(/व/g, 'ब') // व → ब
    // candra-o (ॉ) → ो
    .replace(/ॉ/g, 'ो')
    // nasalisation: chandrabindu → anusvara, then nasal consonant + halanta + consonant → anusvara
    .replace(/ँ/g, 'ं')
    .replace(/[ङञणनम]्(?=[क-ह])/g, 'ं')
    // visarga dropped (दुःख ~ दुख)
    .replace(/ः/g, '');

  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/्$/, '')) // trailing halanta (छन् ~ छन)
    .join(' ');
}

/** Latin-side cleanup shared by all romanized keys. */
export function cleanLatin(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (ā → a, ṭ → t)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Devanagari digits ↔ ASCII, handy for numerals and BS dates. */
export function devanagariDigitsToAscii(s: string): string {
  return s.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966));
}
