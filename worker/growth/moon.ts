/**
 * Pure moon computations for the /moon page family. No I/O, safe to unit-test in Node.
 * Built on astronomy-engine (already a production dependency) and the site's own
 * panchang helpers so Hindu/Nepali month names match the rest of Aafnai Patro.
 */
import * as A from "astronomy-engine";
import { lunarMonthAt, panchangAt } from "../../src/patro-tools/core/astro";
import { LUNAR_MONTHS, LUNAR_MONTHS_ROMAN, tithiName } from "../../src/patro-tools/core/names";
import type { GrowthCity } from "./cities";

const KM_PER_AU = 149_597_870.7;
export const SYNODIC_DAYS = 29.530588853;

export type QuarterKind = "new" | "first" | "full" | "last";
export const QUARTER_LABEL: Record<QuarterKind, string> = { new: "New Moon", first: "First Quarter", full: "Full Moon", last: "Last Quarter" };
const QUARTER_FROM_INDEX: QuarterKind[] = ["new", "first", "full", "last"];

export interface QuarterEvent {
  kind: QuarterKind;
  instant: Date;
  distanceKm: number;
}

/** All principal phases with instants in [from, to). */
export function quartersBetween(from: Date, to: Date): QuarterEvent[] {
  const out: QuarterEvent[] = [];
  let q = A.SearchMoonQuarter(A.MakeTime(from));
  while (q.time.date < to) {
    const instant = q.time.date;
    out.push({ kind: QUARTER_FROM_INDEX[q.quarter], instant, distanceKm: moonDistanceKm(instant) });
    q = A.NextMoonQuarter(q);
  }
  return out;
}

export function moonDistanceKm(instant: Date) {
  return A.GeoMoon(instant).Length() * KM_PER_AU;
}

export function illuminationFraction(instant: Date) {
  return A.Illumination(A.Body.Moon, instant).phase_fraction;
}

export function phaseAngle(instant: Date) {
  return A.MoonPhase(instant);
}

/** Days since the previous new moon. */
export function moonAgeDays(instant: Date) {
  return (instant.getTime() - previousQuarter(instant, "new").instant.getTime()) / 86_400_000;
}

/**
 * Phase name for a moment. Principal phases are named only within ±12 h of the exact instant
 * (the convention used by most almanacs for "today"); otherwise the intermediate name.
 */
export function phaseName(instant: Date): string {
  const near = quartersBetween(new Date(instant.getTime() - 12 * 3_600_000), new Date(instant.getTime() + 12 * 3_600_000));
  if (near.length) return QUARTER_LABEL[near[0].kind];
  const a = phaseAngle(instant);
  if (a < 90) return "Waxing Crescent";
  if (a < 180) return "Waxing Gibbous";
  if (a < 270) return "Waning Gibbous";
  return "Waning Crescent";
}

export type PhaseKey = "new" | "waxingCrescent" | "first" | "waxingGibbous" | "full" | "waningGibbous" | "last" | "waningCrescent";
/** Language-neutral phase key (same ±12 h convention as phaseName). */
export function phaseKey(instant: Date): PhaseKey {
  const near = quartersBetween(new Date(instant.getTime() - 12 * 3_600_000), new Date(instant.getTime() + 12 * 3_600_000));
  if (near.length) return near[0].kind;
  const a = phaseAngle(instant);
  return a < 90 ? "waxingCrescent" : a < 180 ? "waxingGibbous" : a < 270 ? "waningGibbous" : "waningCrescent";
}

/** Traditional North American full-moon names by calendar month (Old Farmer's Almanac convention). */
const FULL_MOON_NAMES = ["Wolf Moon", "Snow Moon", "Worm Moon", "Pink Moon", "Flower Moon", "Strawberry Moon", "Buck Moon", "Sturgeon Moon", "Corn Moon", "Hunter's Moon", "Beaver Moon", "Cold Moon"];

