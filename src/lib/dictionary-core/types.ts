/**
 * Nepali dictionary — shared types.
 *
 * This folder (src/lib/dictionary-core) is runtime-agnostic: it runs unchanged in
 * the browser (Vite), in Node 22+ (build/prerender scripts) and in the
 * (Cloudflare Worker). Rules that keep it that way:
 *   - no imports outside this folder
 *   - relative imports always end in `.ts`
 *   - no enums / namespaces / parameter properties (Node type-stripping can't handle them)
 */

/** Part of speech (व्याकरणिक कोटि). Keys are stable ASCII; labels live in POS_LABELS. */
export type PartOfSpeech =
  | 'noun' // नाम
  | 'pronoun' // सर्वनाम
  | 'adjective' // विशेषण
  | 'verb' // क्रिया
  | 'adverb' // क्रियाविशेषण
  | 'postposition' // नामयोगी
  | 'conjunction' // संयोजक
  | 'interjection' // विस्मयादिबोधक
  | 'particle' // निपात
  | 'numeral' // सङ्ख्यावाचक
  | 'phrase';

export const POS_LABELS: Record<PartOfSpeech, { ne: string; en: string }> = {
  noun: { ne: 'नाम', en: 'noun' },
  pronoun: { ne: 'सर्वनाम', en: 'pronoun' },
  adjective: { ne: 'विशेषण', en: 'adjective' },
  verb: { ne: 'क्रिया', en: 'verb' },
  adverb: { ne: 'क्रियाविशेषण', en: 'adverb' },
  postposition: { ne: 'नामयोगी', en: 'postposition' },
  conjunction: { ne: 'संयोजक', en: 'conjunction' },
  interjection: { ne: 'विस्मयादिबोधक', en: 'interjection' },
  particle: { ne: 'निपात', en: 'particle' },
  numeral: { ne: 'सङ्ख्यावाचक', en: 'numeral' },
  phrase: { ne: 'पदावली', en: 'phrase' },
};

/** Traditional Nepali word-origin classes (शब्दस्रोत). */
export type Origin = 'tatsam' | 'tadbhav' | 'aagantuk' | 'deshaj' | 'unknown';

export const ORIGIN_LABELS: Record<Origin, { ne: string; en: string }> = {
  tatsam: { ne: 'तत्सम', en: 'Sanskrit (unchanged)' },
  tadbhav: { ne: 'तद्भव', en: 'derived from Sanskrit' },
  aagantuk: { ne: 'आगन्तुक', en: 'loanword' },
  deshaj: { ne: 'झर्रा / देशज', en: 'native Nepali' },
  unknown: { ne: 'अज्ञात', en: 'unknown' },
};

export type Register = 'neutral' | 'literary' | 'colloquial' | 'honorific' | 'archaic' | 'slang' | 'technical';

export const REGISTER_LABELS: Record<Register, string> = {
  neutral: 'सामान्य',
  literary: 'साहित्यिक',
  colloquial: 'बोलीचालीमा',
  honorific: 'आदरार्थी',
  archaic: 'पुरानो प्रयोग',
  slang: 'अनौपचारिक',
  technical: 'प्राविधिक',
};

export interface Example {
  ne: string;
  en?: string;
  /** Where the sentence came from — required for anything not written in-house. */
  source?: string;
}

export interface Sense {
  /** Stable within the entry, e.g. "s1". Never renumber once published (deep links use it). */
  id: string;
  pos: PartOfSpeech;
  /** Definition in Nepali (primary). */
  ne: string;
  /** Short English gloss(es). */
  en?: string[];
  register?: Register;
  /** Subject domain: "botany", "law", "astrology"… */
  domain?: string;
  examples?: Example[];
  usageNote?: string;
}

export interface Etymology {
  origin: Origin;
  /** Source form, e.g. Sanskrit "गृह" or Persian "khushi". */
  from?: string;
  /** Source language, e.g. "sa", "fa", "en", "hi". */
  lang?: string;
  note?: string;
}

export interface SourceRef {
  name: string;
  license: string;
  url?: string;
}

/**
 * stub      – headword known (spell-checker / word list) but no definition yet:
 *             searchable, shows forms + rhymes, NOT prerendered, noindex.
 * draft     – has content awaiting review (AI draft, import) — hidden.
 * reviewed / published – live.
 */
export type EntryStatus = 'stub' | 'draft' | 'reviewed' | 'published';

