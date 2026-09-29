/**
 * Hijri calendar — two layers, both maintenance-free:
 *
 * 1. TABULAR (arithmetic, civil epoch) — instant, deterministic, ±1–2 days vs sighting.
 * 2. EXPECTED (astronomical crescent visibility at a location, default Kathmandu):
 *    month starts the day after the first evening on which the young crescent is
 *    likely visible (Moon altitude at sunset ≥ 5°, Sun–Moon elongation ≥ 10°,
 *    age ≥ 18 h). Calibrated to Nepal's announced Eid ul-Fitr 2025 (31 Mar) and 2026 (21 Mar).
 *
 * Nepal's official dates come from the Muslim Commission's moon sighting,
 * announced by the Ministry of Home Affairs. Show "expected" until then; an
 * editor may add an Override to show "announced" — optional, not required.
 */
import * as A from 'astronomy-engine';
import { addDays, localDate, sunriseSunset } from '../../core/astro';
import { KATHMANDU, type GeoLocation } from '../../core/types';

const DAY = 86_400_000;
const CIVIL_EPOCH_JD = 1948439.5; // 16 July 622 (Julian)

const jdOf = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY + 2440587.5;
const isoOfJd = (jd: number) => new Date((jd - 2440587.5) * DAY).toISOString().slice(0, 10);

export function tabularToJd(y: number, m: number, d: number): number {
  return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + CIVIL_EPOCH_JD - 1;
}
export function tabularFromIso(iso: string): { year: number; month: number; day: number } {
  const jd = Math.floor(jdOf(iso)) + 0.5;
  const year = Math.floor((30 * (jd - CIVIL_EPOCH_JD) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jd - (29 + tabularToJd(year, 1, 1))) / 29.5) + 1);
  const day = jd - tabularToJd(year, month, 1) + 1;
  return { year, month, day };
}
export function isoFromTabular(y: number, m: number, d: number): string {
  return isoOfJd(tabularToJd(y, m, d));
}

export const CRESCENT = { minAltitude: 5, minElongation: 10, minAgeHours: 18 };

/** Evening check: is the new crescent likely visible after sunset on civil date `iso`? */
export function crescentLikely(iso: string, loc: GeoLocation = KATHMANDU): { visible: boolean; ageHours: number; altitude: number; elongation: number } {
  const { sunset } = sunriseSunset(iso, loc);
  const t = new Date(sunset.getTime() + 10 * 60_000);
  const nm = A.SearchMoonPhase(0, new Date(t.getTime() - 3 * DAY), 3);
  const ageHours = nm ? (t.getTime() - nm.date.getTime()) / 3_600_000 : -1;
  const obs = new A.Observer(loc.lat, loc.lon, loc.height ?? 0);
  const eq = A.Equator(A.Body.Moon, t, obs, true, true);
  const hor = A.Horizon(t, obs, eq.ra, eq.dec, 'normal');
  const elongation = A.AngleFromSun(A.Body.Moon, t);
  const visible = ageHours >= CRESCENT.minAgeHours && hor.altitude >= CRESCENT.minAltitude && elongation >= CRESCENT.minElongation;
  return { visible, ageHours, altitude: hor.altitude, elongation };
}

/** Expected civil date of the 1st of a Hijri month (month starts the day after the crescent evening). */
export function expectedMonthStart(hy: number, hm: number, loc: GeoLocation = KATHMANDU): string {
  const approx = isoFromTabular(hy, hm, 1);
  const nm = A.SearchMoonPhase(0, new Date(Date.parse(`${approx}T00:00:00Z`) - 5 * DAY), 10);
  if (!nm) return approx;
  let d = localDate(nm.date, loc.tz);
  for (let i = 0; i < 3; i++) {
    if (crescentLikely(d, loc).visible) return addDays(d, 1);
    d = addDays(d, 1);
  }
  return d; // 30-day month completion
}

/** Expected civil date(s) of Hijri month/day falling in Gregorian year `gy`. */
export function expectedHijriDate(hm: number, hd: number, gy: number, loc: GeoLocation = KATHMANDU): string[] {
  const out: string[] = [];
  const h0 = tabularFromIso(`${gy}-01-01`).year;
  for (const hy of [h0 - 1, h0, h0 + 1]) {
    const iso = addDays(expectedMonthStart(hy, hm, loc), hd - 1);
    if (iso.startsWith(String(gy)) && !out.includes(iso)) out.push(iso);
  }
  return out.sort();
}

/** Hijri date for a civil day using expected month starts (falls back to tabular). */
export function hijriOf(iso: string, loc: GeoLocation = KATHMANDU): { year: number; month: number; day: number; basis: 'expected' } {
  const t = tabularFromIso(iso);
  for (const [y, m] of [[t.year, t.month], t.month === 12 ? [t.year + 1, 1] : [t.year, t.month + 1], t.month === 1 ? [t.year - 1, 12] : [t.year, t.month - 1]]) {
    const start = expectedMonthStart(y, m, loc);
    const diff = Math.round((Date.parse(iso) - Date.parse(start)) / DAY);
    if (diff >= 0 && diff < 30) {
      const next = expectedMonthStart(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, loc);
      if (iso < next) return { year: y, month: m, day: diff + 1, basis: 'expected' };
    }
  }
  return { ...t, basis: 'expected' };
}

export const HIJRI_MONTHS = [
  { ar: 'مُحَرَّم', dev: 'मुहर्रम', en: 'Muharram' }, { ar: 'صَفَر', dev: 'सफर', en: 'Safar' },
  { ar: 'رَبِيع ٱلْأَوَّل', dev: 'रबी-उल-अव्वल', en: 'Rabi al-Awwal' }, { ar: 'رَبِيع ٱلثَّانِي', dev: 'रबी-उस-सानी', en: 'Rabi al-Thani' },
  { ar: 'جُمَادَىٰ ٱلْأُولَىٰ', dev: 'जमादी-उल-अव्वल', en: 'Jumada al-Ula' }, { ar: 'جُمَادَىٰ ٱلثَّانِيَة', dev: 'जमादी-उस-सानी', en: 'Jumada al-Thaniya' },
  { ar: 'رَجَب', dev: 'रजब', en: 'Rajab' }, { ar: 'شَعْبَان', dev: 'शाबान', en: "Sha'ban" },
  { ar: 'رَمَضَان', dev: 'रमजान', en: 'Ramadan' }, { ar: 'شَوَّال', dev: 'शव्वाल', en: 'Shawwal' },
  { ar: 'ذُو ٱلْقَعْدَة', dev: 'जिल्काद', en: "Dhu al-Qa'dah" }, { ar: 'ذُو ٱلْحِجَّة', dev: 'जिलहिज्जा', en: 'Dhu al-Hijjah' },
];
