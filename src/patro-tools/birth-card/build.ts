/**
 * "जन्मदिनको अखबार" — birth-day front page data.
 * Pure function: give it a birth date(+time) and your data sources, get a
 * model the <BirthFrontPage/> component renders.
 */
import { addDays, dayPanchang, panchangAt, zonedMidnight } from '../core/astro';
import { BS_MONTHS, formatLunarDate, NAKSHATRAS, RASHIS, toNepaliDigits, WEEKDAYS } from '../core/names';
import type { BsAdapter, GeoLocation } from '../core/types';
import { KATHMANDU } from '../core/types';
import { festivalsNear } from '../festivals/festivals';
import { nextOccurrences, ruleFromDate } from '../tithi-events/engine';
import { PADA_SYLLABLES } from '../baby/nakshatra-names';

/** Plug in your आज इतिहासमा / समययन्त्र database. */
export interface HistoryProvider {
  /** events on this exact date (that year) — Nepal first, then world */
  onExactDate(isoDate: string): Promise<HistoryItem[]>;
  /** events on the same BS month/day in any year */
  onSameDay?(bsMonth: number, bsDay: number): Promise<HistoryItem[]>;
}
export interface HistoryItem { title: string; year?: number; scope: 'nepal' | 'world'; kind?: 'event' | 'birth' | 'death' }

export interface BirthFrontPage {
  name?: string;
  masthead: string;
  bsLabel: string;
  adLabel: string;
  weekday: string;
  lunar: string;
  nakshatra: string;
  pada: number;
  nameSyllable: string;
  rashi: string;
  sunrise: string;
  sunset: string;
  moonPhaseAngle: number;
  moonIllumination: number; // 0..1
  moonHeadline: string;
  festivalLine?: string;
  headlines: HistoryItem[];
  sameDayInHistory: HistoryItem[];
  stats: { daysAlive: number; nextTithiBirthday: string; nextTithiBirthdayBs?: string };
  shareText: string;
}

const hhmm = (d: Date, tz: string) => d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' });

function moonHeadline(angle: number): string {
  if (angle < 12 || angle > 348) return 'औंसीको अँध्यारो रात';
  if (Math.abs(angle - 180) < 12) return 'पूर्णिमाको जून';
  if (angle < 180) return angle < 90 ? 'शुक्ल पक्षको बढ्दो जून' : 'बढ्दो जून, लगभग पूर्ण';
  return angle < 270 ? 'घट्दो जून' : 'घट्दो जून, औंसी नजिक';
}

export async function buildBirthFrontPage(input: {
  birthDate: string;      // yyyy-mm-dd AD
  birthTime?: string;     // hh:mm local
  name?: string;
  loc?: GeoLocation;
  bs: BsAdapter;
  history: HistoryProvider;
  today: string;          // yyyy-mm-dd, pass from server for stable SSR
}): Promise<BirthFrontPage> {
  const loc = input.loc ?? KATHMANDU;
  const day = dayPanchang(input.birthDate, loc);
  const instant = input.birthTime
    ? new Date(zonedMidnight(input.birthDate, loc.tz).getTime() + (Number(input.birthTime.slice(0, 2)) * 60 + Number(input.birthTime.slice(3, 5))) * 60_000)
    : day.sunrise;
  const atBirth = panchangAt(instant);
  const [y, m, d] = input.birthDate.split('-').map(Number);
  const bs = input.bs.toBS({ year: y, month: m, day: d });
  const bsLabel = `${toNepaliDigits(bs.day)} ${BS_MONTHS[bs.month - 1]} ${toNepaliDigits(bs.year)}`;

  const fest = festivalsNear(input.birthDate, 10)[0];
  const festivalLine = fest
    ? fest.offset === 0 ? `${fest.festival.name}कै दिन जन्म!`
      : fest.offset > 0 ? `${fest.festival.name}भन्दा ${toNepaliDigits(fest.offset)} दिन अघि जन्म`
      : `${fest.festival.name}को ${toNepaliDigits(-fest.offset)} दिनपछि जन्म`
    : undefined;

  const [headlines, sameDay] = await Promise.all([
    input.history.onExactDate(input.birthDate),
    input.history.onSameDay?.(bs.month, bs.day) ?? Promise.resolve([]),
  ]);

  const rule = ruleFromDate(input.birthDate, { observance: 'udaya', loc, time: input.birthTime });
  const nextTithi = nextOccurrences(rule, input.today, 1, loc)[0].date;
  const [ny, nm, nd] = nextTithi.split('-').map(Number);
  const nbs = input.bs.toBS({ year: ny, month: nm, day: nd });
  const daysAlive = Math.round((Date.parse(input.today) - Date.parse(input.birthDate)) / 86_400_000);

  const lunar = formatLunarDate(day.monthIndex, day.paksha, day.tithi, day.lunarMonth.adhik);
  const illum = (1 - Math.cos((atBirth.moonPhaseAngle * Math.PI) / 180)) / 2;

  return {
    name: input.name,
    masthead: input.name ? `${input.name} जन्मेको दिन` : 'तपाईं जन्मेको दिन',
    bsLabel,
    adLabel: new Date(`${input.birthDate}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    weekday: WEEKDAYS[day.weekday],
    lunar,
    nakshatra: NAKSHATRAS[atBirth.nakshatra],
    pada: atBirth.nakshatraPada,
    nameSyllable: PADA_SYLLABLES[atBirth.nakshatra][atBirth.nakshatraPada - 1],
    rashi: RASHIS[atBirth.moonRashi],
    sunrise: hhmm(day.sunrise, loc.tz),
    sunset: hhmm(day.sunset, loc.tz),
    moonPhaseAngle: atBirth.moonPhaseAngle,
    moonIllumination: illum,
    moonHeadline: moonHeadline(atBirth.moonPhaseAngle),
    festivalLine,
    headlines: headlines.slice(0, 5),
    sameDayInHistory: sameDay.slice(0, 5),
    stats: {
      daysAlive,
      nextTithiBirthday: nextTithi,
      nextTithiBirthdayBs: `${toNepaliDigits(nbs.day)} ${BS_MONTHS[nbs.month - 1]} ${toNepaliDigits(nbs.year)}`,
    },
    shareText: `म ${bsLabel}, ${WEEKDAYS[day.weekday]} — ${lunar}, ${NAKSHATRAS[atBirth.nakshatra]} नक्षत्रमा जन्मेँ। तपाईं कहिले? 👉`,
  };
}

export { addDays };
