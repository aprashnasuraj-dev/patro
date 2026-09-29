import { describe, expect, it } from 'vitest';
import { adFromNs, adFromSolarNs, adhikMonthsInYear, festivalsOfYear, formatNs, nsFromAd, nsNewYear, solarNsFromAd } from '../src/patro-tools/nepal-sambat/engine';
import { devanagariToNewa, newaToDevanagari, toNewaDigits } from '../src/patro-tools/nepal-sambat/newa-script';

describe('Newa script', () => {
  it('matches published spellings', () => {
    expect(devanagariToNewa('कछला')).toBe('𑐎𑐕𑐮𑐵'); // Wikipedia
    expect(devanagariToNewa('यंला')).toBe('𑐫𑑄𑐮𑐵'); // live app API
  });
  it('folds murmured letters and round-trips', () => {
    expect([...devanagariToNewa('म्ह')].length).toBe(1); // MHA
    expect(newaToDevanagari(devanagariToNewa('म्हपूजा न्हूदँ ल्हुति'))).toBe('म्हपूजा न्हूदँ ल्हुति');
    expect(toNewaDigits(1147)).toBe('𑑑𑑑𑑔𑑗');
  });
});

describe('lunar Nepal Sambat', () => {
  it.each([
    [1134, '2013-11-04'], [1135, '2014-10-24'], [1137, '2016-10-31'], [1138, '2017-10-20'], // published vectors
    [1147, '2026-11-10'], // live app calendar (Mha Puja, NS 1147 begins)
  ])('NS %i new year = %s', (y, d) => { expect(nsNewYear(y)).toBe(d); });

  it('intercalary months: Tachhalā in 1138, Kaulā in 1140', () => {
    expect(adhikMonthsInYear(1138)).toEqual([8]);
    expect(adhikMonthsInYear(1140)).toEqual([12]);
  });

  it('29 Sep 2026 = NS 1146 Yanlā Gā Tritiyā (matches live app API)', () => {
    const d = nsFromAd('2026-09-29');
    expect(d).toMatchObject({ year: 1146, month: 11, paksha: 'ga', tithi: 3, adhik: false });
    expect(formatNs(d)).toBe('ने.सं. ११४६ यंला गाः तृतीया');
    expect(formatNs(d, 'roman')).toBe('NS 1146 Yanlā Gā Tritiyā');
    expect(adFromNs({ year: 1146, month: 11, paksha: 'ga', tithi: 3 })).toBe('2026-09-29');
  });

  it('adhik month: 2026-06-01 = अनला (तछला) गाः पारु (live app API also returns adhika=true, ga, Pāru)', () => {
    const d = nsFromAd('2026-06-01');
    expect(d).toMatchObject({ year: 1146, month: 8, adhik: true, paksha: 'ga', tithi: 1 });
    expect(formatNs(d)).toBe('ने.सं. ११४६ अनला (तछला) गाः पारु');
  });

  it('year boundary: the day of Mha Puja starts the new year', () => {
    expect(nsFromAd('2026-11-09').year).toBe(1146);
    expect(nsFromAd('2026-11-10')).toMatchObject({ year: 1147, month: 1, paksha: 'thwa', tithi: 1, isNewYear: true });
  });
});

describe('solar Nepal Sambat (Lalitpur)', () => {
  it('source examples', () => {
    expect(solarNsFromAd('2001-06-01')).toEqual({ year: 1121, month: 8, day: 15 });
    expect(adFromSolarNs({ year: 1121, month: 8, day: 15 })).toBe('2001-06-01');
    for (const y of [2023, 2024, 2026, 2099]) {
      expect(solarNsFromAd(`${y}-12-25`)).toMatchObject({ month: 3, day: 7 });
      expect(solarNsFromAd(`${y + 1}-01-01`)).toMatchObject({ month: 3, day: 14 });
      expect(solarNsFromAd(`${y}-10-20`)).toEqual({ year: y - 879, month: 1, day: 1 });
    }
  });
  it('round-trips every day for 3 years incl. a leap year', () => {
    let d = '2023-10-20';
    for (let i = 0; i < 1100; i++) {
      expect(adFromSolarNs(solarNsFromAd(d))).toBe(d);
      d = new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    }
  });
});

describe('festivals NS 1146 match the national calendar (live app / MoHA list)', () => {
  const byId = Object.fromEntries(festivalsOfYear(1146).map((r) => [r.festival.id, r.start]));
  it.each([
    ['kwati-punhi', '2026-08-28'], ['sa-paru', '2026-08-29'], ['krishna-janmashtami', '2026-09-04'],
    ['nalaswane', '2026-10-11'], ['mohani-tika', '2026-10-21'], ['kwah-puja', '2026-11-07'], ['laxmi-puja', '2026-11-08'],
  ])('%s → %s', (id, date) => { expect(byId[id]).toBe(date); });
  it('Kija Puja of 1147 is the day after Mha Puja', () => {
    const y = Object.fromEntries(festivalsOfYear(1147).map((r) => [r.festival.id, r.start]));
    expect(y['mha-puja']).toBe('2026-11-10');
    expect(y['kija-puja']).toBe('2026-11-11');
  });
});
