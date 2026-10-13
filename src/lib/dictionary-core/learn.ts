/**
 * Learning engine — runtime-agnostic (browser / Node / Cloudflare Worker), no dependencies.
 *
 *  • englishKeys()      gloss "to walk briskly (fast)" → ["walk briskly", "walk"]  (English → Nepali index)
 *  • levelForRank()     frequency rank → learner level (A1 … C1)
 *  • SM-2 spaced repetition (reviewCard) for flashcards
 *  • spellingVariants() realistic Nepali misspellings for शुद्धाशुद्धि quizzes
 *  • checkSpelling()    spell-check Nepali text against the lexicon + Hunspell morphology
 */

import { cleanLemma, devKey, hasDevanagari } from './normalize.ts';
import { lemmaCandidates, levenshtein } from './search.ts';

// ───────────────────────── English keys ─────────────────────────

const EN_STOP = new Set(['a', 'an', 'the', 'of', 'to', 'be', 'etc', 'something', 'someone', 'one', "one's", 'oneself', 'esp']);

/** Normalise one English gloss into lookup keys (most specific first). */
export function englishKeys(gloss: string): string[] {
  let g = gloss.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  g = g.replace(/\([^)]*\)/g, ' ').replace(/[^a-z' -]/g, ' ').replace(/\s+/g, ' ').trim();
  const isVerb = /^to /.test(g);
  g = g.replace(/^(to|a|an|the) /, '');
  if (!g || g.length < 2) return [];
  const words = g.split(' ').filter(Boolean);
  if (words.length > 4) return [];
  const keys = [words.join(' ')];
  // "walk briskly" also findable as "walk"; "city dweller" also as "dweller"? keep only the head word for 2-word verb phrases
  // 2-word glosses are also findable by their head word: verbs by the first ("walk briskly" → walk),
  // nouns by the last ("snow-capped mountain" → mountain)
  if (words.length === 2) keys.push(isVerb ? words[0] : words[1]);
  return [...new Set(keys.filter((k) => !EN_STOP.has(k)))];
}

/** English index bucket: first two a–z letters (shared by build-learning, the browser and the Worker). */
export const englishBucket = (key: string): string => key.toLowerCase().replace(/[^a-z]/g, '').slice(0, 2).padEnd(2, '_');
export const englishSlug = (key: string) => key.trim().toLowerCase().replace(/\s+/g, '-');
export const englishFromSlug = (slug: string) => decodeURIComponent(slug).toLowerCase().replace(/-/g, ' ').trim();

// ───────────────────────── levels ─────────────────────────

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export const LEVELS: Array<{ id: Level; ne: string; en: string; maxRank: number }> = [
  { id: 'A1', ne: 'सुरुवाती (पहिलो ५००)', en: 'Beginner — first 500', maxRank: 500 },
  { id: 'A2', ne: 'आधारभूत (५००–१५००)', en: 'Elementary — 500–1,500', maxRank: 1500 },
  { id: 'B1', ne: 'मध्यम (१५००–३०००)', en: 'Intermediate — 1,500–3,000', maxRank: 3000 },
  { id: 'B2', ne: 'माथिल्लो मध्यम (३०००–६०००)', en: 'Upper intermediate — 3,000–6,000', maxRank: 6000 },
  { id: 'C1', ne: 'उच्च (६०००+)', en: 'Advanced — 6,000+', maxRank: Infinity },
];

export function levelForRank(rank: number | undefined): Level {
  const r = rank ?? Infinity;
  return (LEVELS.find((l) => r <= l.maxRank) ?? LEVELS[LEVELS.length - 1]).id;
}

// ───────────────────────── spaced repetition (SM-2) ─────────────────────────

export interface SrsCard {
  id: string; // slug or "en:<key>"
  front: string;
  back: string;
  dir: 'ne-en' | 'en-ne';
  ease: number;
  interval: number; // days
  reps: number;
  due: number; // day number (days since epoch)
  added: number;
}

export const today = (now = Date.now()) => Math.floor(now / 86_400_000);

export function newCard(id: string, front: string, back: string, dir: SrsCard['dir'], day = today()): SrsCard {
  return { id, front, back, dir, ease: 2.5, interval: 0, reps: 0, due: day, added: day };
}

/** grade: 0 = again, 3 = hard, 4 = good, 5 = easy */
export function reviewCard(c: SrsCard, grade: 0 | 3 | 4 | 5, day = today()): SrsCard {
  if (grade < 3) return { ...c, reps: 0, interval: 0, due: day, ease: Math.max(1.3, c.ease - 0.2) };
  const reps = c.reps + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(c.interval * c.ease);
  const ease = Math.max(1.3, c.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  return { ...c, reps, interval, ease, due: day + interval };
}

export const dueCards = (cards: SrsCard[], day = today()) => cards.filter((c) => c.due <= day).sort((a, b) => a.due - b.due);

// ───────────────────────── spelling (शुद्धाशुद्धि) ─────────────────────────

const SWAPS: Array<[RegExp, string]> = [
  [/ी/g, 'ि'], [/ि/g, 'ी'], [/ू/g, 'ु'], [/ु/g, 'ू'],
  [/श/g, 'स'], [/स/g, 'श'], [/ष/g, 'श'], [/ब/g, 'व'], [/व/g, 'ब'],
  [/ँ/g, 'ं'], [/ं/g, 'ँ'], [/ण/g, 'न'], [/ङ्/g, 'ं'], [/्य/g, 'य'],
];

/** Plausible misspellings of a word (each differs by ONE common confusion). */
export function spellingVariants(word: string, max = 6): string[] {
  const out = new Set<string>();
  for (const [re, rep] of SWAPS) {
    const hits = [...word.matchAll(re)];
    for (const m of hits) {
      const i = m.index ?? 0;
      const v = word.slice(0, i) + rep + word.slice(i + m[0].length);
      if (v !== word) out.add(v);
      if (out.size >= max * 3) break;
    }
  }
  if (word.endsWith('्')) out.add(word.slice(0, -1));
  return [...out].slice(0, max * 3);
}

export interface SpellToken {
  text: string;
  start: number;
  status: 'ok' | 'unknown' | 'suspect' | 'skip';
  suggestions?: string[];
}

export interface SpellIndex {
  has: (w: string) => boolean;
  /** devKey → correctly spelled words sharing it */
  byKey: Map<string, string[]>;
  /** first character → words (for edit-distance suggestions) */
  byInitial: Map<string, string[]>;
}

export function buildSpellIndex(words: string[]): SpellIndex {
  const set = new Set(words);
  const byKey = new Map<string, string[]>();
  const byInitial = new Map<string, string[]>();
  for (const w of words) {
    const k = devKey(w);
    const a = byKey.get(k);
    a ? a.push(w) : byKey.set(k, [w]);
    const ch = [...w][0];
    const b = byInitial.get(ch);
    b ? b.push(w) : byInitial.set(ch, [w]);
  }
  return { has: (w) => set.has(w), byKey, byInitial };
}

const TOKEN_RE = /[ऀ-ॣॱ-ॿ‌‍]+/g;

/**
 * Check Nepali text. A word is OK if it — or a base form reachable through
 * postposition stripping / Hunspell morphology — is in the lexicon.
 * "suspect" = not found, but a correctly spelled word with the same folded
 * spelling exists (classic ि/ी, श/स mistakes) → strong suggestion.
 */
export function checkSpelling(text: string, idx: SpellIndex, maxSuggestions = 4): SpellToken[] {
  const out: SpellToken[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const raw = m[0];
    const w = cleanLemma(raw);
    const start = m.index ?? 0;
    if ([...w].length < 2 || !hasDevanagari(w)) {
      out.push({ text: raw, start, status: 'skip' });
      continue;
    }
    const cands = lemmaCandidates(w);
    if (cands.some((c) => idx.has(c))) {
      out.push({ text: raw, start, status: 'ok' });
      continue;
    }
    // same folded spelling → the user almost certainly meant this
    const sameKey = new Set<string>();
    for (const c of cands) for (const s of idx.byKey.get(devKey(c)) ?? []) sameKey.add(s);
    if (sameKey.size) {
      out.push({ text: raw, start, status: 'suspect', suggestions: [...sameKey].slice(0, maxSuggestions) });
      continue;
    }
    // edit distance over words with the same initial
    const pool = idx.byInitial.get([...w][0]) ?? [];
    const sug = pool
      .map((p) => [p, levenshtein(p, w, 2)] as const)
      .filter(([, d]) => d <= 2)
      .sort((a, b) => a[1] - b[1])
      .slice(0, maxSuggestions)
      .map(([p]) => p);
    out.push({ text: raw, start, status: 'unknown', ...(sug.length ? { suggestions: sug } : {}) });
  }
  return out;
}

// ───────────────────────── quiz ─────────────────────────

export type QuizKind = 'meaning-en' | 'meaning-ne' | 'synonym' | 'antonym' | 'spelling' | 'ukhan';

export interface QuizItem {
  kind: QuizKind;
  /** prompt shown to the learner */
  q: string;
  /** optional helper line (e.g. Nepali definition) */
  hint?: string;
  options: string[];
  answer: number;
  /** slug to open after answering */
  slug?: string;
  level?: Level;
}

/** Deterministic shuffle so quizzes are reproducible per seed (and SSR-safe). */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
