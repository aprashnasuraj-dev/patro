/**
 * Reference panchang engine built on `astronomy-engine` (pure JS, MIT, ~1' accuracy).
 *
 * Use it as:
 *  1. a fallback when your own engine has no data (years far in the past/future,
 *     locations outside Nepal for diaspora users), and
 *  2. a cross-check: run both over 50 years in CI and alert on any mismatch.
 *
 * Nepal's official dates come from the Nepal Panchang Nirnayak Samiti. Where the
 * official list exists, it always wins (see provider.ts `overrides`).
 */
import * as A from 'astronomy-engine';
import type { DayPanchang, GeoLocation, LunarMonthInfo, MonthSystem, Paksha, PanchangAt } from './types';

const SYNODIC = 29.530588853;
const DAY_MS = 86_400_000;

const norm360 = (x: number) => ((x % 360) + 360) % 360;

/** Lahiri (Chitrapaksha) ayanamsa, degrees. Linear model, good to < 1 arc-minute for 1900–2100. */
export function lahiriAyanamsa(date: Date): number {
  const jd = date.getTime() / DAY_MS + 2440587.5;
  const years = (jd - 2451545.0) / 365.25;
  return 23.85306 + (years * 50.2788) / 3600;
}

export function sunTropical(date: Date): number {
  return A.SunPosition(date).elon;
}
export function moonTropical(date: Date): number {
  return A.EclipticGeoMoon(date).lon;
}
export function sunSidereal(date: Date): number {
  return norm360(sunTropical(date) - lahiriAyanamsa(date));
}
export function moonSidereal(date: Date): number {
  return norm360(moonTropical(date) - lahiriAyanamsa(date));
}

/** Moon–Sun elongation 0..360 (0 = new moon, 180 = full moon). */
export function moonPhaseAngle(date: Date): number {
  return A.MoonPhase(date);
}

function karanaFromPhase(phase: number): number {
  const k = Math.floor(phase / 6); // 0..59
  if (k === 0) return 10; // किंस्तुघ्न
  if (k <= 56) return (k - 1) % 7;
  return k - 50; // 57→7 शकुनि, 58→8 चतुष्पद, 59→9 नाग
}

/** Instantaneous panchang elements (no location needed). */
export function panchangAt(instant: Date): PanchangAt {
  const phase = moonPhaseAngle(instant);
  const tithi = Math.floor(phase / 12) + 1; // 1..30
  const paksha: Paksha = tithi <= 15 ? 'shukla' : 'krishna';
  const mSid = moonSidereal(instant);
  const sSid = sunSidereal(instant);
  const nakSpan = 360 / 27;
  const nakshatra = Math.floor(mSid / nakSpan);
  return {
    instant,
    tithi,
    paksha,
    tithiInPaksha: paksha === 'shukla' ? tithi : tithi - 15,
    nakshatra,
    nakshatraPada: Math.floor((mSid % nakSpan) / (nakSpan / 4)) + 1,
    yoga: Math.floor(norm360(mSid + sSid) / nakSpan),
    karana: karanaFromPhase(phase),
    moonRashi: Math.floor(mSid / 30),
    sunRashi: Math.floor(sSid / 30),
    moonPhaseAngle: phase,
    moonSidereal: mSid,
    sunSidereal: sSid,
  };
}

/** When does the tithi running at `instant` end? */
export function tithiEndAfter(instant: Date): Date {
  const phase = moonPhaseAngle(instant);
  const target = (Math.floor(phase / 12) + 1) * 12 % 360;
  const t = A.SearchMoonPhase(target, instant, 3);
  if (!t) throw new Error('tithi end search failed');
  return t.date;
}

/** When does a given tithi (1..30) next START after `from`? */
export function nextTithiStart(tithi: number, from: Date): Date {
  const t = A.SearchMoonPhase(((tithi - 1) * 12) % 360, from, 32);
  if (!t) throw new Error('tithi start search failed');
  return t.date;
}

// ---------------------------------------------------------------------------
// Lunar month (with adhik detection)
// ---------------------------------------------------------------------------
const newMoonCache = new Map<number, Date>(); // key: lunation number

