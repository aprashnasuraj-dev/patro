/**
 * Nepal Sambat engine.
 *
 * LUNAR NS (traditional, used for all festivals)
 *   - months = amanta lunar months, Kachhalā (= Kārtika) first
 *   - year N starts on Kachhalā Thwa Pāru (Mha Puja) in autumn of CE N+879
 *   - intercalary month (अनला / adhik) and skipped tithis follow the amanta panchang
 *   - computed at Kathmandu sunrise, Lahiri ayanamsa (same as the rest of the app)
 *   Test vectors: NY 1134 = 2013-11-04, 1135 = 2014-10-24, 1137 = 2016-10-31,
 *                 1138 = 2017-10-20; adhik Tachhalā in 1138, adhik Kaulā in 1140.
 *
 * SOLAR NS (Lalitpur Metropolitan City, administrative, since NS 1141 / 2020)
 *   - fixed Gregorian mapping, new year = 20 October
 */
import { addDays, lunarMonthAt, sunriseSunset, weekdayOf } from '../core/astro';
import { KATHMANDU, type GeoLocation } from '../core/types';
import { nextOccurrences, occurrences } from '../tithi-events/engine';
import { nextSankranti } from '../festivals/festivals';
import { panchangAt } from '../core/astro';
import {
  NS_LEAP, NS_MONTHS, NS_PAKSHA, NS_SOLAR, NS_TITHIS_GA, NS_TITHIS_ROMAN_GA, NS_TITHIS_ROMAN_THWA, NS_TITHIS_THWA, NS_WEEKDAYS,
} from './data/calendar';
import { NS_FESTIVALS, type NsFestival } from './data/festivals';
import { devanagariToNewa, toNewaDigits } from './newa-script';
import { toNepaliDigits } from '../core/names';

const DAY = 86_400_000;
const SYNODIC = 29.530588853;
export const NS_EPOCH_OFFSET = 879;

export const amantaToNsMonth = (amantaIndex: number) => ((amantaIndex - 7 + 12) % 12) + 1;
export const nsMonthToAmanta = (nsMonth: number) => (nsMonth - 1 + 7) % 12;

export interface NsLunarDate {
  year: number;
  /** 1..12 (1 = Kachhalā) */
  month: number;
  adhik: boolean;
  kshaya: boolean;
  paksha: 'thwa' | 'ga';
  /** 1..15 */
  tithi: number;
  /** civil date this describes (sunrise tithi) */
  ad: string;
  isNewYear: boolean;
}

/** Lunar NS date for a civil day (sunrise at `loc`). */
export function nsFromAd(ad: string, loc: GeoLocation = KATHMANDU): NsLunarDate {
  const { sunrise } = sunriseSunset(ad, loc);
  const p = panchangAt(sunrise);
  const lm = lunarMonthAt(sunrise);
  const month = amantaToNsMonth(lm.amantaIndex);
  const monthsSince = month - 1;
  const approxNy = new Date(lm.start.getTime() - monthsSince * SYNODIC * DAY - 10 * DAY);
  const year = approxNy.getUTCFullYear() - NS_EPOCH_OFFSET;
  const paksha = p.paksha === 'shukla' ? 'thwa' : 'ga';
  return {
    year, month, adhik: lm.adhik, kshaya: lm.kshaya, paksha, tithi: p.tithiInPaksha, ad,
    isNewYear: month === 1 && paksha === 'thwa' && p.tithiInPaksha === 1 && !lm.adhik,
  };
}

/** Civil date of NS New Year (Mha Puja, Kachhalā Thwa Pāru, udaya) for NS `year`. */
export function nsNewYear(year: number, loc: GeoLocation = KATHMANDU): string {
  const g = year + NS_EPOCH_OFFSET;
  const occ = occurrences({ month: 7, paksha: 'shukla', tithi: 1, observance: 'udaya', system: 'amanta', adhik: 'nija' }, `${g}-10-01`, `${g}-11-30`, loc);
  if (!occ.length) throw new Error(`NS ${year}: new year not found`);
  return occ[0].date;
}

