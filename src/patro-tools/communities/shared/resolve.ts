/**
 * One resolver for every community rule. Works for any Gregorian year.
 */
import * as A from 'astronomy-engine';
import { addDays, localDate, sunSidereal, sunriseSunset, weekdayOf, zonedMidnight } from '../../core/astro';
import { KATHMANDU, type BsAdapter, type GeoLocation } from '../../core/types';
import { occurrences } from '../../tithi-events/engine';
import { nextSankranti } from '../../festivals/festivals';
import { expectedHijriDate } from '../hijri/calendar';
import type { CommunityFestival, Override, ResolvedDate, Rule, Suite } from './types';

export interface ResolveOptions {
  loc?: GeoLocation;
  bs?: BsAdapter;
  overrides?: Override[];
}

/** Main date(s) of a rule within Gregorian year `y`. */
export function ruleDates(rule: Rule, y: number, suite: Suite, opts: ResolveOptions = {}): { date: string; expected?: boolean }[] {
  const loc = opts.loc ?? KATHMANDU;
  const from = `${y}-01-01`;
  const to = `${y}-12-31`;
  switch (rule.kind) {
    case 'lunar':
      return occurrences({ month: rule.month, paksha: rule.paksha, tithi: rule.tithi, observance: rule.observance ?? 'udaya', prefer: rule.prefer, system: rule.system, adhik: 'nija' }, from, to, loc)
        .map((o) => ({ date: o.date }));
    case 'tibetan-new-year': {
      // Empirical Phugpa rule, verified for Losar 2013–2027 (see tests):
      // first sunrise (Kathmandu) after the first new moon on/after 3 Feb, with 90 min tolerance
      // (Phugpa's own new-moon computation runs a little early — Losar 2025 = 28 Feb, new moon 4 min after sunrise).
      const nm = A.SearchMoonPhase(0, new Date(Date.UTC(y, 1, 3)), 40);
      if (!nm) return [];
      let d = localDate(nm.date, loc.tz);
      if (sunriseSunset(d, loc).sunrise.getTime() + 90 * 60_000 < nm.date.getTime()) d = addDays(d, 1);
      return [{ date: d, expected: true }];
    }
    case 'sankranti': {
      // searching from 20 Dec of the previous year finds each sign's entry inside year y
      const d = addDays(nextSankranti(rule.rashi, `${y - 1}-12-20`), rule.offsetDays ?? 0);
      return d >= from && d <= to ? [{ date: d }] : [];
    }
    case 'bs': {
      let iso: string;
      if (opts.bs) {
        const bsYear = rule.month >= 10 ? y + 56 : y + 57; // Magh–Chaitra fall in Jan–Apr
        const ad = opts.bs.toAD({ year: bsYear, month: rule.month, day: rule.day });
        iso = `${ad.year}-${String(ad.month).padStart(2, '0')}-${String(ad.day).padStart(2, '0')}`;
      } else {
        // Fallback: BS month m starts on the (Nepal) civil date on which the Sun enters sidereal sign m-1.
        // Matches the app's archive for Poush 2082/2083. Plug your BS adapter for exactness.
        iso = addDays(ingressDate(rule.month - 1, `${y - 1}-12-20`, loc.tz), rule.day - 1);
      }
      return iso >= from && iso <= to ? [{ date: iso }] : [];
    }
    case 'relative': {
      const ref = suite.festivals.find((f) => f.id === rule.ref);
      if (!ref) throw new Error(`relative rule: unknown ref ${rule.ref}`);
      return ruleDates(ref.rule, y, suite, opts).map(({ date }) => {
        let d = addDays(date, 1);
        let seen = 0;
        for (;;) { if (weekdayOf(d) === rule.weekday && ++seen === rule.nth) break; d = addDays(d, 1); }
        return { date: d };
      });
    }
    case 'hijri':
      return expectedHijriDate(rule.month, rule.day, y, loc).map((d) => ({ date: rule.eve ? addDays(d, -1) : d, expected: true }));
  }
}

export function resolveFestival(f: CommunityFestival, y: number, suite: Suite, opts: ResolveOptions = {}): ResolvedDate[] {
  const out: ResolvedDate[] = [];
  const ov = opts.overrides?.find((o) => o.festivalId === f.id && o.year === y);
  const mains = ov ? [{ date: ov.start, expected: false, announced: true }] : ruleDates(f.rule, y, suite, opts);
  for (const m of mains) {
    const conf = 'announced' in m && m.announced ? 'announced' : m.expected ? 'expected' : 'computed';
    const base = (off: number, span: number, startOff: number) => {
      const main = addDays(m.date, off);
      const start = addDays(main, -startOff);
      return { main, start, end: ov?.end ?? addDays(start, span - 1) };
    };
    out.push({ festival: f, ...base(0, f.spanDays ?? 1, f.startOffset ?? 0), confidence: conf });
    for (const r of f.regions ?? []) {
      out.push({ festival: f, region: r, ...base(r.offsetDays ?? 0, r.spanDays ?? f.spanDays ?? 1, r.startOffset ?? f.startOffset ?? 0), confidence: conf });
    }
  }
  return out;
}

/** All festivals of a suite in Gregorian year y, sorted. */
export function suiteCalendar(suite: Suite, y: number, opts: ResolveOptions = {}): ResolvedDate[] {
  return suite.festivals.flatMap((f) => resolveFestival(f, y, suite, opts)).sort((a, b) => a.start.localeCompare(b.start));
}

/** Upcoming festivals from a date (looks into next year too). */
export function upcoming(suite: Suite, fromIso: string, n = 5, opts: ResolveOptions = {}): ResolvedDate[] {
  const y = Number(fromIso.slice(0, 4));
  return [...suiteCalendar(suite, y, opts), ...suiteCalendar(suite, y + 1, opts)]
    .filter((r) => r.end >= fromIso && !r.region).slice(0, n);
}

/** Civil date (in tz) during which the Sun enters sidereal sign `rashi`, searching forward from `fromIso`. */
export function ingressDate(rashi: number, fromIso: string, tz = 'Asia/Kathmandu'): string {
  const signAt = (iso: string) => Math.floor(sunSidereal(zonedMidnight(iso, tz)) / 30);
  let d = fromIso;
  for (let i = 0; i < 400; i++) {
    const next = addDays(d, 1);
    if (signAt(d) !== rashi && signAt(next) === rashi) return d;
    d = next;
  }
  throw new Error('ingress not found');
}
