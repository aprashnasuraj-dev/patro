/** Civil-date helpers shared by every world-calendar engine. All dates are proleptic Gregorian civil dates. */

export type Ymd = { y: number; m: number; d: number };

const fdiv = (a: number, b: number) => Math.floor(a / b);
export const mod = (a: number, b: number) => ((a % b) + b) % b;
/** Reingold–Dershowitz "adjusted mod": result in 1..b. */
export const amod = (a: number, b: number) => mod(a - 1, b) + 1;

/** Gregorian civil date → integer Julian Day Number (Fliegel–Van Flandern). */
export function gregorianToJdn(y: number, m: number, d: number): number {
  const a = fdiv(14 - m, 12);
  const Y = y + 4800 - a;
  const M = m + 12 * a - 3;
  return d + fdiv(153 * M + 2, 5) + 365 * Y + fdiv(Y, 4) - fdiv(Y, 100) + fdiv(Y, 400) - 32045;
}

/** Integer JDN → Gregorian civil date. */
export function jdnToGregorian(jdn: number): Ymd {
  const a = jdn + 32044;
  const b = fdiv(4 * a + 3, 146097);
  const c = a - fdiv(146097 * b, 4);
  const d = fdiv(4 * c + 3, 1461);
  const e = c - fdiv(1461 * d, 4);
  const m = fdiv(5 * e + 2, 153);
  return { y: 100 * b + d - 4800 + fdiv(m, 10), m: m + 3 - 12 * fdiv(m, 10), d: e - fdiv(153 * m + 2, 5) + 1 };
}

/** Julian-calendar civil date → JDN. */
export function julianToJdn(y: number, m: number, d: number): number {
  const a = fdiv(14 - m, 12);
  const Y = y + 4800 - a;
  const M = m + 12 * a - 3;
  return d + fdiv(153 * M + 2, 5) + 365 * Y + fdiv(Y, 4) - 32083;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const iso = ({ y, m, d }: Ymd) => `${String(y).padStart(4, "0")}-${pad2(m)}-${pad2(d)}`;

/** Strict yyyy-mm-dd parser; returns null for impossible dates. */
export function parseIso(value: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const back = jdnToGregorian(gregorianToJdn(y, m, d));
  return back.y === y && back.m === m && back.d === d ? { y, m, d } : null;
}

export const isGregorianLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInGregorianMonth = (y: number, m: number) => [31, isGregorianLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

/** 0 = Sunday … 6 = Saturday. */
export const weekdaySun0 = (jdn: number) => mod(jdn + 1, 7);

export const addDaysIso = (value: string, days: number) => {
  const p = parseIso(value);
  if (!p) throw new Error(`bad date ${value}`);
  return iso(jdnToGregorian(gregorianToJdn(p.y, p.m, p.d) + days));
};
export const isoToJdn = (value: string) => {
  const p = parseIso(value);
  if (!p) throw new Error(`bad date ${value}`);
  return gregorianToJdn(p.y, p.m, p.d);
};
export const jdnToIso = (jdn: number) => iso(jdnToGregorian(jdn));

/** Today's civil date in an IANA time zone. */
export function todayIn(tz: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Seconds until the next local midnight in tz (minimum 60), used for "today" cache lifetimes. */
export function secondsToLocalMidnight(tz: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  const elapsed = n("hour") * 3600 + n("minute") * 60 + n("second");
  return Math.max(60, 86400 - elapsed);
}

/** UTC instant for a local wall-clock time in tz (DST-safe, two-pass). */
export function zonedTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms));
    const n = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
    return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")) - ms;
  };
  let ms = guess - offsetAt(guess);
  ms = guess - offsetAt(ms);
  return new Date(ms);
}

/** Local hh:mm of an instant in tz. */
export function localHm(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
}