/** Well-known Purnima observances by amanta lunar month index (0 = Chaitra). */
const PURNIMA_OBSERVANCE: Record<number, string> = {
  0: "Chaitra Purnima (Hanuman Jayanti in many traditions)",
  1: "Buddha Purnima · Buddha Jayanti",
  3: "Guru Purnima",
  4: "Janai Purnima · Raksha Bandhan",
  6: "Kojagrat Purnima · Sharad Purnima (end of Dashain)",
  7: "Kartik Purnima",
  8: "Yomari Punhi (Newar)",
  10: "Maghi Purnima",
  11: "Fagu Purnima · Holi",
};

export interface FullMoonInfo extends QuarterEvent {
  usName: string;
  usNameNote?: string;
  hinduMonth: { roman: string; devanagari: string; adhik: boolean };
  observance?: string;
  closestOfYear?: boolean;
  farthestOfYear?: boolean;
  blueMoon?: boolean;
  eclipse?: LunarEclipseInfo;
}

export interface LunarEclipseInfo {
  kind: "penumbral" | "partial" | "total";
  peak: Date;
  /** semi-durations in minutes */
  sdPenumMin: number;
  sdPartialMin: number;
  sdTotalMin: number;
}

function cap(s: string) { return s[0].toUpperCase() + s.slice(1); }

/** Hindu lunar month (amanta) that contains `instant`. */
export function hinduMonthAt(instant: Date) {
  const lm = lunarMonthAt(instant);
  return { index: lm.amantaIndex, roman: cap(LUNAR_MONTHS_ROMAN[lm.amantaIndex]), devanagari: LUNAR_MONTHS[lm.amantaIndex], adhik: lm.adhik };
}

export function lunarEclipsesInYear(year: number): LunarEclipseInfo[] {
  const out: LunarEclipseInfo[] = [];
  let e = A.SearchLunarEclipse(A.MakeTime(new Date(Date.UTC(year, 0, 1))));
  while (e.peak.date.getUTCFullYear() === year) {
    out.push({ kind: e.kind as LunarEclipseInfo["kind"], peak: e.peak.date, sdPenumMin: e.sd_penum, sdPartialMin: e.sd_partial, sdTotalMin: e.sd_total });
    e = A.NextLunarEclipse(e.peak);
  }
  return out;
}

/**
 * Full moons whose instant falls in the given UTC year, annotated.
 * US naming is assigned by the US Eastern calendar month (as almanacs do); "Blue Moon" = second
 * full moon in the same Eastern calendar month; Harvest Moon = full moon nearest the September equinox,
 * and Hunter's Moon the one after it.
 */
export function fullMoonsOfYear(year: number): FullMoonInfo[] {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));
  const fulls = quartersBetween(from, to).filter((q) => q.kind === "full");
  const eclipses = lunarEclipsesInYear(year);
  const equinox = A.Seasons(year).sep_equinox.date;
  const harvestIdx = fulls.reduce((best, q, i) => (Math.abs(q.instant.getTime() - equinox.getTime()) < Math.abs(fulls[best].instant.getTime() - equinox.getTime()) ? i : best), 0);
  const etMonth = (d: Date) => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", month: "2-digit" }).format(d)) - 1;
  const minD = Math.min(...fulls.map((f) => f.distanceKm));
  const maxD = Math.max(...fulls.map((f) => f.distanceKm));
  const seenMonth = new Set<number>();
  return fulls.map((q, i) => {
    const m = etMonth(q.instant);
    let usName = FULL_MOON_NAMES[m];
    let usNameNote: string | undefined;
    const blueMoon = seenMonth.has(m);
    seenMonth.add(m);
    if (blueMoon) usName = "Blue Moon";
    if (i === harvestIdx) { usNameNote = usName; usName = "Harvest Moon"; }
    else if (i === harvestIdx + 1) { usNameNote = usName; usName = "Hunter's Moon"; }
    const hm = hinduMonthAt(q.instant);
    const eclipse = eclipses.find((e) => Math.abs(e.peak.getTime() - q.instant.getTime()) < 36 * 3_600_000);
    return {
      ...q,
      usName,
      usNameNote: usNameNote && usNameNote !== usName ? usNameNote : undefined,
      hinduMonth: { roman: hm.roman, devanagari: hm.devanagari, adhik: hm.adhik },
      observance: hm.adhik ? undefined : PURNIMA_OBSERVANCE[hm.index],
      closestOfYear: q.distanceKm === minD,
      farthestOfYear: q.distanceKm === maxD,
      blueMoon,
      eclipse,
    };
  });
}

