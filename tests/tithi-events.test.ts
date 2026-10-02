import { describe, expect, it } from 'vitest';
import { occurrences, ruleFromDate, nextOccurrences } from '../src/patro-tools/tithi-events/engine';
import { buildReminders, toICS } from '../src/patro-tools/tithi-events/events';

const resolved = (r: Parameters<typeof occurrences>[0], from = '2024-01-01', to = '2025-12-31') => {
  const rows = occurrences(r, from, to);
  expect(rows.every((o) => !o.fallback && o.coverage > 0 && o.coverage <= 1)).toBe(true);
  expect(new Set(rows.map((o) => o.date)).size).toBe(rows.length);
  return rows;
};
const dates = (r: Parameters<typeof occurrences>[0]) => resolved(r).map((o) => o.date);

describe('observance rules reproduce Nepal festival dates', () => {
  it('Vijaya Dashami (aparahna): 2024-10-12, 2025-10-02', () => {
    expect(dates({ month: 6, paksha: 'shukla', tithi: 10, observance: 'aparahna' })).toEqual(['2024-10-12', '2025-10-02']);
  });
  it('Vijaya Dashami 2026 = 2026-10-21 (official MoHA list; Dashami covers aparahna on both days)', () => {
    const rows = resolved({ month: 6, paksha: 'shukla', tithi: 10, observance: 'aparahna', prefer: 'last' }, '2024-01-01', '2026-12-31');
    expect(rows.map((o) => o.date)).toEqual(['2024-10-12', '2025-10-02', '2026-10-21']);
    expect(rows.at(-1)?.coverage).toBeGreaterThan(0);
  });
  it('Laxmi Puja (pradosh, later day): 2024-11-01, 2025-10-21', () => {
    expect(dates({ month: 7, paksha: 'krishna', tithi: 15, observance: 'pradosh' })).toEqual(['2024-11-01', '2025-10-21']);
  });
  it('Ghatasthapana (udaya): 2024-10-03, 2025-09-22', () => {
    expect(dates({ month: 6, paksha: 'shukla', tithi: 1, observance: 'udaya' })).toEqual(['2024-10-03', '2025-09-22']);
  });
  it('Haritalika Teej (udaya): 2024-09-06, 2025-08-26', () => {
    expect(dates({ month: 5, paksha: 'shukla', tithi: 3, observance: 'udaya' })).toEqual(['2024-09-06', '2025-08-26']);
  });
});

describe('personal events', () => {
  it('derives a rule from a date and finds it again next year', () => {
    const rule = ruleFromDate('2025-10-02', { observance: 'udaya' });
    expect(rule).toMatchObject({ month: 6, paksha: 'shukla', tithi: 10, observance: 'udaya', system: 'purnimanta', adhik: 'nija' });
    const next = nextOccurrences(rule, '2025-10-01', 2);
    expect(next[0].date).toBe('2025-10-02');
    expect(next).toHaveLength(2);
    expect(next[1].date > next[0].date).toBe(true);
    expect(next.every((o) => !o.fallback && o.coverage === 1)).toBe(true);
  });
  it('builds 7/1/0-day reminders at 07:00 NPT', () => {
    const r = buildReminders({
      id: 'x', kind: 'shraddha', title: 'आमाको श्राद्ध',
      rule: { month: 7, paksha: 'krishna', tithi: 8, observance: 'aparahna' },
      remindDaysBefore: [7, 1, 0], remindAt: '07:00',
    }, '2026-09-29');
    expect(r).toHaveLength(3);
    expect(r.map((x) => x.daysBefore)).toEqual([7, 1, 0]);
    expect(r.every((x) => x.eventId === 'x' && x.title === 'आमाको श्राद्ध')).toBe(true);
    expect(r.map((x) => x.fireAt.getTime())).toEqual([...r].map((x) => x.fireAt.getTime()).sort((a, b) => a - b));
    expect(new Set(r.map((x) => x.fireAt.toISOString())).size).toBe(3);
    expect(r.every((x) => x.fireAt.toISOString().slice(11, 16) === '01:15')).toBe(true); // 07:00 NPT
    expect(r[0].body).toContain('7 दिनपछि');
    expect(r[1].body).toContain('भोलि');
    expect(r[2].body).toContain('आज');
  });
  it('ICS feed is RFC-folded, escaped and permanently Aafnai Patro branded', () => {
    const ics = toICS([{ id: 'b', kind: 'tithi_birthday', title: 'A,B;C\nD', rule: { month: 6, paksha: 'shukla', tithi: 10, observance: 'udaya' }, remindDaysBefore: [7, 1], remindAt: '07:00' }], '2026-01-01', 2);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('PRODID:-//Aafnai Patro//Tithi Events//NE');
    expect(ics).toContain('X-WR-CALNAME:आफ्नै पात्रो');
    expect(ics).toContain('SUMMARY:A\\,B\\;C\\nD');
    expect(ics).not.toMatch(/Mero Patro|meropatro|मेरो पात्रो/i);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/@aafnaipatro/g)).toHaveLength(2);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(4);
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
