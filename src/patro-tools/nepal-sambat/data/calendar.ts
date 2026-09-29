/**
 * Nepal Sambat reference data — SOURCE OF TRUTH.
 * `scripts/export-ns-db.ts` turns this into JSON + SQL seed files.
 *
 * Every row carries `sources` and a `status`:
 *   'sourced'  — stated in a cited source
 *   'derived'  — computed from sourced rules (e.g. Newa spelling via transliteration)
 *   'review'   — plausible but needs confirmation by a Nepal Bhasa expert before launch
 */

export type Status = 'sourced' | 'derived' | 'review';

export const SOURCES = {
  wiki_ns: 'https://en.wikipedia.org/wiki/Nepal_Sambat',
  wiki_months: 'https://en.wikipedia.org/wiki/Kachhala_(month)',
  nepalsambat_com: 'https://www.nepalsambat.com/nepal-sambat/',
  subhash_solar: 'https://subhash.com.np/towards-an-easy-to-use-nepal-sambat-calendar/',
  fandom_solar: 'https://calendars.fandom.com/wiki/Nepal_Sambat',
  hypercal: 'https://github.com/kitsuyui/hyper-calendar/pull/94',
  unicode_newa: 'https://en.wikipedia.org/wiki/Newa_(Unicode_block)',
  r12a_newa: 'https://r12a.github.io/scripts/newa/new.html',
  wiki_swanti: 'https://en.wikipedia.org/wiki/Swanti_(festival)',
  wiki_gunla: 'https://en.wikipedia.org/wiki/Gunla',
  wiki_thinla: 'https://en.wikipedia.org/wiki/Thinla_(month)',
  wiki_pwanhela: 'https://en.wikipedia.org/wiki/Pwanhela_(month)',
  wiki_sila: 'https://en.wikipedia.org/wiki/Sila_(month)',
  wiki_chila: 'https://en.wikipedia.org/wiki/Chila_(month)',
  wiki_chaula: 'https://en.wikipedia.org/wiki/Chaula_(month)',
  wiki_bachhala: 'https://en.wikipedia.org/wiki/Bachhala_(month)',
  wiki_tachhala: 'https://en.wikipedia.org/wiki/Tachhala_(month)',
  wiki_dila: 'https://en.wikipedia.org/wiki/Dila_(month)',
  wiki_yanla: 'https://en.wikipedia.org/wiki/Yanla_(month)',
  wiki_kaula: 'https://en.wikipedia.org/wiki/Kaula_(month)',
} as const;
export type SourceKey = keyof typeof SOURCES;

// ---------------------------------------------------------------------------
// Months — lunar NS months are the AMANTA months, Kachhalā first.
// ---------------------------------------------------------------------------
export interface NsMonth {
  /** 1..12, Kachhalā = 1 */
  n: number;
  /** amanta lunar month index used by the engine (0 = Chaitra … 7 = Kārtika) */
  amantaIndex: number;
  dev: string;
  /** other spellings seen in the wild — accept all in search/parsing */
  devVariants: string[];
  roman: string;
  lunarSanskrit: string;
  /** name of this month's full moon (पुन्हि) */
  fullMoon: { dev: string; roman: string };
  gregorian: string;
  sources: SourceKey[];
  /** 'review' here usually means the full-moon name, not the month name, needs confirmation */
  status: Status;
}