export interface NewMoonInfo extends QuarterEvent {
  /** amanta month that ENDS at this new moon (South/West India naming) */
  amantaEnding: string;
  /** purnimanta month this Amavasya belongs to (Nepal / North India naming) */
  purnimanta: string;
}

export function newMoonsOfYear(year: number): NewMoonInfo[] {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));
  return quartersBetween(from, to).filter((q) => q.kind === "new").map((q) => {
    const ending = hinduMonthAt(new Date(q.instant.getTime() - 3_600_000));
    const purnimanta = cap(LUNAR_MONTHS_ROMAN[(ending.index + 1) % 12]);
    return { ...q, amantaEnding: ending.roman + (ending.adhik ? " (Adhik)" : ""), purnimanta };
  });
}

export interface RiseSet { rise: Date | null; set: Date | null; }

/** Moonrise and moonset during the local calendar day `date` (yyyy-mm-dd) at a city. */
export function moonRiseSet(date: string, city: GrowthCity, zonedMidnight: (d: string, tz: string) => Date): RiseSet {
  const obs = new A.Observer(city.lat, city.lon, city.height ?? 0);
  const start = zonedMidnight(date, city.tz);
  const end = new Date(start.getTime() + 86_400_000);
  const rise = A.SearchRiseSet(A.Body.Moon, obs, +1, start, 1.05);
  const set = A.SearchRiseSet(A.Body.Moon, obs, -1, start, 1.05);
  return {
    rise: rise && rise.date < end ? rise.date : null,
    set: set && set.date < end ? set.date : null,
  };
}

/** Altitude of the Moon (degrees) seen from a city at an instant. */
export function moonAltitude(instant: Date, city: GrowthCity) {
  const obs = new A.Observer(city.lat, city.lon, city.height ?? 0);
  const eq = A.Equator(A.Body.Moon, instant, obs, true, true);
  return A.Horizon(instant, obs, eq.ra, eq.dec, "normal").altitude;
}

/** Hindu lunar day (tithi) at an instant, with its English + Nepali label. */
export function tithiAt(instant: Date) {
  const p = panchangAt(instant);
  const n = p.tithi;
  const roman = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"];
  const en = n === 15 ? "Purnima" : n === 30 ? "Amavasya" : roman[(n - 1) % 15];
  return { number: n, paksha: p.paksha, en: `${p.paksha === "shukla" ? "Shukla" : "Krishna"} ${en}`, ne: tithiName(n) };
}

export function nextQuarter(after: Date, kind: QuarterKind): QuarterEvent {
  const target = { new: 0, first: 90, full: 180, last: 270 }[kind];
  const t = A.SearchMoonPhase(target, A.MakeTime(after), 40);
  if (!t) throw new Error("moon phase search failed");
  return { kind, instant: t.date, distanceKm: moonDistanceKm(t.date) };
}

export function previousQuarter(before: Date, kind: QuarterKind): QuarterEvent {
  let q = nextQuarter(new Date(before.getTime() - 35 * 86_400_000), kind);
  for (;;) {
    const n = nextQuarter(new Date(q.instant.getTime() + 60_000), kind);
    if (n.instant >= before) return q;
    q = n;
  }
}

/** Supported page years: a window around "now" keeps the URL space finite and useful. */
export function yearWindow(now = new Date()) {
  const y = now.getUTCFullYear();
  return { min: y - 2, max: y + 5 };
}
