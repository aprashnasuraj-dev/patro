/**
 * New-parent timeline: न्वारन, पास्नी, vaccination — in BS and AD.
 */
import { addDays } from '../core/astro';
import type { BsAdapter } from '../core/types';
import { findSait, type Person, type SaitResult } from '../sait/finder';

export interface TimelineItem {
  key: string;
  title: string;
  /** yyyy-mm-dd AD */
  date: string;
  /** "२०८३-०६-१३" if a BS adapter is provided */
  bs?: string;
  note?: string;
}

/**
 * ⚠️ VERIFY BEFORE LAUNCH against the current national immunization schedule
 * (Family Welfare Division, Department of Health Services). Schedules change
 * (e.g. new vaccines). Keep this as remote config, not hard-coded, and show
 * "स्वास्थ्यकर्मीसँग सल्लाह लिनुहोस्" on the screen.
 */
export const VACCINE_SCHEDULE: { days: number; vaccines: string }[] = [
  { days: 0, vaccines: 'बीसीजी (BCG)' },
  { days: 42, vaccines: 'पेन्टाभ्यालेन्ट–१, ओपीभी–१, पीसीभी–१, रोटा–१, एफआईपीभी–१' },
  { days: 70, vaccines: 'पेन्टाभ्यालेन्ट–२, ओपीभी–२, पीसीभी–२, रोटा–२' },
  { days: 98, vaccines: 'पेन्टाभ्यालेन्ट–३, ओपीभी–३, एफआईपीभी–२' },
  { days: 274, vaccines: 'दादुरा-रुबेला (MR)–१, पीसीभी–३' },
  { days: 365, vaccines: 'जापानिज इन्सेफलाइटिस (JE)' },
  { days: 456, vaccines: 'दादुरा-रुबेला (MR)–२, टाइफाइड (TCV)' },
];

function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
}

export function babyTimeline(birthDate: string, gender: 'm' | 'f', bs?: BsAdapter): TimelineItem[] {
  const toBs = (ad: string) => {
    if (!bs) return undefined;
    const [year, month, day] = ad.split('-').map(Number);
    const b = bs.toBS({ year, month, day });
    return `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`;
  };
  const items: TimelineItem[] = [
    { key: 'nwaran', title: 'न्वारन (११ औं दिन)', date: addDays(birthDate, 10), note: 'कुल परम्परा अनुसार फरक हुन सक्छ' },
    {
      key: 'pasni',
      title: gender === 'm' ? 'पास्नी (छोरा — छैटौं महिना)' : 'पास्नी (छोरी — पाँचौं महिना)',
      date: addMonths(birthDate, gender === 'm' ? 6 : 5),
      note: 'यो महिनाभित्रको शुभ साइत तल हेर्नुहोस्',
    },
    ...VACCINE_SCHEDULE.map((v, i) => ({ key: `vaccine-${i}`, title: `खोप: ${v.vaccines}`, date: addDays(birthDate, v.days) })),
  ];
  return items.map((it) => ({ ...it, bs: toBs(it.date) }));
}

/** Pasni saits inside the traditional window (5th/6th month). */
export function pasniSaits(birthDate: string, gender: 'm' | 'f', baby?: Person): SaitResult[] {
  const start = addMonths(birthDate, gender === 'm' ? 5 : 4);
  const end = addDays(addMonths(birthDate, gender === 'm' ? 7 : 6), -1);
  return findSait({ kind: 'namakaran', from: start, to: end, people: baby ? [baby] : [] });
}
