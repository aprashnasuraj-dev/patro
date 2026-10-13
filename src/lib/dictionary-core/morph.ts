/**
 * Nepali inflection engine driven by Hunspell affix rules
 * (LibreOffice ne_NP by Madan Puraskar Pustakalaya, LGPL-2.1).
 *
 *  • analyze("गरेको")  → candidate lemmas ["गरेको", "गर्नु", …]   (search: inflected form → headword)
 *  • generate("गर्", ["1"]) → ["गर्नु", "गर्छ", "गरेको", …]         (word page: रूपावली / forms)
 *
 * Rules are compiled once from ne_NP.aff by scripts/import/import-open-sources.ts
 * into morph-rules.generated.ts, so the runtime needs no .aff parser.
 */

export interface AffixRule {
  /** Hunspell flag, e.g. "1", "15" */
  f: string;
  /** 'S' suffix | 'P' prefix */
  k: 'S' | 'P';
  /** characters removed from the stem ('' for none) */
  s: string;
  /** characters added */
  a: string;
  /** condition (hunspell regex subset) the stem must end with (S) / start with (P) */
  c: string;
}

export interface MorphRules {
  rules: AffixRule[];
  /** flags whose citation form is stem + नु (verbs) → index of that rule */
  citation: Record<string, number>;
}

const condCache = new Map<string, RegExp>();
function condRe(c: string, k: 'S' | 'P'): RegExp {
  const key = k + c;
  let re = condCache.get(key);
  if (!re) {
    const body = c === '.' || c === '' ? '' : c;
    re = new RegExp(k === 'S' ? `${body}$` : `^${body}`, 'u');
    condCache.set(key, re);
  }
  return re;
}

function applyRule(stem: string, r: AffixRule): string | null {
  if (!condRe(r.c, r.k).test(stem)) return null;
  if (r.k === 'S') {
    if (r.s && !stem.endsWith(r.s)) return null;
    return (r.s ? stem.slice(0, -r.s.length) : stem) + r.a;
  }
  if (r.s && !stem.startsWith(r.s)) return null;
  return r.a + (r.s ? stem.slice(r.s.length) : stem);
}

/** Citation (dictionary) form for a stem + its flags: verbs get -नु, others unchanged. */
export function citationForm(stem: string, flags: string[], m: MorphRules): string {
  for (const f of flags) {
    const i = m.citation[f];
    if (i !== undefined) {
      const out = applyRule(stem, m.rules[i]);
      if (out) return out;
    }
  }
  return stem;
}

/** All inflected forms of a stem (deduplicated, stable order). */
export function generateForms(stem: string, flags: string[], m: MorphRules, limit = 80): string[] {
  const out = new Set<string>();
  for (const r of m.rules) {
    if (r.k !== 'S' || !flags.includes(r.f)) continue;
    const w = applyRule(stem, r);
    if (w && w !== stem) out.add(w);
    if (out.size >= limit) break;
  }
  // negative forms via prefix न (flag 17) for verbs
  if (flags.some((f) => m.citation[f] !== undefined)) {
    const cit = citationForm(stem, flags, m);
    for (const r of m.rules) if (r.k === 'P') {
      const w = applyRule(cit, r);
      if (w) out.add(w);
    }
  }
  return [...out];
}

/**
 * Reverse analysis: every lemma this surface form could come from.
 * Returns the form itself first. Callers keep only candidates that exist in the lexicon.
 */
export function analyze(word: string, m: MorphRules): string[] {
  const out = new Set<string>([word]);
  const surfaces = [word];
  // negation prefix (नगर्नु → गर्नु)
  for (const r of m.rules) if (r.k === 'P' && r.a && word.startsWith(r.a) && word.length > r.a.length + 1) surfaces.push(r.s + word.slice(r.a.length));

  for (const w of surfaces) {
    out.add(w);
    for (const r of m.rules) {
      if (r.k !== 'S') continue;
      if (r.a && !w.endsWith(r.a)) continue;
      const base = r.a ? w.slice(0, -r.a.length) : w;
      if (!base) continue;
      const stem = base + r.s;
      if (!condRe(r.c, 'S').test(stem)) continue;
      out.add(stem);
      out.add(citationForm(stem, [r.f], m));
    }
  }
  return [...out];
}
