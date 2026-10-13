/**
 * Query understanding: turn what people actually type into a clean lookup term.
 *   "घरको अर्थ"               → { term: "घर", intent: "meaning" }
 *   "ghar meaning in nepali"  → { term: "ghar", intent: "meaning" }
 *   "words that rhyme with maya" → { term: "maya", intent: "rhyme" }
 *   "सुखको विपरीत शब्द"        → { term: "सुख", intent: "antonym" }
 */

import { cleanLemma, hasDevanagari } from './normalize.ts';

export type QueryIntent = 'meaning' | 'synonym' | 'antonym' | 'rhyme' | 'proverb' | 'any';

export interface ParsedQuery {
  term: string;
  intent: QueryIntent;
  script: 'deva' | 'latin';
}

const DEVA_PATTERNS: Array<[RegExp, QueryIntent]> = [
  [/\s*(को|का|की)?\s*(अर्थ|मतलब|अर्थ\s*के\s*हो)\s*\??$/u, 'meaning'],
  [/\s*(को|का)?\s*(पर्यायवाची|समानार्थी)(\s*शब्द)?$/u, 'synonym'],
  [/\s*(को|का)?\s*(विपरीतार्थी|विपरीत|विलोम)(\s*शब्द)?$/u, 'antonym'],
  [/\s*(सँग|संग)?\s*(मिल्ने|अनुप्रास|तुक)(\s*मिल्ने)?(\s*शब्द(हरू)?)?$/u, 'rhyme'],
  [/\s*(को)?\s*(उखान|टुक्का)$/u, 'proverb'],
];

const LATIN_PATTERNS: Array<[RegExp, QueryIntent]> = [
  [/^(words?\s+that\s+)?rhym(e|es|ing)\s+(with\s+)?/i, 'rhyme'],
  [/\s+rhym(e|es|ing)(\s+words?)?$/i, 'rhyme'],
  [/^(what\s+is\s+the\s+)?(meaning\s+of\s+)/i, 'meaning'],
  [/\s+(ko\s+)?(artha|arth|matlab)$/i, 'meaning'],
  [/\s+meaning(\s+in\s+(nepali|english))?$/i, 'meaning'],
  [/\s+in\s+(nepali|english)$/i, 'meaning'],
  [/\s+(synonyms?|paryayabachi|samanarthi)$/i, 'synonym'],
  [/\s+(antonyms?|opposite|biparit|bilom)$/i, 'antonym'],
];

/** Common suffixes/postpositions to strip when a full inflected form is typed. */
const DEVA_SUFFIXES = [
  'हरूलाई', 'हरूको', 'हरूमा', 'हरूले', 'हरूबाट', 'हरू',
  'लाई', 'बाट', 'देखि', 'सम्म', 'सँग', 'संग', 'भित्र', 'माथि', 'तिर',
  'को', 'का', 'की', 'मा', 'ले',
];

export function parseQuery(raw: string): ParsedQuery {
  let q = cleanLemma(raw).replace(/[?？]+$/g, '');
  let intent: QueryIntent = 'any';
  const script = hasDevanagari(q) ? 'deva' : 'latin';
  const patterns = script === 'deva' ? DEVA_PATTERNS : LATIN_PATTERNS;
  for (const [re, i] of patterns) {
    if (re.test(q)) {
      q = q.replace(re, '').trim();
      if (intent === 'any') intent = i;
    }
  }
  return { term: q, intent, script };
}

/**
 * Candidate base forms for an inflected Devanagari token, longest-strip first.
 * Returns the input itself first. Deliberately conservative (no verb morphology).
 */
export function stemCandidates(word: string): string[] {
  const w = cleanLemma(word);
  const out = [w];
  // Two passes handle stacked suffixes: पानीमाथिको → पानीमाथि → पानी
  for (let i = 0; i < out.length && i < 8; i++) {
    const cur = out[i];
    for (const suf of DEVA_SUFFIXES) {
      if (cur.length > suf.length + 1 && cur.endsWith(suf)) {
        const base = cur.slice(0, -suf.length);
        if (!out.includes(base)) out.push(base);
      }
    }
  }
  return out;
}