function lunationKey(d: Date) {
  return Math.round((d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / (SYNODIC * DAY_MS));
}

export function newMoonOnOrBefore(instant: Date): Date {
  const phase = moonPhaseAngle(instant);
  const approx = new Date(instant.getTime() - (phase / 360) * SYNODIC * DAY_MS);
  const key = lunationKey(approx);
  const cached = newMoonCache.get(key);
  if (cached && cached.getTime() <= instant.getTime()) return cached;
  let t = A.SearchMoonPhase(0, new Date(approx.getTime() - 2 * DAY_MS), 4);
  if (!t || t.date.getTime() > instant.getTime()) {
    t = A.SearchMoonPhase(0, new Date(approx.getTime() - 32 * DAY_MS), 31);
  }
  if (!t) throw new Error('new moon search failed');
  newMoonCache.set(lunationKey(t.date), t.date);
  return t.date;
}

export function newMoonAfter(instant: Date): Date {
  const t = A.SearchMoonPhase(0, new Date(instant.getTime() + 60_000), 32);
  if (!t) throw new Error('new moon search failed');
  newMoonCache.set(lunationKey(t.date), t.date);
  return t.date;
}

/**
 * Amanta lunar month containing `instant`.
 * Month name = the rashi the Sun is in at the starting new moon, +1
 * (Sun in मीन at new moon → चैत्र). No sankranti inside → अधिक मास.
 */
export function lunarMonthAt(instant: Date): LunarMonthInfo {
  const start = newMoonOnOrBefore(instant);
  const end = newMoonAfter(start);
  const r0 = Math.floor(sunSidereal(start) / 30);
  const r1 = Math.floor(sunSidereal(end) / 30);
  const sankrantis = (r1 - r0 + 12) % 12;
  return {
    amantaIndex: (r0 + 1) % 12,
    adhik: sankrantis === 0,
    kshaya: sankrantis >= 2,
    start,
    end,
  };
}

/** Convert amanta month to the requested naming system for a given paksha. */
export function monthInSystem(amantaIndex: number, paksha: Paksha, system: MonthSystem): number {
  if (system === 'amanta' || paksha === 'shukla') return amantaIndex;
  return (amantaIndex + 1) % 12; // purnimanta: krishna paksha belongs to the next month
}

// ---------------------------------------------------------------------------
// Time-zone helpers (no dependencies)
// ---------------------------------------------------------------------------
function tzOffsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Instant of local midnight for yyyy-mm-dd in tz. */
export function zonedMidnight(date: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const off = tzOffsetMs(new Date(guess), tz);
  return new Date(guess - off);
}

/** yyyy-mm-dd of `instant` in tz. */
export function localDate(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// ---------------------------------------------------------------------------
// Sun rise / set
// ---------------------------------------------------------------------------
export function sunriseSunset(date: string, loc: GeoLocation): { sunrise: Date; sunset: Date } {
  const obs = new A.Observer(loc.lat, loc.lon, loc.height ?? 0);
  const midnight = zonedMidnight(date, loc.tz);
  const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, midnight, 1);
  const set = A.SearchRiseSet(A.Body.Sun, obs, -1, midnight, 1);
  if (!rise || !set) throw new Error(`no sunrise/sunset for ${date} at ${loc.lat},${loc.lon} (polar?)`);
  return { sunrise: rise.date, sunset: set.date };
}

/** Full sunrise-based panchang for a civil day at a location. */
export function dayPanchang(date: string, loc: GeoLocation, system: MonthSystem = 'purnimanta'): DayPanchang {
  const { sunrise, sunset } = sunriseSunset(date, loc);
  const p = panchangAt(sunrise);
  const lm = lunarMonthAt(sunrise);
  return {
    ...p,
    date,
    weekday: weekdayOf(date),
    sunrise,
    sunset,
    lunarMonth: lm,
    monthIndex: monthInSystem(lm.amantaIndex, p.paksha, system),
    tithiEnds: tithiEndAfter(sunrise),
  };
}

/** Angle (deg) between a planet and the Sun — used for Venus/Jupiter combustion (अस्त). */
export function angleFromSun(body: 'Venus' | 'Jupiter', instant: Date): number {
  return A.AngleFromSun(body === 'Venus' ? A.Body.Venus : A.Body.Jupiter, instant);
}