export const NS_MONTHS: NsMonth[] = [
  { n: 1, amantaIndex: 7, dev: 'कछला', devVariants: [], roman: 'Kachhalā', lunarSanskrit: 'Kārtika', fullMoon: { dev: 'सकिमना पुन्हि', roman: 'Saki Manā Punhi' }, gregorian: 'Oct–Nov', sources: ['wiki_ns', 'wiki_months'], status: 'sourced' },
  { n: 2, amantaIndex: 8, dev: 'थिंला', devVariants: ['थिँला'], roman: 'Thinlā', lunarSanskrit: 'Mārgaśīrṣa', fullMoon: { dev: 'यःमरि पुन्हि', roman: 'Yomari Punhi' }, gregorian: 'Nov–Dec', sources: ['wiki_ns', 'wiki_thinla'], status: 'sourced' },
  { n: 3, amantaIndex: 9, dev: 'प्वँहेला', devVariants: ['पोहेला', 'प्वहेला'], roman: 'Pwanhelā', lunarSanskrit: 'Pauṣa', fullMoon: { dev: 'मिला पुन्हि', roman: 'Milā Punhi' }, gregorian: 'Dec–Jan', sources: ['wiki_ns', 'wiki_pwanhela', 'nepalsambat_com'], status: 'sourced' },
  { n: 4, amantaIndex: 10, dev: 'सिला', devVariants: ['सिल्ला'], roman: 'Silā', lunarSanskrit: 'Māgha', fullMoon: { dev: 'सि पुन्हि', roman: 'Si Punhi' }, gregorian: 'Jan–Feb', sources: ['wiki_ns', 'wiki_sila', 'nepalsambat_com'], status: 'sourced' },
  { n: 5, amantaIndex: 11, dev: 'चिला', devVariants: ['चिल्ला'], roman: 'Chilā', lunarSanskrit: 'Phālguna', fullMoon: { dev: 'होलि पुन्हि', roman: 'Holi Punhi' }, gregorian: 'Feb–Mar', sources: ['wiki_ns', 'wiki_chila', 'nepalsambat_com'], status: 'review' },
  { n: 6, amantaIndex: 0, dev: 'चौला', devVariants: [], roman: 'Chaulā', lunarSanskrit: 'Chaitra', fullMoon: { dev: 'ल्हुति पुन्हि', roman: 'Lhuti Punhi' }, gregorian: 'Mar–Apr', sources: ['wiki_ns', 'wiki_chaula'], status: 'sourced' },
  { n: 7, amantaIndex: 1, dev: 'बछला', devVariants: [], roman: 'Bachhalā', lunarSanskrit: 'Vaiśākha', fullMoon: { dev: 'स्वांया पुन्हि', roman: 'Swānyā Punhi' }, gregorian: 'Apr–May', sources: ['wiki_ns', 'wiki_bachhala'], status: 'sourced' },
  { n: 8, amantaIndex: 2, dev: 'तछला', devVariants: [], roman: 'Tachhalā', lunarSanskrit: 'Jyeṣṭha', fullMoon: { dev: 'ज्या पुन्हि', roman: 'Jyā Punhi' }, gregorian: 'May–Jun', sources: ['wiki_ns', 'wiki_tachhala'], status: 'sourced' },
  { n: 9, amantaIndex: 3, dev: 'दिला', devVariants: ['दिल्ला'], roman: 'Dilā', lunarSanskrit: 'Āṣāḍha', fullMoon: { dev: 'दिला पुन्हि', roman: 'Dilā Punhi' }, gregorian: 'Jun–Jul', sources: ['wiki_ns', 'wiki_dila', 'nepalsambat_com'], status: 'sourced' },
  { n: 10, amantaIndex: 4, dev: 'गुंला', devVariants: ['गुँला'], roman: 'Gunlā', lunarSanskrit: 'Śrāvaṇa', fullMoon: { dev: 'गुंपुन्हि', roman: 'Gun Punhi' }, gregorian: 'Jul–Aug', sources: ['wiki_ns', 'wiki_gunla'], status: 'review' },
  { n: 11, amantaIndex: 5, dev: 'यंला', devVariants: ['ञंला', 'येँला'], roman: 'Yanlā', lunarSanskrit: 'Bhādrapada', fullMoon: { dev: 'येँयाः पुन्हि', roman: 'Yenyā Punhi' }, gregorian: 'Aug–Sep', sources: ['wiki_ns', 'wiki_yanla', 'nepalsambat_com'], status: 'sourced' },
  { n: 12, amantaIndex: 6, dev: 'कौला', devVariants: [], roman: 'Kaulā', lunarSanskrit: 'Āśvina', fullMoon: { dev: 'कतिं पुन्हि', roman: 'Katin Punhi' }, gregorian: 'Sep–Oct', sources: ['wiki_ns', 'wiki_kaula'], status: 'review' },
];

/** Intercalary (अधिक) month label and the rare dropped (क्षय) month label. */
export const NS_LEAP = {
  adhik: { dev: 'अनला', roman: 'Analā', note: 'Tradition calls the intercalary month Analā; engines show it as "अनला (<month>)" — no fixed written form is attested, so we show both.', sources: ['wiki_ns', 'hypercal'] as SourceKey[] },
  kshaya: { dev: 'न्हंला', roman: 'Nhanlā', note: 'Label for the rare reduced (क्षय) month.', sources: ['wiki_ns'] as SourceKey[] },
};

export const NS_PAKSHA = {
  shukla: { dev: 'थ्व', devLong: 'थ्वः', roman: 'Thwa', en: 'bright half' },
  krishna: { dev: 'गा', devLong: 'गाः', roman: 'Gā', en: 'dark half' },
};

/**
 * Day (tithi) names within a paksha. Newar usage keeps Sanskrit forms except
 * पारु (1), खस्ति (6), चह्रे (14, dark half), पुन्हि (15 bright), आमै (15 dark).
 * Source: Wikipedia month articles' tithi tables.
 */
