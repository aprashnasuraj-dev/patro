/**
 * Learning data (English → Nepali, learning lists, quiz banks, spell lexicon).
 * Always served from the static CDN files — they are generated at build time from
 * the same lexicon, cost nothing to serve, and work offline once cached. This is
 * true for every deployment (static JSON under /data/dict/v1).
 */
import { englishBucket, type Level } from '../../../lib/dictionary-core/index.ts';

export interface EnHit {
  s: string; // slug
  l: string; // lemma
  r: string; // roman
  p: string; // pos
  d: string; // Nepali definition (short)
  g: string; // all English glosses of the sense
  f: number; // Nepali frequency rank
}

export interface NeListItem { s: string; l: string; r: string; p: string; d: string; e: string; x?: [string, string] }
export interface EnListItem { k: string; n: number; m: Array<[lemma: string, roman: string, slug: string, pos: string]> }

export interface QuizBank {
  words: Array<[slug: string, lemma: string, pos: string, en: string, level: Level, ne: string]>;
  syn: Array<[a: string, b: string, pos: string, level: Level, slug: string]>;
  ant: Array<[a: string, b: string, pos: string, level: Level, slug: string]>;
  spell: Array<[correct: string, wrong: string[], level: Level, slug: string]>;
  ukhan: Array<[text: string, meaning: string, kind: string, english: string]>;
}

const BASE = '/data/dict/v1';
const cache = new Map<string, Promise<unknown>>();
function get<T>(path: string): Promise<T | null> {
  const url = `${BASE}/${path}`;
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => {
          cache.delete(url);
          return null;
        }),
    );
  }
  return cache.get(url) as Promise<T | null>;
}

export const enBucket = englishBucket;

export const learnClient = {
  /** English word/phrase → Nepali words, best first. */
  async english(key: string): Promise<EnHit[]> {
    const k = key.trim().toLowerCase().replace(/\s+/g, ' ');
    const b = await get<Record<string, EnHit[]>>(`en/${enBucket(k)}.json`);
    if (!b) return [];
    if (b[k]) return b[k];
    // light stemming for learners: "houses" → house, "walked" → walk, "running" → run
    for (const cand of [k.replace(/ies$/, 'y'), k.replace(/es$/, ''), k.replace(/s$/, ''), k.replace(/ed$/, ''), k.replace(/d$/, ''), k.replace(/ing$/, ''), k.replace(/(.)\1ing$/, '$1')]) {
      if (cand !== k && b[cand]) return b[cand];
    }
    return [];
  },
  /** English prefix suggestions (for the search box). */
  async englishPrefix(prefix: string, limit = 8): Promise<Array<[string, EnHit]>> {
    const p = prefix.trim().toLowerCase();
    if (p.length < 2) return [];
    const b = await get<Record<string, EnHit[]>>(`en/${enBucket(p)}.json`);
    if (!b) return [];
    return Object.entries(b)
      .filter(([k]) => k.startsWith(p))
      .sort((a, b2) => (a[0] === p ? -1 : b2[0] === p ? 1 : a[0].length - b2[0].length || a[1][0].f - b2[1][0].f))
      .slice(0, limit)
      .map(([k, hits]) => [k, hits[0]]);
  },
  topEnglish: () => get<Array<[key: string, rank: number, lemma: string, roman: string, slug: string]>>('en/top.json').then((x) => x ?? []),
  neList: (level: Level) => get<NeListItem[]>(`learn/ne-${level}.json`).then((x) => x ?? []),
  enList: (level: Level) => get<EnListItem[]>(`learn/en-${level}.json`).then((x) => x ?? []),
  quizBank: () => get<QuizBank>('quiz/bank.json'),
  spellWords: () => get<string[]>('spell/words.json').then((x) => x ?? []),
};
