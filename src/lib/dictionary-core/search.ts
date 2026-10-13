/**
 * In-memory ranking over IndexRow[] — used by the static adapter in the browser
 * and by the prerender script.
 *
 * Tier scores (higher wins; frequency adds up to +60 as a tie-breaker):
 *   exact lemma 1000 · folded-variant 900 · roman 850 · english-exact 800
 *   loose 700 · prefix 500–600 · fuzzy 300–400 · english-prefix 250
 */

import type { IndexRow, SearchHit } from './types.ts';
import { cleanLatin, cleanLemma, devKey, hasDevanagari } from './normalize.ts';
import { looseKey, romanKey } from './phonology.ts';
import { stemCandidates } from './query.ts';
import { analyze } from './morph.ts';
import { NE_MORPH } from './morph-rules.generated.ts';

/** Every base form a Devanagari query could stand for: postposition stripping + Hunspell morphology. */
export function lemmaCandidates(q: string): string[] {
  const out = new Set<string>();
  for (const f of stemCandidates(q)) for (const a of analyze(f, NE_MORPH)) out.add(a);
  return [...out];
}

export function levenshtein(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const A = [...a];
  const B = [...b];
  let prev = Array.from({ length: B.length + 1 }, (_, i) => i);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= B.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[B.length];
}

function freqBonus(freq: number): number {
  if (!freq || freq <= 0) return 0;
  return Math.max(0, 60 - Math.log10(freq) * 12);
}

function fuzzyBudget(len: number): number {
  return len <= 3 ? 0 : len <= 6 ? 1 : 2;
}

export function searchRows(rows: IndexRow[], rawQuery: string, limit = 20): SearchHit[] {
  const q = cleanLemma(rawQuery);
  if (!q) return [];
  const best = new Map<string, SearchHit>();
  const add = (r: IndexRow, score: number, via: SearchHit['via']) => {
    const s = score + freqBonus(r[6]) - (r[10] ? 45 : 0); // defined entries outrank stubs
    const prev = best.get(r[0]);
    if (!prev || prev.score < s) best.set(r[0], { slug: r[0], lemma: r[1], roman: r[2], gloss: r[7], score: s, via });
  };

  if (hasDevanagari(q)) {
    const forms = lemmaCandidates(q);
    const keys = forms.map(devKey);
    const k0 = keys[0];
    const budget = fuzzyBudget([...k0].length);
    for (const r of rows) {
      if (r[1] === q) add(r, 1000, 'exact');
      else if (keys.includes(r[3])) add(r, r[3] === k0 ? 900 : 820, 'variant');
      else if (r[3].startsWith(k0)) add(r, 600 - Math.min(100, ([...r[3]].length - [...k0].length) * 10), 'prefix');
      else if (budget) {
        const d = levenshtein(r[3], k0, budget);
        if (d <= budget) add(r, 400 - d * 50, 'fuzzy');
      }
    }
  } else {
    const rk = romanKey(q);
    const lk = looseKey(q);
    const words = cleanLatin(q).split(' ');
    const budget = fuzzyBudget(rk.length);
    for (const r of rows) {
      if (r[4] === rk) add(r, 850, 'roman');
      else if (r[5] === lk) add(r, 700, 'loose');
      else if (rk.length >= 2 && r[4].startsWith(rk)) add(r, 600 - Math.min(100, (r[4].length - rk.length) * 10), 'prefix');
      else if (budget) {
        const d = levenshtein(r[4], rk, budget);
        if (d <= budget) add(r, 400 - d * 50, 'fuzzy');
      }
      // English gloss match (gloss column is "house, home; dwelling")
      if (r[7]) {
        const glosses = r[7].toLowerCase().split(/[;,]\s*/);
        const phrase = words.join(' ');
        if (glosses.includes(phrase)) add(r, 800, 'english');
        else if (phrase.length >= 3 && glosses.some((g) => g.startsWith(phrase))) add(r, 250, 'english');
      }
    }
  }

  return [...best.values()].sort((a, b) => b.score - a.score || a.lemma.localeCompare(b.lemma, 'ne')).slice(0, limit);
}
