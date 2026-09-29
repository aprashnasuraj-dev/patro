/**
 * Festival resolver used by the bots ("dashain kahile?") and the birth-day
 * front page ("born 3 days after Tihar").
 *
 * Source of truth order:
 *   1. your official festival table (from the Panchang Samiti list) — pass as `official`
 *   2. these computed rules (fallback for far years / verification in CI)
 */
import { addDays, sunriseSunset } from '../core/astro';
import { defaultPanchang } from '../core/provider';
import { KATHMANDU } from '../core/types';
import { nextOccurrences, type TithiRule } from '../tithi-events/engine';

export interface FestivalDef {
  id: string;
  name: string;
  /** keywords users type — Roman + Devanagari */
  aliases: string[];
  rule: TithiRule | { sankranti: number };
}

export const FESTIVALS: FestivalDef[] = [
  { id: 'ghatasthapana', name: 'घटस्थापना', aliases: ['ghatasthapana', 'घटस्थापना', 'navaratri', 'नवरात्र'], rule: { month: 6, paksha: 'shukla', tithi: 1, observance: 'udaya' } },
  { id: 'dashain', name: 'विजया दशमी (दशैं टीका)', aliases: ['dashain', 'dasain', 'दशैं', 'दशैँ', 'tika', 'टीका', 'vijaya dashami'], rule: { month: 6, paksha: 'shukla', tithi: 10, observance: 'aparahna', prefer: 'last' } },
  // ↑ 'last': when Dashami touches aparahna on two days, Nepal takes the later day (2026-10-21, MoHA list)
  { id: 'laxmipuja', name: 'लक्ष्मी पूजा (तिहार)', aliases: ['tihar', 'तिहार', 'laxmi puja', 'लक्ष्मी पूजा', 'diwali', 'deepawali'], rule: { month: 7, paksha: 'krishna', tithi: 15, observance: 'pradosh' } },
  { id: 'bhaitika', name: 'भाइटीका', aliases: ['bhai tika', 'bhaitika', 'भाइटीका', 'भाइ टीका'], rule: { month: 7, paksha: 'shukla', tithi: 2, observance: 'udaya' } },
  { id: 'chhath', name: 'छठ', aliases: ['chhath', 'chhat', 'छठ'], rule: { month: 7, paksha: 'shukla', tithi: 6, observance: 'udaya' } },
  { id: 'teej', name: 'हरितालिका तीज', aliases: ['teej', 'tij', 'तीज'], rule: { month: 5, paksha: 'shukla', tithi: 3, observance: 'udaya' } },
  { id: 'janaipurnima', name: 'जनै पूर्णिमा', aliases: ['janai purnima', 'janai', 'जनै पूर्णिमा', 'rakhi', 'raksha bandhan'], rule: { month: 4, paksha: 'shukla', tithi: 15, observance: 'udaya' } },
  { id: 'gaijatra', name: 'गाईजात्रा', aliases: ['gai jatra', 'gaijatra', 'गाईजात्रा'], rule: { month: 5, paksha: 'krishna', tithi: 1, observance: 'udaya' } },
  { id: 'janmashtami', name: 'श्रीकृष्ण जन्माष्टमी', aliases: ['janmashtami', 'krishna janmashtami', 'जन्माष्टमी'], rule: { month: 5, paksha: 'krishna', tithi: 8, observance: 'udaya' } },
  { id: 'shivaratri', name: 'महाशिवरात्रि', aliases: ['shivaratri', 'shivratri', 'शिवरात्रि'], rule: { month: 11, paksha: 'krishna', tithi: 14, observance: 'nishitha' } },
  { id: 'holi', name: 'फागु पूर्णिमा (होली)', aliases: ['holi', 'होली', 'fagu', 'फागु'], rule: { month: 11, paksha: 'shukla', tithi: 15, observance: 'udaya' } },
  { id: 'buddhajayanti', name: 'बुद्ध जयन्ती', aliases: ['buddha jayanti', 'बुद्ध जयन्ती', 'buddha purnima'], rule: { month: 1, paksha: 'shukla', tithi: 15, observance: 'udaya' } },
  { id: 'maghesankranti', name: 'माघे संक्रान्ति', aliases: ['maghe sankranti', 'माघे संक्रान्ति', 'maghi', 'माघी'], rule: { sankranti: 9 } },
];

/** First civil day whose sunrise has the Sun in `rashi` (sidereal). */
export function nextSankranti(rashi: number, fromDate: string): string {
  let d = fromDate;
  let prev = defaultPanchang.day(d).sunRashi;
  for (let i = 0; i < 400; i++) {
    d = addDays(d, 1);
    const r = defaultPanchang.day(d).sunRashi;
    if (r === rashi && prev !== rashi) return d;
    prev = r;
  }
  throw new Error('sankranti not found');
}

const clean = (s: string) => s.toLowerCase().normalize('NFC').replace(/[?।!.,]/g, ' ').replace(/\s+/g, ' ').trim();

export function findFestival(query: string): FestivalDef | undefined {
  const q = clean(query);
  // whole-word match: "bholi" (tomorrow) must not match "holi"
  const padded = ` ${q} `;
  return FESTIVALS.find((f) => f.aliases.some((a) => padded.includes(` ${clean(a)} `)));
}

export function nextFestivalDate(f: FestivalDef, fromDate: string, official?: Record<string, string[]>): string {
  const listed = official?.[f.id]?.filter((d) => d >= fromDate).sort()[0];
  if (listed) return listed;
  if ('sankranti' in f.rule) return nextSankranti(f.rule.sankranti, addDays(fromDate, -1));
  return nextOccurrences(f.rule, fromDate, 1, KATHMANDU)[0].date;
}

/** Festivals within ±window days of a date (for the birth-day front page). */
export function festivalsNear(date: string, windowDays = 15): { festival: FestivalDef; date: string; offset: number }[] {
  const out: { festival: FestivalDef; date: string; offset: number }[] = [];
  const from = addDays(date, -windowDays);
  for (const f of FESTIVALS) {
    const d = nextFestivalDate(f, from);
    const offset = Math.round((Date.parse(d) - Date.parse(date)) / 86_400_000);
    if (Math.abs(offset) <= windowDays) out.push({ festival: f, date: d, offset });
  }
  return out.sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset));
}

export { sunriseSunset };
