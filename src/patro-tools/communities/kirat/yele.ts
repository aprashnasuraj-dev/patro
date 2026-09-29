/**
 * Yele Sambat (Kirat era). Sources disagree on the new-year rule, so both are implemented.
 *   'sankranti'        — Maghe Sankranti (Wikipedia)          ← default
 *   'nearest-new-moon' — new moon closest to Makar Sankranti (mundhum.com)
 * Year number: 5086 from the 2026 new year (community usage) → offset 3060. Status: review.
 */
import * as A from 'astronomy-engine';
import { addDays, localDate } from '../../core/astro';
import { nextSankranti } from '../../festivals/festivals';
import { ERAS } from '../shared/cycles';

export type YeleMode = 'sankranti' | 'nearest-new-moon';
export let YELE_NEW_YEAR_MODE: YeleMode = 'sankranti';
export function setYeleMode(m: YeleMode) { YELE_NEW_YEAR_MODE = m; }

export function yeleNewYear(gy: number, mode: YeleMode = YELE_NEW_YEAR_MODE): string {
  const sank = nextSankranti(9, `${gy - 1}-12-20`);
  if (mode === 'sankranti') return sank;
  const t = Date.parse(`${sank}T06:00:00Z`);
  const before = A.SearchMoonPhase(0, new Date(t - 30 * 86_400_000), 30)!.date;
  const after = A.SearchMoonPhase(0, new Date(t), 30)!.date;
  const nm = Math.abs(t - before.getTime()) <= Math.abs(after.getTime() - t) ? before : after;
  return addDays(localDate(nm, 'Asia/Kathmandu'), 1); // first day after the new moon
}

export function yeleYear(iso: string, mode: YeleMode = YELE_NEW_YEAR_MODE): number {
  const y = Number(iso.slice(0, 4));
  return (iso >= yeleNewYear(y, mode) ? y : y - 1) + ERAS.yele.offset;
}
