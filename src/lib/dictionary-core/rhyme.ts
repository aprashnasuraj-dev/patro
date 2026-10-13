import type { PartOfSpeech, RhymeHit, RhymeKeys } from './types.ts';

/** Row stored in rhyme buckets (static) or returned by dict_rhymes (SQL). */
export interface RhymeRow {
  slug: string;
  lemma: string;
  roman: string;
  syllables: number;
  pos?: PartOfSpeech;
  freq?: number;
  rhyme: RhymeKeys;
  /** 1 = has a definition (ranked before stubs) */
  d?: 1;
}

/** Compact tuple used in static rhyme buckets (≈3× smaller than objects). */
export type PackedRhyme = [lemma: string, slug: string | 0, roman: string, syllables: number, pos: string, freq: number, double: string, single: string, slant: string, vowel: string, defined: 0 | 1];

export function packRhyme(r: RhymeRow): PackedRhyme {
  return [r.lemma, r.slug === r.lemma ? 0 : r.slug, r.roman, r.syllables, r.pos ?? '', r.freq ?? 0, r.rhyme.double, r.rhyme.single, r.rhyme.slant, r.rhyme.vowel, r.d ? 1 : 0];
}

export function unpackRhyme(p: PackedRhyme): RhymeRow {
  return {
    lemma: p[0], slug: p[1] || p[0], roman: p[2], syllables: p[3], ...(p[4] ? { pos: p[4] as PartOfSpeech } : {}),
    ...(p[5] ? { freq: p[5] } : {}), rhyme: { double: p[6], single: p[7], slant: p[8], vowel: p[9] }, ...(p[10] ? { d: 1 as const } : {}),
  };
}

export interface RhymeFilter {
  syllables?: number;
  pos?: PartOfSpeech;
  /** Minimum strength to include. Default 'slant'. */
  min?: RhymeHit['strength'];
  limit?: number;
}

const ORDER: RhymeHit['strength'][] = ['double', 'single', 'slant', 'vowel'];

const lastWord = (s: string) => s.split(/[\s-]+/).pop() ?? s;

export function rhymeStrength(a: RhymeKeys, b: RhymeKeys): RhymeHit['strength'] | null {
  if (a.double && a.double === b.double) return 'double';
  if (a.single && a.single === b.single) return 'single';
  if (a.slant && a.slant === b.slant) return 'slant';
  if (a.vowel && a.vowel === b.vowel) return 'vowel';
  return null;
}

/** Rank candidate rows as rhymes for `target`. Groups are returned strongest first. */
export function findRhymes(target: RhymeRow, candidates: RhymeRow[], f: RhymeFilter = {}): RhymeHit[] {
  const minIdx = ORDER.indexOf(f.min ?? 'slant');
  const seen = new Set<string>([target.slug]);
  const hits: Array<RhymeHit & { _f: number; _d: number }> = [];
  for (const c of candidates) {
    if (seen.has(c.slug)) continue;
    // identical last word ("मन" vs "आफ्नो मन") is a repeat, not a rhyme
    if (lastWord(c.lemma) === lastWord(target.lemma)) continue;
    const s = rhymeStrength(target.rhyme, c.rhyme);
    if (!s || ORDER.indexOf(s) > minIdx) continue;
    if (f.syllables && c.syllables !== f.syllables) continue;
    if (f.pos && c.pos !== f.pos) continue;
    seen.add(c.slug);
    hits.push({ slug: c.slug, lemma: c.lemma, roman: c.roman, syllables: c.syllables, pos: c.pos, strength: s, ...(c.d ? { defined: true } : {}), _f: c.freq ?? 1e9, _d: c.d ? 0 : 1 });
  }
  hits.sort((a, b) => ORDER.indexOf(a.strength) - ORDER.indexOf(b.strength) || a._d - b._d || a._f - b._f);
  return hits.slice(0, f.limit ?? 200).map(({ _f, _d, ...h }) => h);
}

/** Group hits for display: { double: [...], single: [...], ... } */
export function groupRhymes(hits: RhymeHit[]): Record<RhymeHit['strength'], RhymeHit[]> {
  const g: Record<RhymeHit['strength'], RhymeHit[]> = { double: [], single: [], slant: [], vowel: [] };
  for (const h of hits) g[h.strength].push(h);
  return g;
}

export const RHYME_LABELS: Record<RhymeHit['strength'], { ne: string; en: string }> = {
  double: { ne: 'पूर्ण अनुप्रास (दुई अक्षर)', en: 'Multi-syllable rhyme' },
  single: { ne: 'अन्त्यानुप्रास', en: 'End rhyme' },
  slant: { ne: 'निकट अनुप्रास', en: 'Near rhyme' },
  vowel: { ne: 'स्वर मिल्ने', en: 'Vowel rhyme' },
};
