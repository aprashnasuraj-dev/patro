import { describe, expect, it } from 'vitest';
import { dayPanchang } from '../src/patro-tools/core/astro';
import { formatLunarDate } from '../src/patro-tools/core/names';
import { KATHMANDU } from '../src/patro-tools/core/types';

const t = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' });

describe('panchang core (Kathmandu)', () => {
  it('29 Sep 2026 = आश्विन कृष्ण तृतीया, sunrise 05:55, sunset 17:52 (matches live app)', () => {
    const p = dayPanchang('2026-09-29', KATHMANDU);
    expect(formatLunarDate(p.monthIndex, p.paksha, p.tithi)).toBe('आश्विन कृष्ण तृतीया');
    expect(p.paksha).toBe('krishna');
    expect(p.tithiInPaksha).toBe(3);
    expect(t(p.sunrise)).toBe('05:55');
    expect(t(p.sunset)).toBe('17:52');
    expect(p.sunrise.getTime()).toBeLessThan(p.sunset.getTime());
    expect(Number.isFinite(p.sunrise.getTime())).toBe(true);
    expect(Number.isFinite(p.sunset.getTime())).toBe(true);
  });
  it('udaya tithi on 12 Oct 2024 is still Navami (Dashami starts later that day)', () => {
    const p = dayPanchang('2024-10-12', KATHMANDU);
    expect(p.tithi).toBe(9);
    expect(p.tithiInPaksha).toBe(9);
    expect(t(p.tithiEnds)).toBe('11:14');
    expect(p.tithiEnds.getTime()).toBeGreaterThan(p.sunrise.getTime());
    expect(p.tithiEnds.getTime()).toBeLessThan(p.sunset.getTime());
  });
});
