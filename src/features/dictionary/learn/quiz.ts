/**
 * Builds multiple-choice questions from the compact quiz bank (quiz/bank.json).
 * Pure functions — unit-testable in Node.
 */
import { seededShuffle, type Level, type QuizItem, type QuizKind } from '../../../lib/dictionary-core/index.ts';
import type { QuizBank } from '../client/learnClient.ts';

export const QUIZ_MODES: Array<{ id: QuizKind; ne: string; en: string; exam?: string }> = [
  { id: 'synonym', ne: 'पर्यायवाची शब्द', en: 'Synonyms', exam: 'SEE · लोकसेवा' },
  { id: 'antonym', ne: 'विपरीतार्थी शब्द', en: 'Antonyms', exam: 'SEE · लोकसेवा' },
  { id: 'spelling', ne: 'शुद्धाशुद्धि (हिज्जे)', en: 'Correct spelling', exam: 'SEE · लोकसेवा' },
  { id: 'ukhan', ne: 'उखान टुक्काको अर्थ', en: 'Proverbs & idioms', exam: 'SEE · लोकसेवा' },
  { id: 'meaning-en', ne: 'नेपाली → English', en: 'Nepali → English' },
  { id: 'meaning-ne', ne: 'English → नेपाली', en: 'English → Nepali' },
];

const LEVEL_ORDER: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
const atOrBelow = (lv: Level, max: Level | 'all') => max === 'all' || LEVEL_ORDER.indexOf(lv) <= LEVEL_ORDER.indexOf(max);

function pickDistinct<T>(pool: T[], n: number, seed: number, not: (x: T) => boolean): T[] {
  const out: T[] = [];
  for (const x of seededShuffle(pool, seed)) {
    if (out.length >= n) break;
    if (!not(x) && !out.includes(x)) out.push(x);
  }
  return out;
}

function mcq(kind: QuizKind, q: string, correct: string, wrong: string[], seed: number, extra: Partial<QuizItem> = {}): QuizItem | null {
  const opts = [...new Set([correct, ...wrong])];
  if (opts.length < 3) return null;
  const shuffled = seededShuffle(opts.slice(0, 4), seed);
  return { kind, q, options: shuffled, answer: shuffled.indexOf(correct), ...extra };
}

export function buildQuiz(bank: QuizBank, kind: QuizKind, level: Level | 'all', count: number, seed: number): QuizItem[] {
  const words = bank.words.filter((w) => atOrBelow(w[4], level));
  const allWords = words.length >= 20 ? words : bank.words;
  const out: QuizItem[] = [];
  let s = seed;
  const next = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0);

  if (kind === 'meaning-en' || kind === 'meaning-ne') {
    for (const w of seededShuffle(allWords, next())) {
      if (out.length >= count) break;
      const sameP = allWords.filter((x) => x[2] === w[2] && x[3] !== w[3]);
      const pool = sameP.length >= 6 ? sameP : allWords;
      if (kind === 'meaning-en') {
        const wrong = pickDistinct(pool.map((x) => x[3]), 3, next(), (x) => x === w[3]);
        const it = mcq(kind, w[1], w[3], wrong, next(), { hint: undefined, slug: w[0], level: w[4] });
        if (it) out.push(it);
      } else {
        const wrong = pickDistinct(pool.map((x) => x[1]), 3, next(), (x) => x === w[1]);
        const it = mcq(kind, w[3], w[1], wrong, next(), { hint: w[2], slug: w[0], level: w[4] });
        if (it) out.push(it);
      }
    }
  } else if (kind === 'synonym' || kind === 'antonym') {
    const pairs = (kind === 'synonym' ? bank.syn : bank.ant).filter((p) => atOrBelow(p[3], level));
    const src = pairs.length >= 10 ? pairs : kind === 'synonym' ? bank.syn : bank.ant;
    const related = new Map<string, Set<string>>();
    for (const [a, b] of [...bank.syn, ...bank.ant]) {
      (related.get(a) ?? related.set(a, new Set()).get(a)!).add(b);
      (related.get(b) ?? related.set(b, new Set()).get(b)!).add(a);
    }
    const seen = new Set<string>();
    for (const [a, b, pos, lv, slug] of seededShuffle(src, next())) {
      if (out.length >= count) break;
      if (seen.has(a)) continue;
      seen.add(a);
      const pool = allWords.filter((x) => x[2] === pos).map((x) => x[1]);
      const wrong = pickDistinct(pool.length > 10 ? pool : allWords.map((x) => x[1]), 3, next(), (x) => x === a || x === b || !!related.get(a)?.has(x));
      const it = mcq(kind, a, b, wrong, next(), { slug, level: lv, hint: kind === 'synonym' ? 'समान अर्थ भएको शब्द छान्नुहोस्' : 'उल्टो अर्थ भएको शब्द छान्नुहोस्' });
      if (it) out.push(it);
    }
  } else if (kind === 'spelling') {
    const items = bank.spell.filter((x) => atOrBelow(x[2], level));
    for (const [ok, wrong, lv, slug] of seededShuffle(items.length >= 10 ? items : bank.spell, next())) {
      if (out.length >= count) break;
      const it = mcq(kind, 'कुन हिज्जे शुद्ध छ?', ok, wrong.slice(0, 3), next(), { slug, level: lv });
      if (it) out.push(it);
    }
  } else if (kind === 'ukhan') {
    for (const [text, meaning] of seededShuffle(bank.ukhan, next())) {
      if (out.length >= count) break;
      const wrong = pickDistinct(bank.ukhan.map((u) => u[1]), 3, next(), (x) => x === meaning);
      const it = mcq(kind, text, meaning, wrong, next(), { hint: 'यो उखान/टुक्काको अर्थ के हो?' });
      if (it) out.push(it);
    }
  }
  return out;
}
