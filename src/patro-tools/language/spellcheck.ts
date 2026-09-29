/**
 * Nepali spell checker — 3 layers, cheapest first:
 *
 *  1. normalize()        Unicode clean-up (runs on every keystroke, no dictionary)
 *  2. checkSpelling()    dictionary + Nepali confusion sets (ि/ी, ु/ू, ब/व, स/श/ष …)
 *                        + postposition stripping (घरमा → घर) — runs offline in the browser
 *  3. /api/nepali/grammar  optional LLM pass for grammar & style (see app-routes/)
 *
 * Dictionary: build a frequency list from a large clean Nepali corpus
 * (news archives you have rights to, government gazettes, Wikipedia dumps),
 * then have an editor review the top ~50k. Ship it as a compressed JSON
 * (~400 KB gz) cached by the service worker. Seed from the LibreOffice/Hunspell
 * ne_NP dictionary if its licence fits your use.
 */

// ---------------------------------------------------------------------------
// 1. Normalization
// ---------------------------------------------------------------------------
const ZWJ = '\u200D';
const ZWNJ = '\u200C';

export interface NormalizeChange { from: string; to: string; reason: string }

export function normalize(text: string): { text: string; changes: NormalizeChange[] } {
  const changes: NormalizeChange[] = [];
  const rule = (re: RegExp, to: string, reason: string) => {
    text = text.replace(re, (m) => { if (m !== to) changes.push({ from: m, to, reason }); return to; });
  };
  text = text.normalize('NFC');
  // keep र्\u200D (eyelash ra = र + ् + ZWJ) — drop every other stray ZWJ / ZWNJ
  rule(new RegExp(`(?<!र्)${ZWJ}`, 'g'), '', 'अनावश्यक ZWJ');
  rule(new RegExp(ZWNJ, 'g'), '', 'अनावश्यक ZWNJ');
  // doubled matras: कीी → की
  text = text.replace(/([\u093E-\u094C])\1+/g, (m, c: string) => { changes.push({ from: m, to: c, reason: 'दोहोरिएको मात्रा' }); return c; });
  // double danda typed as two single dandas
  rule(/।।/g, '॥', 'दोहोरो दण्ड');
  // pipe or full stop after Devanagari used as danda
  text = text.replace(/([ऀ-ॿ])\s*\|/g, (_m, c) => { changes.push({ from: '|', to: '।', reason: 'दण्ड' }); return `${c}।`; });
  // space before danda
  rule(/\s+।/g, '।', 'दण्डअघि खाली ठाउँ');
  return { text, changes };
}

// ---------------------------------------------------------------------------
// 2. Dictionary + confusion-set suggestions
// ---------------------------------------------------------------------------
export interface Dictionary {
  has(word: string): boolean;
  /** higher = more common; 0 if unknown */
  freq(word: string): number;
}

export function createDictionary(words: Iterable<string> | Map<string, number>): Dictionary {
  const map = words instanceof Map ? words : new Map([...words].map((w, i) => [w.normalize('NFC'), 1_000_000 - i]));
  return { has: (w) => map.has(w), freq: (w) => map.get(w) ?? 0 };
}

/** Common attached postpositions / particles, longest first. */
const SUFFIXES = [
  'हरूलाई', 'हरूबाट', 'हरूको', 'हरूका', 'हरूकी', 'हरूमा', 'हरूले', 'हरू',
  'भन्दा', 'देखि', 'सम्म', 'बाट', 'लाई', 'तिर', 'चाहिँ', 'पनि',
  'को', 'का', 'की', 'मा', 'ले', 'नै', 'त',
];

export function stripSuffix(word: string): { stem: string; suffix: string } {
  for (const s of SUFFIXES) {
    if (word.length > s.length + 1 && word.endsWith(s)) return { stem: word.slice(0, -s.length), suffix: s };
  }
  return { stem: word, suffix: '' };
}

