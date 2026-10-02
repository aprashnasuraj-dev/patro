import { describe, expect, it } from 'vitest';
import { findSait, taraBala, chandraBala } from '../src/patro-tools/sait/finder';
import { birthStar, namesForSyllables } from '../src/patro-tools/baby/nakshatra-names';

describe('sait', () => {
  it('tara & chandra bala', () => {
    expect(taraBala(0, 2)).toMatchObject({ tara: 3, good: false }); // विपत्
    expect(taraBala(0, 1).good).toBe(true);
    expect(taraBala(26, 0)).toMatchObject({ tara: 2, good: true }); // 27→0 wrap
    expect(Array.from({ length: 27 }, (_, day) => taraBala(0, day).tara).every((tara) => tara >= 1 && tara <= 9)).toBe(true);
    expect(chandraBala(0, 5)).toMatchObject({ house: 6, good: true });
    expect(chandraBala(0, 7)).toMatchObject({ house: 8, good: false });
    expect(chandraBala(11, 0)).toMatchObject({ house: 2, good: false }); // zodiac wrap
  });
  it('no vivah sait during chaturmas or kharmas; official dates always shown', () => {
    const r = findSait({ kind: 'vivah', from: '2026-08-01', to: '2027-01-31', officialDates: ['2026-09-01'] });
    expect(r.length).toBeGreaterThan(1);
    expect(r[0]).toMatchObject({ date: '2026-09-01', official: true });
    expect(r[0].reasons.join(' ')).toContain('आधिकारिक साइत');
    expect(new Set(r.map((x) => x.date)).size).toBe(r.length);
    expect(r.every((x) => x.score >= 0 && x.score <= 100 && x.date >= '2026-08-01' && x.date <= '2027-01-31')).toBe(true);
    const computed = r.filter((x) => !x.official);
    expect(computed.every((x) => x.date >= '2026-11-01')).toBe(true); // chaturmas ends ~Nov
    expect(computed.some((x) => x.date >= '2026-12-16' && x.date <= '2027-01-13')).toBe(false); // धनु खरमास
    expect(computed.every((x, i) => i === 0 || computed[i - 1].score >= x.score)).toBe(true);
  });
});

describe('baby names', () => {
  it('birth star + syllables', () => {
    const b = birthStar(new Date('2026-09-29T03:00:00Z'));
    expect(b.nakshatraName).toBe('अश्विनी');
    expect(b.nakshatraSyllables).toEqual(['चु', 'चे', 'चो', 'ला']);
    expect(b.pada).toBeGreaterThanOrEqual(1);
    expect(b.pada).toBeLessThanOrEqual(4);
    expect(b.syllable).toBe(b.nakshatraSyllables[b.pada - 1]);
    expect(b.rashi).toBeGreaterThanOrEqual(0);
    expect(b.rashi).toBeLessThan(12);
    expect(b.rashiName.length).toBeGreaterThan(0);
  });
  it('bare consonant syllable only matches consonant+a', () => {
    const [gha] = namesForSyllables(['घ']);
    expect(gha.syllable).toBe('घ');
    expect(gha.names.map((n) => n.name)).toEqual(['घनश्याम']);
    expect(new Set(gha.names.map((n) => n.name)).size).toBe(gha.names.length);
    const [vi] = namesForSyllables(['वी'], { gender: 'f' });
    expect(vi.syllable).toBe('वी');
    expect(vi.names.map((n) => n.name)).toContain('वीणा');
    expect(vi.names.every((n) => n.gender === 'f' || n.gender === 'u')).toBe(true);
    expect(new Set(vi.names.map((n) => n.name)).size).toBe(vi.names.length);
  });
});
