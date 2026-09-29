/**
 * "भविष्यका लागि चिठी" — letters that open on a BS date (or a tithi birthday).
 */
import { zonedMidnight } from '../core/astro';
import { BS_MONTHS, toNepaliDigits } from '../core/names';
import type { BsAdapter, BsDate } from '../core/types';
import { nextOccurrences, type TithiRule } from '../tithi-events/engine';
import type { Sealed } from './crypto';

export interface Recipient {
  name: string;
  userId?: string;
  email?: string;
  /** E.164, for Viber/SMS notice */
  phone?: string;
}

export interface FutureLetter {
  id: string;
  authorId: string;
  authorName: string;
  recipient: Recipient;
  /** exact instant it unlocks (UTC ISO) */
  openAt: string;
  /** what the writer chose, for display: "२०९९ बैशाख १ (१६ औं जन्मदिन)" */
  openAtLabel: string;
  sealed: Sealed;
  /** optional non-secret teaser shown on the locked envelope */
  teaser?: string;
  createdAt: string;
  deliveredAt?: string;
  openedAt?: string;
  /** writer can cancel until this date; after it, the letter is locked forever */
  editableUntil?: string;
}

/** Unlock at 06:00 Nepal time on a BS date. */
export function openAtFromBs(bs: BsDate, adapter: BsAdapter, hour = 6, tz = 'Asia/Kathmandu') {
  const ad = adapter.toAD(bs);
  const iso = `${ad.year}-${String(ad.month).padStart(2, '0')}-${String(ad.day).padStart(2, '0')}`;
  return {
    openAt: new Date(zonedMidnight(iso, tz).getTime() + hour * 3_600_000).toISOString(),
    openAtLabel: `${toNepaliDigits(bs.year)} ${BS_MONTHS[bs.month - 1]} ${toNepaliDigits(bs.day)}`,
  };
}

/** Unlock on the Nth tithi birthday after a given date (e.g. the 16th). */
export function openAtFromTithiBirthday(rule: TithiRule, birthDate: string, age: number, hour = 6, tz = 'Asia/Kathmandu') {
  const [y, m, d] = birthDate.split('-').map(Number);
  const from = `${y + age}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const start = new Date(Date.UTC(y + age, m - 1, d - 40)).toISOString().slice(0, 10);
  const occ = nextOccurrences(rule, start, 1)[0];
  return {
    openAt: new Date(zonedMidnight(occ.date, tz).getTime() + hour * 3_600_000).toISOString(),
    openAtLabel: `${toNepaliDigits(age)} औं तिथि जन्मदिन (${occ.date})`,
    approxFrom: from,
  };
}

export function lockState(letter: Pick<FutureLetter, 'openAt'>, now = new Date()) {
  const ms = Date.parse(letter.openAt) - now.getTime();
  if (ms <= 0) return { locked: false as const };
  const days = Math.floor(ms / 86_400_000);
  const years = Math.floor(days / 365.25);
  return {
    locked: true as const,
    days,
    label: years >= 1 ? `${toNepaliDigits(years)} वर्ष ${toNepaliDigits(Math.floor(days - years * 365.25))} दिन बाँकी` : `${toNepaliDigits(days)} दिन बाँकी`,
  };
}

/** Storage contract — implement with Postgres/Supabase/Firestore. */
export interface LetterStore {
  create(letter: FutureLetter): Promise<void>;
  get(id: string): Promise<FutureLetter | null>;
  /** letters with openAt <= now and deliveredAt IS NULL (index on openAt!) */
  due(now: Date, limit: number): Promise<FutureLetter[]>;
  markDelivered(id: string, at: Date): Promise<void>;
  markOpened(id: string, at: Date): Promise<void>;
  listByAuthor(authorId: string): Promise<FutureLetter[]>;
}

export interface Notifier {
  /** push / email / Viber — send a "your letter has arrived" notice with a link */
  letterArrived(letter: FutureLetter, url: string): Promise<void>;
}

/** Cron job body (run hourly). Idempotent: markDelivered only after notify succeeds. */
export async function deliverDueLetters(store: LetterStore, notify: Notifier, baseUrl: string, now = new Date()) {
  const due = await store.due(now, 200);
  let delivered = 0;
  for (const l of due) {
    try {
      await notify.letterArrived(l, `${baseUrl}/chithi/${l.id}`);
      await store.markDelivered(l.id, now);
      delivered++;
    } catch (e) {
      console.error('letter delivery failed', l.id, e);
    }
  }
  return { checked: due.length, delivered };
}
