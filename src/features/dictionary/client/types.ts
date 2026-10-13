import type { PartOfSpeech, Proverb, RhymeHit, SearchHit, WordPayload } from '../../../lib/dictionary-core/index.ts';
import type { QueryIntent } from '../../../lib/dictionary-core/query.ts';

export interface SearchResult {
  q: string;
  term: string;
  intent: QueryIntent;
  hits: SearchHit[];
}

export type WordResult = { kind: 'ok'; payload: WordPayload } | { kind: 'redirect'; slug: string } | { kind: 'not_found' };

export interface RhymeQuery {
  syllables?: number;
  pos?: PartOfSpeech;
  min?: RhymeHit['strength'];
}

export interface WotdResult {
  date: string;
  slug: string;
  lemma: string;
  roman: string;
  ne: string;
  en: string[];
  example: { ne: string; en?: string } | null;
}

export type ProverbWithSlugs = Proverb & { slugs: string[] };

/**
 * The one interface the UI talks to (implemented by the static client, client/index.ts).
 */
export interface DictionaryClient {
  readonly name: string;
  search(q: string, limit?: number, signal?: AbortSignal): Promise<SearchResult>;
  word(slug: string): Promise<WordResult>;
  rhymes(slug: string, q?: RhymeQuery): Promise<RhymeHit[]>;
  ukhan(): Promise<ProverbWithSlugs[]>;
  /** `bsDate` = today's BS date from the Patro, e.g. "2083-06-14". */
  wotd(bsDate: string): Promise<WotdResult | null>;
  /** A–Z browsing: headwords starting with `initial` (one Devanagari letter), 1-based page of 200. */
  browse(initial: string, page: number): Promise<BrowseResult>;
}

export interface BrowseResult {
  initial: string;
  page: number;
  pages: number;
  items: Array<{ slug: string; lemma: string; roman: string }>;
}