/** Lunar NS → civil date (udaya rule; kshaya tithi falls back to the day it begins). */
export function adFromNs(d: { year: number; month: number; paksha: 'thwa' | 'ga'; tithi: number; adhik?: boolean }, loc: GeoLocation = KATHMANDU): string {
  const from = nsNewYear(d.year, loc);
  const to = addDays(nsNewYear(d.year + 1, loc), -1);
  const occ = occurrences({
    month: nsMonthToAmanta(d.month), paksha: d.paksha === 'thwa' ? 'shukla' : 'krishna', tithi: d.tithi,
    observance: 'udaya', system: 'amanta', adhik: d.adhik ? 'adhik' : 'nija',
  }, from, to, loc);
  if (!occ.length) throw new Error(`NS ${d.year}-${d.month} ${d.paksha} ${d.tithi}${d.adhik ? ' (adhik)' : ''} does not exist`);
  return occ[0].date;
}

/** Which months of NS `year` are intercalary (अनला)? */
export function adhikMonthsInYear(year: number, loc: GeoLocation = KATHMANDU): number[] {
  const start = nsNewYear(year, loc);
  const end = nsNewYear(year + 1, loc);
  const out: number[] = [];
  let t = new Date(`${start}T06:00:00Z`);
  while (t.toISOString().slice(0, 10) < end) {
    const lm = lunarMonthAt(t);
    if (lm.adhik) out.push(amantaToNsMonth(lm.amantaIndex));
    t = new Date(lm.end.getTime() + DAY);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export type Script = 'dev' | 'newa' | 'roman';

export function monthLabel(month: number, adhik = false, script: Script = 'dev'): string {
  const m = NS_MONTHS[month - 1];
  if (script === 'roman') return adhik ? `${NS_LEAP.adhik.roman} (${m.roman})` : m.roman;
  const dev = adhik ? `${NS_LEAP.adhik.dev} (${m.dev})` : m.dev;
  return script === 'newa' ? devanagariToNewa(dev) : dev;
}

export function tithiLabel(paksha: 'thwa' | 'ga', tithi: number, script: Script = 'dev'): string {
  if (script === 'roman') return `${NS_PAKSHA[paksha === 'thwa' ? 'shukla' : 'krishna'].roman} ${(paksha === 'thwa' ? NS_TITHIS_ROMAN_THWA : NS_TITHIS_ROMAN_GA)[tithi - 1]}`;
  const dev = `${NS_PAKSHA[paksha === 'thwa' ? 'shukla' : 'krishna'].devLong} ${(paksha === 'thwa' ? NS_TITHIS_THWA : NS_TITHIS_GA)[tithi - 1]}`;
  return script === 'newa' ? devanagariToNewa(dev) : dev;
}

/** "ने.सं. ११४६ यंला गाः तृतीया" | "𑐣𑐾.𑐳𑑄. 𑑑𑑑𑑔𑑖 …" | "NS 1146 Yanlā Gā Tritiyā" */
export function formatNs(d: NsLunarDate, script: Script = 'dev', opts: { weekday?: boolean } = {}): string {
  const wd = opts.weekday ? ` ${NS_WEEKDAYS.dev[weekdayOf(d.ad)]}` : '';
  if (script === 'roman') return `NS ${d.year} ${monthLabel(d.month, d.adhik, 'roman')} ${tithiLabel(d.paksha, d.tithi, 'roman')}`;
  const dev = `ने.सं. ${toNepaliDigits(d.year)} ${monthLabel(d.month, d.adhik)} ${tithiLabel(d.paksha, d.tithi)}${wd}`;
  return script === 'newa' ? devanagariToNewa(dev) : dev;
}

export { toNewaDigits };

// ---------------------------------------------------------------------------
// Solar NS (Lalitpur)
// ---------------------------------------------------------------------------
export interface NsSolarDate { year: number; month: number; day: number }

const isGregLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const monthLengths = (nsYear: number) => NS_SOLAR.monthLengths.map((len, i) => (i === NS_SOLAR.leapMonthIndex && isGregLeap(nsYear + 880) ? len + 1 : len));
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export function solarNsFromAd(ad: string): NsSolarDate {
  const [y, m, d] = ad.split('-').map(Number);
  const afterNy = m > NS_SOLAR.newYear.month || (m === NS_SOLAR.newYear.month && d >= NS_SOLAR.newYear.day);
  const nsYear = (afterNy ? y : y - 1) - NS_EPOCH_OFFSET;
  const nyIso = `${nsYear + NS_EPOCH_OFFSET}-10-20`;
  let rest = Math.round((utc(ad) - utc(nyIso)) / DAY);
  const lens = monthLengths(nsYear);
  let month = 0;
  while (rest >= lens[month]) { rest -= lens[month]; month++; }
  return { year: nsYear, month: month + 1, day: rest + 1 };
}

export function adFromSolarNs(s: NsSolarDate): string {
  const lens = monthLengths(s.year);
  if (s.month < 1 || s.month > 12 || s.day < 1 || s.day > lens[s.month - 1]) throw new Error('invalid solar NS date');
  const offset = lens.slice(0, s.month - 1).reduce((a, b) => a + b, 0) + s.day - 1;
  return addDays(`${s.year + NS_EPOCH_OFFSET}-10-20`, offset);
}

// ---------------------------------------------------------------------------
// Festivals
// ---------------------------------------------------------------------------
export interface ResolvedFestival {
  festival: NsFestival;
  start: string;
  end: string;
  ns: NsLunarDate;
  /** computed vs editor-confirmed */
  confidence: 'computed' | 'confirmed';
}

/** All festivals of NS `year`, in date order. `confirmed` overrides computed dates (admin table). */
export function festivalsOfYear(year: number, opts: { loc?: GeoLocation; confirmed?: Record<string, string> } = {}): ResolvedFestival[] {
  const loc = opts.loc ?? KATHMANDU;
  const from = nsNewYear(year, loc);
  const to = addDays(nsNewYear(year + 1, loc), -1);
  const out: ResolvedFestival[] = [];
  for (const f of NS_FESTIVALS) {
    let start: string | undefined = opts.confirmed?.[`${year}:${f.id}`];
    const confidence: ResolvedFestival['confidence'] = start ? 'confirmed' : 'computed';
    if (!start) {
      if (f.anchor.kind === 'lunar') {
        const a = f.anchor;
        start = occurrences({
          month: nsMonthToAmanta(a.month), paksha: a.paksha === 'thwa' ? 'shukla' : 'krishna', tithi: a.tithi,
          observance: a.observance ?? 'udaya', prefer: a.prefer, system: 'amanta', adhik: 'nija',
        }, from, to, loc)[0]?.date;
      } else {
        const g = nextSankranti(f.anchor.rashi, from);
        start = addDays(g, f.anchor.offsetDays ?? 0);
        if (start > to) start = undefined;
      }
    }
    if (!start) continue;
    out.push({ festival: f, start, end: addDays(start, f.spanDays - 1), ns: nsFromAd(start, loc), confidence });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** Next occurrence of one festival on/after a date. */
export function nextFestival(id: string, fromAd: string, loc: GeoLocation = KATHMANDU): ResolvedFestival | undefined {
  const cur = nsFromAd(fromAd, loc).year;
  for (const y of [cur, cur + 1]) {
    const hit = festivalsOfYear(y, { loc }).find((r) => r.festival.id === id && r.start >= fromAd);
    if (hit) return hit;
  }
  return undefined;
}

export { nextOccurrences };
