import { describe, expect, it } from 'vitest';
import { SUITES } from '../src/patro-tools/communities/registry';
import { resolveFestival, suiteCalendar } from '../src/patro-tools/communities/shared/resolve';
import { animalOf, elementOf, eraYear } from '../src/patro-tools/communities/shared/cycles';
import { lhoFor } from '../src/patro-tools/communities/lhosar/lho';
import { expectedMonthStart, tabularFromIso, isoFromTabular, hijriOf } from '../src/patro-tools/communities/hijri/calendar';
import { prayerTimes, qibla } from '../src/patro-tools/communities/hijri/prayer';
import { yeleNewYear, yeleYear } from '../src/patro-tools/communities/kirat/yele';
import { devanagariToLimbu } from '../src/patro-tools/communities/kirat/limbu';
import { devanagariToTirhuta, tirhutaToDevanagari } from '../src/patro-tools/communities/mithila/tirhuta';
import { KATHMANDU } from '../src/patro-tools/core/types';

const date = (suite: keyof typeof SUITES, id: string, y: number) => {
  const s = SUITES[suite];
  return resolveFestival(s.festivals.find((f) => f.id === id)!, y, s).filter((r) => !r.region)[0]?.main;
};

describe('Lhosar — matches published dates', () => {
  it.each([
    ['sonam-lhosar', 2022, '2022-02-02'], ['sonam-lhosar', 2023, '2023-01-22'], ['sonam-lhosar', 2024, '2024-02-10'], ['sonam-lhosar', 2025, '2025-01-30'], ['sonam-lhosar', 2026, '2026-01-19'], // Radio Nepal 2026
    ['gyalpo-lhosar', 2025, '2025-02-28'], ['gyalpo-lhosar', 2026, '2026-02-18'], // Losar 2152 / 2153
    ['tamu-lhosar', 2025, '2025-12-30'], // Poush 15 2082
    ['tamu-lhosar', 2026, '2026-12-30'], // Poush 15 2083 (app archive: Poush 1 = 16 Dec)
    ['gyalpo-lhosar', 2014, '2014-03-02'], ['gyalpo-lhosar', 2016, '2016-02-09'], ['gyalpo-lhosar', 2017, '2017-02-27'],
    ['gyalpo-lhosar', 2019, '2019-02-05'], ['gyalpo-lhosar', 2021, '2021-02-12'], ['gyalpo-lhosar', 2022, '2022-03-03'],
    ['gyalpo-lhosar', 2024, '2024-02-10'], ['gyalpo-lhosar', 2027, '2027-02-07'], // published Losar dates
  ])('%s %i → %s', (id, y, d) => { expect(date('lhosar', id as string, y as number)).toBe(d); });

  it('animal/element/era', () => {
    expect(animalOf('tamang', 2026).en).toBe('Horse');
    expect(animalOf('gurung', 2023).en).toBe('Cat'); // Gurung: cat replaces rabbit
    expect(elementOf(2026)).toMatchObject({ en: 'Fire', gender: 'male' });
    expect(eraYear('tamang', 2026)).toBe(2862);
    expect(eraYear('tibetan', 2026)).toBe(2153);
  });
  it('year boundaries per community', () => {
    const before = lhoFor('2026-01-18'); // day before Sonam Lhosar
    expect(before.tamang.en).toBe('Snake');
    expect(lhoFor('2026-01-19').tamang.en).toBe('Horse');
    expect(lhoFor('2026-02-17').tibetan.en).toBe('Snake');
    expect(lhoFor('2025-12-30').gurung.en).toBe('Horse'); // Tamu Lhosar 2025 opens the Horse lho
    expect(lhoFor('2025-12-29').gurung.en).toBe('Snake'.replace('Snake', 'Serpent'));
  });
});

describe('Tharu', () => {
  it('Maghi = Magh 1 (Makar Sankranti), span Poush 28 → Magh 2', () => {
    const r = resolveFestival(SUITES.tharu.festivals.find((f) => f.id === 'maghi')!, 2026, SUITES.tharu)[0];
    expect(r.main).toBe('2026-01-15');
    expect(r.start).toBe('2026-01-12');
    expect(r.end).toBe('2026-01-16');
  });
  it('Atwari = second Sunday after Janmashtami (2021 → 12 Sep, Rato Pati)', () => {
    expect(date('tharu', 'atwari', 2021)).toBe('2021-09-12');
  });
});

