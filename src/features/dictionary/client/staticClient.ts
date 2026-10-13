/**
 * Static backend: reads the JSON produced by scripts/dictionary/build-dictionary.ts from
 * /data/dict/v1/ (Cloudflare static assets — /data/* bypasses the Worker, so lookups cost
 * no Worker requests). Search is bucketed by the first two characters.
 *
 * Defined words live in 256 shards (w/<hh>.json, keyed by slug). Stubs (known words without a
 * definition yet) have none: their payload is built here from the index row +
 * morphology rules + rhyme buckets.
 */

import {
  NE_MORPH, cleanLemma, computeKeys, devKey, findRhymes, generateForms, hasDevanagari, lemmaCandidates, rhymeShardKey, rhymeShardPath, wordShardPath, parseQuery,
  romanKey, searchRows, stubFromRow, wordOfTheDay,
  type IndexRow, type RhymeHit, type WordPayload,
} from '../../../lib/dictionary-core/index.ts';
import { unpackRhyme, type PackedRhyme, type RhymeRow } from '../../../lib/dictionary-core/rhyme.ts';
import { devBucket, latinBucket } from './buckets.ts';
import type { BrowseResult, DictionaryClient, ProverbWithSlugs, RhymeQuery, SearchResult, WordResult, WotdResult } from './types.ts';

export function createStaticClient(base = '/data/dict/v1'): DictionaryClient {
  const cache = new Map<string, Promise<unknown>>();

  function get<T>(path: string, signal?: AbortSignal): Promise<T | null> {
    const url = `${base}/${path}`;
    if (!cache.has(url)) {
      const p = fetch(url, { signal })
        .then((r) => (r.ok ? r.json() : null))
        .catch((e) => {
          cache.delete(url); // don't cache failures/aborts
          if ((e as Error).name === 'AbortError') throw e;
          return null;
        });
      cache.set(url, p);
    }
    return cache.get(url) as Promise<T | null>;
  }

  async function rowsFor(term: string, signal?: AbortSignal): Promise<IndexRow[]> {
    const files = new Set(['idx/top.json']);
    if (hasDevanagari(term)) {
      for (const c of lemmaCandidates(term)) {
        const b = devBucket(devKey(c));
        if (b) files.add(`idx/d-${b}.json`);
      }
    } else {
      const b = latinBucket(romanKey(term));
      if (b.length === 2) files.add(`idx/l-${b}.json`);
      const e = term.trim().toLowerCase()[0];
      if (e && /[a-z]/.test(e)) files.add(`idx/en-${e}.json`);
    }
    const lists = await Promise.all([...files].map((f) => get<IndexRow[]>(f, signal)));
    const seen = new Set<string>();
    const out: IndexRow[] = [];
    for (const list of lists) for (const r of list ?? []) if (!seen.has(r[0])) (seen.add(r[0]), out.push(r));
    return out;
  }

  async function rhymeCandidates(single: string, slant: string): Promise<RhymeRow[]> {
    const [a, b] = await Promise.all([
      single ? get<Record<string, PackedRhyme[]>>(rhymeShardPath('s', single)) : null,
      slant ? get<Record<string, PackedRhyme[]>>(rhymeShardPath('l', slant)) : null,
    ]);
    return [...(a?.[rhymeShardKey('s', single)] ?? []), ...(b?.[rhymeShardKey('l', slant)] ?? [])].map(unpackRhyme);
  }

  async function stubPayload(row: IndexRow): Promise<WordPayload> {
    const entry = stubFromRow(row);
    const keys = computeKeys(entry);
    const me: RhymeRow = { slug: keys.slug, lemma: entry.lemma, roman: keys.roman, syllables: keys.syllables, rhyme: keys.rhyme };
    const rhymes = findRhymes(me, await rhymeCandidates(keys.rhyme.single, keys.rhyme.slant), { limit: 24 });
    const forms = entry.inflection ? generateForms(entry.inflection.stem, entry.inflection.flags, NE_MORPH, 60).filter((f) => f !== entry.lemma) : [];
    return { entry, keys, links: { synonyms: [], antonyms: [], related: [], variants: [] }, proverbs: [], rhymes, ...(forms.length ? { forms } : {}) };
  }

  return {
    name: 'static',

    async search(q, limit = 20, signal) {
      const { term, intent } = parseQuery(q);
      if (!term) return { q, term, intent, hits: [] } satisfies SearchResult;
      const rows = await rowsFor(term, signal);
      return { q, term, intent, hits: searchRows(rows, term, limit) };
    },

    async word(slug): Promise<WordResult> {
      const s = cleanLemma(slug);
      const p = (await get<Record<string, WordPayload>>(wordShardPath(s)))?.[s];
      if (p) return { kind: 'ok', payload: p };
      const rows = await rowsFor(s);
      const exact = rows.find((r) => r[0] === s);
      if (exact) return { kind: 'ok', payload: await stubPayload(exact) }; // known word, no definition yet
      // Maybe a spelling variant or inflected form (शहर → सहर, गरेको → गर्नु)
      const hit = searchRows(rows, s, 1)[0];
      return hit && (hit.via === 'exact' || hit.via === 'variant') ? { kind: 'redirect', slug: hit.slug } : { kind: 'not_found' };
    },

    async rhymes(slug, q: RhymeQuery = {}): Promise<RhymeHit[]> {
      const w = await this.word(slug);
      if (w.kind !== 'ok') return [];
      const { keys, entry } = w.payload;
      const me: RhymeRow = { slug: keys.slug, lemma: entry.lemma, roman: keys.roman, syllables: keys.syllables, rhyme: keys.rhyme };
      return findRhymes(me, await rhymeCandidates(keys.rhyme.single, keys.rhyme.slant), { ...q, limit: 500 });
    },

    async ukhan() {
      return (await get<ProverbWithSlugs[]>('ukhan.json')) ?? [];
    },

    async wotd(bsDate): Promise<WotdResult | null> {
      const d = await get<{ pool: string[]; overrides: Record<string, string>; entries: Record<string, Omit<WotdResult, 'date' | 'slug'>> }>('wotd.json');
      if (!d) return null;
      const slug = wordOfTheDay(bsDate, d);
      return slug && d.entries[slug] ? { date: bsDate, slug, ...d.entries[slug] } : null;
    },

    async browse(initial, page): Promise<BrowseResult> {
      // browse/<hex>.json lists DEFINED headwords starting with that letter (stubs are not browsable pages)
      const hex = [...initial][0]?.codePointAt(0)?.toString(16);
      const items = (hex && (await get<BrowseResult['items']>(`browse/${hex}.json`))) || [];
      const pages = Math.max(1, Math.ceil(items.length / 200));
      return { initial, page, pages, items: items.slice((page - 1) * 200, page * 200) };
    },
  };
}
