import type { EntryKeys, LexiconEntry } from './types.ts';
import { cleanLemma, devKey } from './normalize.ts';
import { looseKey, rhymeInfo, romanize, romanKey, syllableCount } from './phonology.ts';

/** URL slug: the Devanagari headword itself (spaces → hyphen), plus "-2" for homographs. */
export function slugFor(lemma: string, homograph?: number): string {
  const base = cleanLemma(lemma).replace(/\s+/g, '-');
  return homograph && homograph > 1 ? `${base}-${homograph}` : base;
}

/** Where the dictionary lives inside Aafnai Patro. Change here only (prerender, sitemaps, routes and links all follow). */
export const DICT_BASE_PATH = '/tool/nepalidictionary';

export function wordPath(slug: string): string {
  return `${DICT_BASE_PATH}/${slug}`;
}

/** Percent-encoded path — use for sitemaps, canonical <link>, and HTTP headers. */
export function wordPathEncoded(slug: string): string {
  return `${DICT_BASE_PATH}/${encodeURIComponent(slug)}`;
}

/** Safely decode a route param (routers differ on whether they decode for you). */
export function decodeSlug(param: string): string {
  let s = param;
  try {
    // decode repeatedly in case of double-encoding from social apps
    for (let i = 0; i < 2 && /%[0-9A-Fa-f]{2}/.test(s); i++) s = decodeURIComponent(s);
  } catch {
    /* keep as-is */
  }
  return cleanLemma(s);
}

export function computeKeys(e: LexiconEntry): EntryKeys {
  const lemma = cleanLemma(e.lemma);
  const roman = e.roman?.trim() || romanize(lemma);
  const r = rhymeInfo(lemma);
  return {
    slug: slugFor(lemma, e.homograph),
    roman,
    devKey: devKey(lemma),
    romanKey: romanKey(roman),
    looseKey: looseKey(roman),
    rhyme: { double: r.double, single: r.single, vowel: r.vowel, slant: r.slant },
    syllables: syllableCount(lemma),
  };
}

/** FNV-1a 32-bit → 8 hex chars. ASCII-safe static file names for Devanagari slugs. */
export function hashKey(s: string): string {
  let h = 0x811c9dc5;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    // hash UTF-16 units deterministically across runtimes
    for (const unit of cp > 0xffff ? [((cp - 0x10000) >> 10) + 0xd800, ((cp - 0x10000) & 0x3ff) + 0xdc00] : [cp]) {
      h ^= unit;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Static data is sharded into 256 files per kind so the deploy stays far below the
 * host's static-file budget (Cloudflare Workers assets: 20k files). A shard is a JSON
 * object keyed by slug (words) or "s:<key>" / "l:<key>" (rhyme buckets).
 */
export const shardOf = (key: string): string => hashKey(key).slice(0, 2);
export const wordShardPath = (slug: string): string => `w/${shardOf(slug)}.json`;
export const rhymeShardKey = (kind: 's' | 'l', key: string): string => `${kind}:${key}`;
export const rhymeShardPath = (kind: 's' | 'l', key: string): string => `r/${shardOf(rhymeShardKey(kind, key))}.json`;