describe('Mithila (2026, cross-checked with the app calendar / Mithila Legacy)', () => {
  it.each([
    ['chhath', '2026-11-15'], ['kojagara', '2026-10-25'], ['sama-chakeva', '2026-11-24'], ['vivah-panchami', '2026-12-14'],
    ['jur-sital', '2026-04-15'], ['madhushravani', '2026-08-15'], ['chauth-chandra', '2026-09-15'],
  ])('%s → %s', (id, d) => { expect(date('mithila', id, 2026)).toBe(d); });
  it('Chhath spans 4 days ending with usha arghya', () => {
    const r = resolveFestival(SUITES.mithila.festivals.find((f) => f.id === 'chhath')!, 2026, SUITES.mithila)[0];
    expect([r.start, r.end]).toEqual(['2026-11-13', '2026-11-16']);
  });
  it('Tirhuta round trip', () => {
    expect(tirhutaToDevanagari(devanagariToTirhuta('मिथिला मैथिली २०८३'))).toBe('मिथिला मैथिली २०८३');
    expect([...devanagariToTirhuta('मि')].map((c) => c.codePointAt(0)!.toString(16))).toEqual(['114a7', '114b1']);
  });
});

describe('Kirat', () => {
  it('Ubhauli 2026 = Baisakh Purnima (1 May)', () => { expect(date('kirat', 'ubhauli', 2026)).toBe('2026-05-01'); });
  it('Yele Sambat 5086 from Maghe Sankranti 2026 (default mode)', () => {
    expect(yeleNewYear(2026)).toBe('2026-01-15');
    expect(yeleYear('2026-09-29')).toBe(5086);
    expect(yeleYear('2026-01-14')).toBe(5085);
  });
  it('Limbu: finals, subjoined, digits', () => {
    const cps = (s: string) => [...devanagariToLimbu(s)].map((c) => c.codePointAt(0)!.toString(16));
    expect(cps('लिम्बू')).toEqual(['1917', '1921', '1936', '1912', '1922', '193a']);
    expect(cps('क्या')).toEqual(['1901', '1929', '1920']);
    expect(cps('१२')).toEqual(['1947', '1948']);
  });
});

describe('Hijri', () => {
  it('tabular round trip', () => {
    for (const iso of ['2025-06-27', '2026-03-20', '2030-01-01']) {
      const h = tabularFromIso(iso);
      expect(isoFromTabular(h.year, h.month, h.day)).toBe(iso);
    }
  });
  it.each([
    [1446, 10, '2025-03-31'], // Eid ul-Fitr 2025 (Kathmandu Post)
    [1447, 10, '2026-03-21'], // Eid ul-Fitr 2026 (Home Ministry via Muslim Commission)
  ])('expected 1 Shawwal %i = %s (matches Nepal announcement)', (y, m, d) => { expect(expectedMonthStart(y, m)).toBe(d); });
  it('Eid al-Adha 2026 expected 28 May (nepalnews)', () => { expect(date('hijri', 'eid-al-adha', 2026)).toBe('2026-05-28'); });
  it('hijriOf today', () => { expect(hijriOf('2026-09-29')).toMatchObject({ year: 1448, month: 4 }); });
  it('prayer times Kathmandu are ordered and plausible; qibla ≈ 272°', () => {
    const p = prayerTimes('2026-03-01', KATHMANDU);
    const seq = [p.fajr, p.sunrise, p.dhuhr, p.asr, p.maghrib, p.isha].map((d) => d.getTime());
    expect([...seq].sort((a, b) => a - b)).toEqual(seq);
    expect(p.sunrise.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' })).toBe('06:28');
    expect(Math.round(qibla(27.7172, 85.324))).toBe(272);
  });
});

describe('every suite resolves for 30 years without errors (no maintenance)', () => {
  it('2020–2050', () => {
    for (let y = 2020; y <= 2050; y += 5) for (const s of Object.values(SUITES)) {
      const cal = suiteCalendar(s, y);
      expect(cal.length).toBeGreaterThan(2);
      for (const r of cal) expect(r.start <= r.end).toBe(true);
    }
  }, 120_000);
});
