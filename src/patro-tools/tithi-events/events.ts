/**
 * Personal tithi events + reminder schedule + ICS (Google/Apple Calendar) feed.
 */
import { addDays, zonedMidnight } from '../core/astro';
import { formatLunarDate } from '../core/names';
import type { GeoLocation } from '../core/types';
import { KATHMANDU } from '../core/types';
import { nextOccurrences, type Occurrence, type Observance, type TithiRule } from './engine';

export type EventKind = 'shraddha' | 'tithi_birthday' | 'puja' | 'vrata' | 'custom';

export const DEFAULT_OBSERVANCE: Record<EventKind, Observance> = {
  shraddha: 'aparahna',
  tithi_birthday: 'udaya',
  puja: 'udaya',
  vrata: 'udaya',
  custom: 'udaya',
};

export interface PersonalTithiEvent {
  id: string;
  kind: EventKind;
  /** "आमाको श्राद्ध", "बुबाको तिथि जन्मदिन" */
  title: string;
  rule: TithiRule;
  /** days before the event; 0 = morning of */
  remindDaysBefore: number[];
  /** local hh:mm for reminders */
  remindAt: string;
  location?: GeoLocation;
  familyId?: string;
  notes?: string;
}

export interface Reminder {
  eventId: string;
  fireAt: Date;
  daysBefore: number;
  title: string;
  body: string;
  occurrence: Occurrence;
}

const SAMAGRI: Partial<Record<EventKind, string>> = {
  shraddha: 'तिल, जौ, कुश, चामल, पिण्डको सामग्री, दक्षिणा — पुरोहितलाई समय पक्का गर्नुहोस्।',
  puja: 'पूजा सामग्री, फूल, प्रसाद तयार गर्नुहोस्।',
};

function reminderBody(ev: PersonalTithiEvent, days: number, occ: Occurrence): string {
  const lunar = formatLunarDate(ev.rule.month, ev.rule.paksha, ev.rule.paksha === 'shukla' ? ev.rule.tithi : ev.rule.tithi + 15);
  if (days === 0) return `आज ${ev.title} (${lunar})।`;
  if (days === 1) return `भोलि ${ev.title} (${lunar})। ${SAMAGRI[ev.kind] ?? ''}`.trim();
  return `${days} दिनपछि ${ev.title} — ${occ.date} (${lunar})। ${SAMAGRI[ev.kind] ?? ''}`.trim();
}

/** Reminders for the next `count` occurrences — feed these to your push/Viber queue. */
export function buildReminders(ev: PersonalTithiEvent, fromDate: string, count = 1): Reminder[] {
  const loc = ev.location ?? KATHMANDU;
  const [h, m] = ev.remindAt.split(':').map(Number);
  const out: Reminder[] = [];
  for (const occ of nextOccurrences(ev.rule, fromDate, count, loc)) {
    for (const days of ev.remindDaysBefore) {
      const d = addDays(occ.date, -days);
      const fireAt = new Date(zonedMidnight(d, loc.tz).getTime() + (h * 60 + m) * 60_000);
      out.push({ eventId: ev.id, fireAt, daysBefore: days, title: ev.title, body: reminderBody(ev, days, occ), occurrence: occ });
    }
  }
  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

// ---------------------------------------------------------------------------
// ICS feed — serve at /api/calendar/[token].ics so users can subscribe
// from Google Calendar / Apple Calendar / Outlook. Your brand inside every calendar.
// ---------------------------------------------------------------------------
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const icsDate = (d: string) => d.replace(/-/g, '');
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function toICS(events: PersonalTithiEvent[], fromDate: string, years = 3, calName = 'मेरो पात्रो'): string {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//आफ्नै पात्रो//Tithi Events//NE', 'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(calName)}`, 'X-WR-TIMEZONE:Asia/Kathmandu', 'REFRESH-INTERVAL;VALUE=DURATION:P1D',
  ];
  for (const ev of events) {
    for (const occ of nextOccurrences(ev.rule, fromDate, years, ev.location ?? KATHMANDU)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}-${occ.date}@आफ्नै पात्रो`,
        `DTSTAMP:${stamp()}`,
        `DTSTART;VALUE=DATE:${icsDate(occ.date)}`,
        `DTEND;VALUE=DATE:${icsDate(addDays(occ.date, 1))}`,
        `SUMMARY:${esc(ev.title)}`,
        `DESCRIPTION:${esc(reminderBody(ev, 0, occ))}`,
        ...(ev.remindDaysBefore.filter((d) => d > 0).map((d) => [
          'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(ev.title)}`, `TRIGGER:-P${d}D`, 'END:VALARM',
        ]).flat()),
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  // RFC 5545 line folding (75 octets)
  return lines.map(foldLine).join('\r\n');
}

function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; }
    cur += ch; len += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}