/** Frequent real-world misspellings → correct form (curate & grow this list from user corrections). */
export const COMMON_MISTAKES: Record<string, string> = {
  'राश्ट्र': 'राष्ट्र',
  'राश्ट्रिय': 'राष्ट्रिय',
  'अन्तराष्ट्रिय': 'अन्तर्राष्ट्रिय',
  'बिद्यालय': 'विद्यालय',
  'विध्यालय': 'विद्यालय',
  'उज्वल': 'उज्ज्वल',
  'अत्याधिक': 'अत्यधिक',
  'आर्शिवाद': 'आशीर्वाद',
  'आशिर्वाद': 'आशीर्वाद',
  'श्रीमति': 'श्रीमती',
  'पुज्य': 'पूज्य',
  'प्रतिक्षा': 'प्रतीक्षा',
  'परिक्षा': 'परीक्षा',
  'उपरोक्त': 'उपर्युक्त',
  'ज्योतीष': 'ज्योतिष',
  'दृष्टी': 'दृष्टि',
  'निति': 'नीति',
  'कृती': 'कृति',
  'शुभकामाना': 'शुभकामना',
  'धन्यबाद': 'धन्यवाद',
  'स्वास्थ': 'स्वास्थ्य',
  'महत्व': 'महत्त्व',
};

const CONFUSIONS: string[][] = [
  ['ि', 'ी'], ['ु', 'ू'], ['ब', 'व'], ['स', 'श', 'ष'], ['ं', 'ँ'], ['न', 'ण'],
  ['ज्ञ', 'ग्य'], ['क्ष', 'छ'], ['द्य', 'ध्य'], ['त्त', 'त'], ['ट', 'त'],
];

function variants(word: string): Set<string> {
  const out = new Set<string>();
  for (const group of CONFUSIONS) {
    for (const from of group) {
      let idx = word.indexOf(from);
      while (idx !== -1) {
        for (const to of group) {
          if (to !== from) out.add(word.slice(0, idx) + to + word.slice(idx + from.length));
        }
        idx = word.indexOf(from, idx + 1);
      }
    }
  }
  return out;
}

export interface SpellIssue {
  index: number; // char offset in normalized text
  word: string;
  suggestions: string[];
  kind: 'common_mistake' | 'unknown';
}

const WORD_RE = /[ऀ-ॣॱ-ॿ\u200D]+/g;

export function suggest(word: string, dict: Dictionary, max = 5): string[] {
  const { stem, suffix } = stripSuffix(word);
  const scored = new Map<string, number>();
  const consider = (cand: string, bonus = 0) => {
    const { stem: cs } = stripSuffix(cand);
    const f = Math.max(dict.freq(cand), dict.freq(cs));
    if (f > 0 || bonus > 0) scored.set(cand, Math.max(scored.get(cand) ?? 0, f + bonus));
  };
  const fixedStem = COMMON_MISTAKES[stem];
  if (fixedStem) consider(fixedStem + suffix, 1e9);
  const level1 = variants(stem);
  for (const v of level1) consider(v + suffix);
  if (scored.size === 0) {
    // two edits (e.g. both ि→ी and ु→ू) — still cheap for short words
    for (const v of level1) for (const v2 of variants(v)) consider(v2 + suffix);
  }
  return [...scored.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([w]) => w);
}

export function checkSpelling(text: string, dict: Dictionary): { text: string; issues: SpellIssue[] } {
  const norm = normalize(text).text;
  const issues: SpellIssue[] = [];
  for (const m of norm.matchAll(WORD_RE)) {
    const word = m[0];
    const { stem } = stripSuffix(word);
    if (COMMON_MISTAKES[stem] || COMMON_MISTAKES[word]) {
      issues.push({ index: m.index!, word, suggestions: suggest(word, dict), kind: 'common_mistake' });
      continue;
    }
    if (dict.has(word) || dict.has(stem)) continue;
    if (word.length < 2) continue;
    issues.push({ index: m.index!, word, suggestions: suggest(word, dict), kind: 'unknown' });
  }
  return { text: norm, issues };
}

/** Apply first suggestion for every common_mistake (safe auto-fix). */
export function autoFix(text: string, dict: Dictionary): string {
  const { text: norm, issues } = checkSpelling(text, dict);
  let out = norm;
  for (const i of [...issues].reverse()) {
    if (i.kind === 'common_mistake' && i.suggestions[0]) {
      out = out.slice(0, i.index) + i.suggestions[0] + out.slice(i.index + i.word.length);
    }
  }
  return out;
}
