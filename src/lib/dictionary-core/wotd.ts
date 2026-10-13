/**
 * Word of the Day (आजको शब्द).
 *
 * Deterministic: the same date gives the same word on every device, server and
 * prerender — no database write needed. Pass the BS date string your Patro
 * already computes (e.g. "२०८३-०६-१४" or "2083-06-14") so the word flips at
 * Nepal midnight together with the calendar, not at UTC midnight.
 *
 * Editorial overrides (festival words on Dashain, Tihar…) win over rotation.
 */

import { devanagariDigitsToAscii } from './normalize.ts';
import { hashKey } from './keys.ts';

export interface WotdConfig {
  /** Curated pool of slugs (reviewed entries with a good example + note). */
  pool: string[];
  /** Fixed picks keyed by "YYYY-MM-DD" (BS or AD — be consistent). */
  overrides?: Record<string, string>;
}

export function normalizeDateKey(date: string): string {
  return devanagariDigitsToAscii(date).replace(/[^\d]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/** Stable day index from a Y-M-D key (works for BS because we only need ordering). */
function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return y * 372 + (m - 1) * 32 + (d - 1); // BS months ≤ 32 days
}

export function wordOfTheDay(date: string, cfg: WotdConfig): string | undefined {
  const key = normalizeDateKey(date);
  if (cfg.overrides?.[key]) return cfg.overrides[key];
  const pool = cfg.pool;
  if (!pool.length) return undefined;
  // Walk the pool in a fixed shuffled order → no repeats until the pool is exhausted.
  const order = [...pool].sort((a, b) => (hashKey('wotd:' + a) < hashKey('wotd:' + b) ? -1 : 1));
  const n = dayNumber(key);
  return order[((n % order.length) + order.length) % order.length];
}
