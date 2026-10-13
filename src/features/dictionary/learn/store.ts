/**
 * "मेरा शब्द" — saved words + spaced-repetition state.
 *
 * Works signed-out (localStorage, per device). Signed-in users (Aafnai Patro Google
 * sign-in) also sync to D1 through the Worker, so the list follows them across devices.
 */
import { useSyncExternalStore } from 'react';
import { newCard, reviewCard, today, type SrsCard } from '../../../lib/dictionary-core/index.ts';
import { getAccountSnapshot } from '../../../auth/account-client';

const KEY = 'aafnaipatro.dict.cards.v1';
const STATS_KEY = 'aafnaipatro.dict.stats.v1';

export interface Stats {
  streak: number;
  lastDay: number;
  reviewed: number;
  quizzes: number;
  bestScore: Record<string, number>;
}

let cards: SrsCard[] = load(KEY, []);
let stats: Stats = load(STATS_KEY, { streak: 0, lastDay: 0, reviewed: 0, quizzes: 0, bestScore: {} });
const listeners = new Set<() => void>();
let remote: RemoteSync | null = null;

function load<T>(k: string, fallback: T): T {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards));
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* private mode / quota — keep in memory */
  }
  listeners.forEach((l) => l());
}

export const cardStore = {
  all: () => cards,
  has: (id: string) => cards.some((c) => c.id === id),
  add(id: string, front: string, back: string, dir: SrsCard['dir']) {
    if (cards.some((c) => c.id === id)) return;
    const c = newCard(id, front, back, dir);
    cards = [c, ...cards];
    persist();
    void remote?.upsert(c);
  },
  remove(id: string) {
    cards = cards.filter((c) => c.id !== id);
    persist();
    void remote?.remove(id);
  },
  review(id: string, grade: 0 | 3 | 4 | 5) {
    const day = today();
    cards = cards.map((c) => (c.id === id ? reviewCard(c, grade, day) : c));
    bumpStreak(day);
    stats = { ...stats, reviewed: stats.reviewed + 1 };
    persist();
    const c = cards.find((x) => x.id === id);
    if (c) void remote?.upsert(c);
  },
  recordQuiz(mode: string, score: number) {
    bumpStreak(today());
    stats = { ...stats, quizzes: stats.quizzes + 1, bestScore: { ...stats.bestScore, [mode]: Math.max(score, stats.bestScore[mode] ?? 0) } };
    persist();
  },
  stats: () => stats,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** Replace local state (used by sync merge). */
  _replace(next: SrsCard[]) {
    cards = next;
    persist();
  },
};

function bumpStreak(day: number) {
  if (stats.lastDay === day) return;
  stats = { ...stats, streak: stats.lastDay === day - 1 ? stats.streak + 1 : 1, lastDay: day };
}

export function useCards(): SrsCard[] {
  return useSyncExternalStore(cardStore.subscribe, cardStore.all, cardStore.all);
}
export function useStats(): Stats {
  return useSyncExternalStore(cardStore.subscribe, cardStore.stats, cardStore.stats);
}

// ───────────────────────── account sync (Aafnai Patro sign-in → D1) ─────────────────────────
//
// Signed-out learners keep everything in localStorage. When signed in (the existing Google
// sign-in), cards sync through the Worker: /api/v1/dictionary/cards (table dict_saved_words in D1).

interface RemoteSync {
  upsert(c: SrsCard): Promise<void>;
  remove(id: string): Promise<void>;
  quiz(mode: string, level: string, score: number, total: number): Promise<void>;
}

const API = '/api/v1/dictionary';
const send = (method: string, path: string, body?: unknown) =>
  fetch(API + path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let pending = new Map<string, SrsCard>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;
function queue(c: SrsCard) {
  pending.set(c.id, c);
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 1500); // batch reviews into one request
}
async function flush() {
  if (!pending.size) return;
  const batch = [...pending.values()];
  pending = new Map();
  for (let i = 0; i < batch.length; i += 200) {
    const r = await send('PUT', '/cards', { cards: batch.slice(i, i + 200) }).catch(() => null);
    if (!r?.ok) for (const c of batch.slice(i)) pending.set(c.id, c); // retry on next change / online
    if (!r?.ok) break;
  }
}

let started = false;
let syncing: Promise<void> | null = null;

/** Pull the signed-in user's cards, merge with this device, push the union. Safe to call often. */
export function syncNow(): Promise<void> {
  syncing ??= (async () => {
    try {
      if (!getAccountSnapshot()) {
        remote = null; // signed out: this device only (re-runs on "patro:auth-changed")
        return;
      }
      const r = await send('GET', '/cards');
      if (r.status === 401 || !r.ok) {
        remote = null;
        return;
      }
      const data = (await r.json()) as { cards?: SrsCard[] };
      remote = {
        upsert: async (c) => queue(c),
        remove: async (id) => {
          pending.delete(id);
          await send('DELETE', `/cards?id=${encodeURIComponent(id)}`).catch(() => null);
        },
        quiz: async (mode, level, score, total) => {
          await send('POST', '/quiz', { mode, level, score, total }).catch(() => null);
        },
      };
      // merge: union by id; when both sides have a card keep the one reviewed more / due later
      const server = new Map<string, SrsCard>((data.cards ?? []).map((c) => [c.id, c]));
      const merged = new Map(server);
      for (const c of cardStore.all()) {
        const sv = merged.get(c.id);
        if (!sv || c.reps > sv.reps || (c.reps === sv.reps && c.due > sv.due)) merged.set(c.id, c);
      }
      cardStore._replace([...merged.values()].sort((a, b) => b.added - a.added));
      for (const c of merged.values()) if (server.get(c.id) !== c) pending.set(c.id, c);
      await flush();
    } catch {
      /* offline — local copy keeps working */
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

/** Start syncing (idempotent). Re-syncs when the user signs in/out or comes back online. */
export function startAccountSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  void syncNow();
  window.addEventListener('patro:auth-changed', () => void syncNow());
  window.addEventListener('online', () => void (remote ? flush() : syncNow()));
  window.addEventListener('pagehide', () => void flush());
}

/** Record a finished quiz round (stats only; signed-in users also get it in their account). */
export function recordQuizResult(mode: string, level: string, score: number, total: number) {
  cardStore.recordQuiz(mode, score);
  void remote?.quiz(mode, level, score, total);
}
