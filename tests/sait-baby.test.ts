import { describe, expect, it } from 'vitest';
import { findSait, taraBala, chandraBala } from '../src/patro-tools/sait/finder';
import { birthStar, namesForSyllables } from '../src/patro-tools/baby/nakshatra-names';

describe('sait', () => {
  it('tara & chandra bala', () => {
    expect(taraBala(0, 2)).toMatchObject({ tara: 3, good: false }); // विपत्
    expect(taraBala(0, 1).good).toBe(true);
    expect(chandraBala(0, 5)).toMatchObject({ house: 6, good: true });
    expect(chandraBala(0, 7)).toMatchObject({ house: 8, good: false });
  });
  it('no vivah sait during chaturmas or kharmas; official dates always shown', () => {
    const r = findSait({ kind: 'vivah', from: '2026-08-01', to: '2027-01-31', officialDates: ['2026-09-01'] });
    expect(r[0].official).toBe(true);
    const computed = r.filter((x) => !x.official).map((x) => x.date);
    expect(computed.every((d) => d >= '2026-11-01')).toBe(true); // chaturmas ends ~Nov
    expect(computed.some((d) => d >= '2026-12-16' && d <= '2027-01-13')).toBe(false); // धनु खरमास
  });
});

describe('baby names', () => {
  it('birth star + syllables', () => {
    const b = birthStar(new Date('2026-09-29T03:00:00Z'));
    expect(b.nakshatraName).toBe('अश्विनी');
    expect(b.nakshatraSyllables).toEqual(['चु', 'चे', 'चो', 'ला']);
  });
  it('bare consonant syllable only matches consonant+a', () => {
    const [gha] = namesForSyllables(['घ']);
    expect(gha.names.map((n) => n.name)).toEqual(['घनश्याम']);
    const [vi] = namesForSyllables(['वी'], { gender: 'f' });
    expect(vi.names.map((n) => n.name)).toContain('वीणा');
  });
});