/** The canonical authoring format (data/*.json and the `dict_entries` table). */
export interface LexiconEntry {
  /** Headword in Devanagari, NFC. Also the URL slug. */
  lemma: string;
  /** Homograph number when two headwords share a spelling (URL becomes /tool/nepalidictionary/लेख-2). */
  homograph?: number;
  /** Preferred romanization for display ("ghar"). If omitted it is generated. */
  roman?: string;
  /** Extra romanized spellings people actually type ("ghaar"). */
  romanAlt?: string[];
  /** Accepted spelling variants in Devanagari ("शहर" for "सहर"). */
  variants?: string[];
  senses: Sense[];
  /** POS when there are no senses yet (from Hunspell flags). */
  posHint?: PartOfSpeech;
  /** Hunspell stem + flags → inflected forms (रूपावली) and search lemmatization. */
  inflection?: { stem: string; flags: string[] };
  synonyms?: string[];
  antonyms?: string[];
  related?: string[];
  etymology?: Etymology;
  ipa?: string;
  audio?: string;
  categories?: string[];
  /** 1 = most frequent. Drives sitemap priority, prerender order and ranking. */
  freq?: number;
  status?: EntryStatus;
  sources?: SourceRef[];
  /** Short source keys resolved through the data file's `sourceRegistry` (attribution). */
  src?: string[];
  updatedAt?: string;
}

export type ProverbKind = 'ukhan' | 'tukka';

export interface Proverb {
  id: string;
  text: string;
  kind: ProverbKind;
  meaningNe: string;
  meaningEn?: string;
  /** Closest English proverb/idiom, if one really exists. */
  englishEquivalent?: string;
  example?: string;
  themes?: string[];
  /** Headwords this proverb should appear on. Auto-derived when omitted. */
  words?: string[];
}

/** Derived, per-entry search/rhyme keys produced by `computeKeys`. */
export interface EntryKeys {
  slug: string;
  roman: string;
  /** Devanagari folded key (ि/ी, ु/ू, श/ष/स … merged). */
  devKey: string;
  /** Latin key keeping aspiration: "ghar". */
  romanKey: string;
  /** Latin key dropping aspiration/length: "gar". */
  looseKey: string;
  /** Rhyme keys from strongest to weakest. */
  rhyme: RhymeKeys;
  syllables: number;
}

export interface RhymeKeys {
  /** From the penultimate vowel onward ("-ahar" for सहर). Multi-syllable rhyme. */
  double: string;
  /** From the last vowel onward ("-ar"). Perfect end rhyme. */
  single: string;
  /** Last vowel only ("a"). Assonance / near rhyme. */
  vowel: string;
  /** Last vowel + consonant class of the coda ("a:liquid"). Slant rhyme. */
  slant: string;
}

/** Compact row in the static search index (arrays keep the JSON small). */
export type IndexRow = [
  slug: string,
  lemma: string,
  roman: string,
  devKey: string,
  romanKey: string,
  looseKey: string,
  freq: number,
  gloss: string,
  /** optional: POS (first sense or hint) */
  pos?: string,
  /** optional: "stem/flag,flag" for stubs (forms + lemmatization without a word file) */
  infl?: string,
  /** optional: 1 = stub (no definition yet) */
  stub?: number,
];

export interface SearchHit {
  slug: string;
  lemma: string;
  roman: string;
  gloss: string;
  score: number;
  /** Why it matched — useful for debugging ranking. */
  via: 'exact' | 'variant' | 'roman' | 'loose' | 'prefix' | 'fuzzy' | 'english';
}

/** A cross-reference rendered as a link when the target has its own page. */
export interface WordLink {
  lemma: string;
  slug: string | null;
}

/**
 * Everything the word page needs, in one request. Produced identically by
 * scripts/dictionary/build-dictionary.ts (static JSON) and worker/dictionary.ts.
 */
export interface WordPayload {
  entry: LexiconEntry;
  keys: EntryKeys;
  links: { synonyms: WordLink[]; antonyms: WordLink[]; related: WordLink[]; variants: string[] };
  proverbs: Proverb[];
  rhymes: RhymeHit[];
  /** true when a standalone, indexable rhyme page exists for this word. */
  rhymePage?: boolean;
  /** Inflected forms (रूपावली) generated from Hunspell rules. */
  forms?: string[];
  /** Resolved attribution for every source that contributed to this entry. */
  credits?: SourceRef[];
}

export interface RhymeHit {
  slug: string;
  lemma: string;
  roman: string;
  syllables: number;
  pos?: PartOfSpeech;
  strength: 'double' | 'single' | 'slant' | 'vowel';
  /** true when the rhyme word has its own page (stubs are listed but not linked) */
  defined?: boolean;
}
