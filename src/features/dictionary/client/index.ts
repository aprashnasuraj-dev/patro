/**
 * The dictionary reads static JSON from /data/dict/v1 (generated at build time by
 * scripts/dictionary/build-dictionary.ts and served as Cloudflare static assets).
 * Personal data (saved words, quiz results) syncs through /api/v1/dictionary — see learn/store.ts.
 */
import { createStaticClient } from './staticClient.ts';
import type { DictionaryClient } from './types.ts';

export type { DictionaryClient } from './types.ts';
export * from './types.ts';

export const DICT_DATA_BASE = '/data/dict/v1';
export const dictionaryClient: DictionaryClient = createStaticClient(DICT_DATA_BASE);
