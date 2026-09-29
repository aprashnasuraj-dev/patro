/**
 * Tithi-based personal events: श्राद्ध, तिथि जन्मदिन, पूजा, व्रत.
 *
 * The rule that decides WHICH civil day a tithi is observed on matters a lot.
 * Example: 2024 Vijaya Dashami. At sunrise on 12 Oct 2024 the tithi was still
 * Navami (Dashami began 11:14), yet Nepal celebrated tika on 12 Oct because
 * Dashami is taken when it covers aparahna. A naive "tithi at sunrise" app gets
 * this wrong. So every event carries an `observance` rule.
 */
import { addDays, localDate, lunarMonthAt, monthInSystem, nextTithiStart, panchangAt, sunriseSunset, zonedMidnight } from '../core/astro';
import type { GeoLocation, MonthSystem, Paksha } from '../core/types';
import { KATHMANDU } from '../core/types';

/** Which part of the day the tithi must cover. */
export type Observance =
  | 'udaya'      // at sunrise — birthdays, most vratas
  | 'madhyahna'  // midday (3rd fifth of daytime)
  | 'aparahna'   // afternoon (4th fifth) — श्राद्ध, Vijaya Dashami
  | 'pradosh'    // after sunset — Laxmi Puja, Pradosh vrata
  | 'nishitha';  // around midnight — Janmashtami, Shivaratri

export type AdhikPolicy = 'nija' | 'adhik' | 'both';

export interface TithiRule {
  /** 0 = Chaitra … 11 = Falgun, in `system` naming */
  month: number;
  paksha: Paksha;
  /** 1..15 (15 = Purnima in shukla, Aunsi in krishna) */
  tithi: number;
  observance: Observance;
  /** default 'nija': in an adhik year, observe in the regular (शुद्ध) month */
  adhik?: AdhikPolicy;
  system?: MonthSystem;
  /**
   * When the tithi touches the window on two days (वृद्धि / दुई दिन व्याप्ति):
   * - 'first': earliest day (udaya default)
   * - 'max': day with most coverage (aparahna / madhyahna / nishitha default)
   * - 'last': latest day with at least `minOverlapMin` minutes
   *   (pradosh default — this is why Nepal did Laxmi Puja on 1 Nov 2024, not 31 Oct)
   */
  prefer?: 'first' | 'max' | 'last';
  /** minimum overlap in minutes for 'last' (default 24 = one ghadi) */
  minOverlapMin?: number;
}

const DEFAULT_PREFER: Record<Observance, 'first' | 'max' | 'last'> = {
  udaya: 'first', madhyahna: 'max', aparahna: 'max', pradosh: 'last', nishitha: 'max',
};

export interface Occurrence {
  /** civil date yyyy-mm-dd in location tz */
  date: string;
  tithiStart: Date;
  tithiEnd: Date;
  adhikMonth: boolean;
  /** 0..1 — how much of the observance window the tithi covered */
  coverage: number;
  /** true when the tithi never covered the window on any day (क्षय) — fallback used */
  fallback: boolean;
}

const HOUR = 3_600_000;

function window(date: string, obs: Observance, loc: GeoLocation): [number, number] {
  const { sunrise, sunset } = sunriseSunset(date, loc);
  const r = sunrise.getTime();
  const s = sunset.getTime();
  const day = s - r;
  const night = 24 * HOUR - day;
  switch (obs) {
    case 'udaya': return [r, r];
    case 'madhyahna': return [r + (day * 2) / 5, r + (day * 3) / 5];
    case 'aparahna': return [r + (day * 3) / 5, r + (day * 4) / 5];
    case 'pradosh': return [s, s + (night * 3) / 15];
    case 'nishitha': {
      const mid = s + night / 2;
      return [mid - night / 30, mid + night / 30];
    }
  }
}

function coverage([w0, w1]: [number, number], t0: number, t1: number): number {
  if (w0 === w1) return w0 >= t0 && w0 < t1 ? 1 : 0;
  const ov = Math.max(0, Math.min(w1, t1) - Math.max(w0, t0));
  return ov / (w1 - w0);
}

/** tithi 1..30 from paksha + tithi-in-paksha */
export function absoluteTithi(paksha: Paksha, t: number): number {
  return paksha === 'shukla' ? t : t + 15;
}