export const NS_TITHIS_THWA = [
  'पारु', 'द्वितीया', 'तृतीया', 'चौथी', 'पञ्चमी', 'खस्ति', 'सप्तमी', 'अष्टमी',
  'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पुन्हि',
];
export const NS_TITHIS_GA = [
  'पारु', 'द्वितीया', 'तृतीया', 'चौथी', 'पञ्चमी', 'खस्ति', 'सप्तमी', 'अष्टमी',
  'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चह्रे', 'आमै',
];
export const NS_TITHIS_ROMAN_THWA = [
  'Pāru', 'Dwitiyā', 'Tritiyā', 'Chauthi', 'Panchami', 'Khasti', 'Saptami', 'Ashtami',
  'Navami', 'Dashami', 'Ekādashi', 'Dwādashi', 'Trayodashi', 'Chaturdashi', 'Punhi',
];
export const NS_TITHIS_ROMAN_GA = [...NS_TITHIS_ROMAN_THWA.slice(0, 13), 'Charhe', 'Āmāi'];

/** Weekday names in Nepal Bhasa — status 'review' (common usage; no cited source yet). */
export const NS_WEEKDAYS = {
  dev: ['आइतबाः', 'सोमबाः', 'मंगलबाः', 'बुधबाः', 'बिहिबाः', 'सुक्रबाः', 'शनिबाः'],
  status: 'review' as Status,
};

// ---------------------------------------------------------------------------
// Solar Nepal Sambat (Lalitpur Metropolitan City, from NS 1140/1141 ≈ 2020 CE)
// New year = 20 October. Months: 5×30, Chaulā 29 (30 in leap), 6×31.
// Leap: (NS year + 880) is a Gregorian leap year.
// ---------------------------------------------------------------------------
export const NS_SOLAR = {
  newYear: { month: 10, day: 20 },
  monthLengths: [30, 30, 30, 30, 30, 29, 31, 31, 31, 31, 31, 31],
  leapMonthIndex: 5, // Chaulā
  sources: ['subhash_solar', 'fandom_solar', 'wiki_ns'] as SourceKey[],
  checks: [
    { ad: '2001-06-01', ns: { year: 1121, month: 8, day: 15 }, note: 'Royal massacre = NS 1121 Tachhalā 15 (source example)' },
    { ad: 'YYYY-12-25', ns: { month: 3, day: 7 }, note: 'Christmas is always Pwanhelā 7' },
    { ad: 'YYYY-01-01', ns: { month: 3, day: 14 }, note: 'Gregorian new year is always Pwanhelā 14' },
  ],
};

// ---------------------------------------------------------------------------
// History & recognition timeline (for the "About Nepal Sambat" page)
// ---------------------------------------------------------------------------
export const NS_TIMELINE = [
  { year: '879 CE', event: 'Nepal Sambat begins (20 October 879) during the reign of Rāghavadeva; tradition credits the merchant Sankhadhar Sākhwā with freeing the people of debt.', sources: ['wiki_ns'] },
  { year: '1028 CE (NS 148)', event: 'The name "Nepal Sambat" first appears in writing.', sources: ['wiki_ns'] },
  { year: '1584–1891 CE', event: 'Used on inscriptions from Gorkha (NS 704) to Bandipur (NS 950), Bhojpur (NS 1011) and by Lhasa Newar merchants (NS 781).', sources: ['wiki_ns'] },
  { year: '1769 CE onward', event: 'After the Shah conquest the state switched to Shaka era, later Bikram Sambat (fully on coins by 1912).', sources: ['wiki_ns'] },
  { year: '1920s–1980s', event: 'Revival movement; activists were arrested under the Panchayat; a 1987 New Year run was broken up by police.', sources: ['wiki_ns'] },
  { year: '1999-11-18', event: 'Government declares Sankhadhar Sākhwā a national hero.', sources: ['wiki_ns'] },
  { year: '2003-10-26', event: 'Postal stamp with Sankhadhar Sākhwā issued.', sources: ['wiki_ns'] },
  { year: '2011-10-25', event: 'Government decides to bring Nepal Sambat into use as a national calendar; task force formed.', sources: ['wiki_ns'] },
  { year: '2020 (NS 1140/1141)', event: 'Lalitpur Metropolitan City prints NS dates beside BS and adopts a solar NS for administration.', sources: ['wiki_ns', 'subhash_solar'] },
  { year: '2023-11-11', event: 'Nepal Sambat included in official government documents alongside Bikram Sambat.', sources: ['wiki_ns'] },
];
