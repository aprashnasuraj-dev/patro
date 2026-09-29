import { describe, expect, it } from 'vitest';
import { occurrences, ruleFromDate, nextOccurrences } from '../src/patro-tools/tithi-events/engine';
import { buildReminders, toICS } from '../src/patro-tools/tithi-events/events';

const dates = (r: Parameters<typeof occurrences>[0]) => occurrences(r, '2024-01-01', '2025-12-31').map((o) => o.date);

describe('observance rules reproduce Nepal festival dates', () => {
  it('Vijaya Dashami (aparahna): 2024-10-12, 2025-10-02', () => {
    expect(dates({ month: 6, paksha: 'shukla', tithi: 10, observance: 'aparahna' })).toEqual(['2024-10-12', '2025-10-02']);
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
    expect(rule).toMatchObject({ month: 6, paksha: 'shukla', tithi: 10 });
    expect(nextOccurrences(rule, '2025-10-01', 1)[0].date).toBe('2025-10-02');
  });
  it('builds 7/1/0-day reminders at 07:00 NPT', () => {
    const r = buildReminders({
      id: 'x', kind: 'shraddha', title: 'आमाको श्राद्ध',
      rule: { month: 7, paksha: 'krishna', tithi: 8, observance: 'aparahna' },
      remindDaysBefore: [7, 1, 0], remindAt: '07:00',
    }, '2026-09-29');
    expect(r).toHaveLength(3);
    expect(r[2].fireAt.toISOString().slice(11, 16)).toBe('01:15'); // 07:00 NPT
    expect(r[1].body).toContain('भोलि');
  });
  it('ICS feed is valid-ish', () => {
    const ics = toICS([{ id: 'b', kind: 'tithi_birthday', title: 'बुबाको जन्मदिन', rule: { month: 6, paksha: 'shukla', tithi: 10, observance: 'udaya' }, remindDaysBefore: [1], remindAt: '07:00' }], '2026-01-01', 2);
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