/**
 * All occurrences of a rule between two civil dates (inclusive).
 * Cost: ~13 tithi intervals per year × a few sunrise calcs → a few ms.
 */
export function occurrences(rule: TithiRule, fromDate: string, toDate: string, loc: GeoLocation = KATHMANDU): Occurrence[] {
  const system = rule.system ?? 'purnimanta';
  const policy = rule.adhik ?? 'nija';
  const target = absoluteTithi(rule.paksha, rule.tithi);
  const out: Occurrence[] = [];

  let cursor = new Date(Date.parse(`${addDays(fromDate, -2)}T00:00:00Z`));
  const stop = Date.parse(`${addDays(toDate, 2)}T00:00:00Z`);

  while (cursor.getTime() < stop) {
    const start = nextTithiStart(target, cursor);
    if (start.getTime() > stop) break;
    const end = nextTithiStart(target === 30 ? 1 : target + 1, start);
    cursor = new Date(end.getTime() + HOUR);

    const mid = new Date((start.getTime() + end.getTime()) / 2);
    const lm = lunarMonthAt(mid);
    const month = monthInSystem(lm.amantaIndex, panchangAt(mid).paksha, system);
    if (month !== rule.month) continue;
    if (policy === 'nija' && lm.adhik) continue;
    if (policy === 'adhik' && !lm.adhik) continue;

    // Candidate civil days: the day the tithi starts, and the next one or two.
    const d0 = localDate(new Date(start.getTime() - 24 * HOUR), loc.tz);
    const prefer = rule.prefer ?? DEFAULT_PREFER[rule.observance];
    const minMs = (rule.minOverlapMin ?? 24) * 60_000;
    let best: { date: string; cov: number } | null = null;
    for (let i = 0; i < 4; i++) {
      const d = addDays(d0, i);
      const w = window(d, rule.observance, loc);
      const cov = coverage(w, start.getTime(), end.getTime());
      if (cov <= 0) continue;
      if (!best) { best = { date: d, cov }; continue; }
      if (prefer === 'max' && cov > best.cov + 1e-9) best = { date: d, cov };
      if (prefer === 'last' && cov * (w[1] - w[0]) >= minMs) best = { date: d, cov };
    }
    const date = best?.date ?? localDate(start, loc.tz);
    if (date < fromDate || date > toDate) continue;
    out.push({ date, tithiStart: start, tithiEnd: end, adhikMonth: lm.adhik, coverage: best?.cov ?? 0, fallback: !best });
  }
  return out;
}

/** Next N occurrences on/after a date. */
export function nextOccurrences(rule: TithiRule, fromDate: string, count = 3, loc: GeoLocation = KATHMANDU): Occurrence[] {
  const res: Occurrence[] = [];
  let from = fromDate;
  for (let guard = 0; res.length < count && guard < 10; guard++) {
    const to = addDays(from, 400);
    for (const o of occurrences(rule, from, to, loc)) {
      if (res.length < count && !res.some((r) => r.date === o.date)) res.push(o);
    }
    from = addDays(to, 1);
  }
  return res;
}

/**
 * UX helper: the user knows the DATE (e.g. date of death, date of birth) but
 * not the tithi. Derive the rule from that date/time.
 * For श्राद्ध pass the time of death if known; tithi at that moment is used.
 */
export function ruleFromDate(
  date: string,
  opts: { time?: string; observance: Observance; loc?: GeoLocation; system?: MonthSystem },
): TithiRule & { adhikSource: boolean } {
  const loc = opts.loc ?? KATHMANDU;
  const instant = opts.time
    ? new Date(zonedMidnight(date, loc.tz).getTime() + timeToMs(opts.time))
    : sunriseSunset(date, loc).sunrise;
  const p = panchangAt(instant);
  const lm = lunarMonthAt(instant);
  const system = opts.system ?? 'purnimanta';
  return {
    month: monthInSystem(lm.amantaIndex, p.paksha, system),
    paksha: p.paksha,
    tithi: p.tithiInPaksha,
    observance: opts.observance,
    system,
    adhik: 'nija',
    adhikSource: lm.adhik,
  };
}

function timeToMs(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60 + m) * 60_000;
}
