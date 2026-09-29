/**
 * 12-animal cycles, Tibetan element-gender cycle, and community era numbers.
 * Pure arithmetic → never needs updating.
 */
export type CycleId = 'tamang' | 'tibetan' | 'gurung';

/** Index 0 = the "Rat/Mouse" year; 2020 was a Rat year in all three systems. */
export const ANIMALS: Record<CycleId, { dev: string; en: string; emoji: string }[]> = {
  // Radio Nepal (Sonam Lhosar 2026 report)
  tamang: [
    { dev: 'मुसा', en: 'Rat', emoji: '🐀' }, { dev: 'गाई', en: 'Cow', emoji: '🐄' }, { dev: 'बाघ', en: 'Tiger', emoji: '🐅' },
    { dev: 'खरायो', en: 'Rabbit', emoji: '🐇' }, { dev: 'ड्रागन (बादल)', en: 'Dragon (Cloud)', emoji: '🐉' }, { dev: 'सर्प', en: 'Snake', emoji: '🐍' },
    { dev: 'घोडा', en: 'Horse', emoji: '🐎' }, { dev: 'भेडा', en: 'Sheep', emoji: '🐑' }, { dev: 'बाँदर', en: 'Monkey', emoji: '🐒' },
    { dev: 'चरा', en: 'Bird', emoji: '🐦' }, { dev: 'कुकुर', en: 'Dog', emoji: '🐕' }, { dev: 'सुँगुर', en: 'Pig', emoji: '🐖' },
  ],
  tibetan: [
    { dev: 'मुसा', en: 'Rat', emoji: '🐀' }, { dev: 'गोरु', en: 'Ox', emoji: '🐂' }, { dev: 'बाघ', en: 'Tiger', emoji: '🐅' },
    { dev: 'खरायो', en: 'Rabbit', emoji: '🐇' }, { dev: 'ड्रागन', en: 'Dragon', emoji: '🐉' }, { dev: 'सर्प', en: 'Snake', emoji: '🐍' },
    { dev: 'घोडा', en: 'Horse', emoji: '🐎' }, { dev: 'भेडा', en: 'Sheep', emoji: '🐑' }, { dev: 'बाँदर', en: 'Monkey', emoji: '🐒' },
    { dev: 'चरा', en: 'Bird', emoji: '🐓' }, { dev: 'कुकुर', en: 'Dog', emoji: '🐕' }, { dev: 'सुँगुर', en: 'Pig', emoji: '🐖' },
  ],
  // Wikipedia (Tamu Lhosar): cat, eagle, deer replace rabbit, dragon, pig. Gurung-language names: TO BE SUPPLIED by reviewer.
  gurung: [
    { dev: 'मुसा', en: 'Mouse', emoji: '🐁' }, { dev: 'गाई', en: 'Cow', emoji: '🐄' }, { dev: 'बाघ', en: 'Tiger', emoji: '🐅' },
    { dev: 'बिरालो', en: 'Cat', emoji: '🐈' }, { dev: 'गरुड', en: 'Eagle', emoji: '🦅' }, { dev: 'सर्प', en: 'Serpent', emoji: '🐍' },
    { dev: 'घोडा', en: 'Horse', emoji: '🐎' }, { dev: 'भेडा', en: 'Sheep', emoji: '🐑' }, { dev: 'बाँदर', en: 'Monkey', emoji: '🐒' },
    { dev: 'चरा', en: 'Bird', emoji: '🐦' }, { dev: 'कुकुर', en: 'Dog', emoji: '🐕' }, { dev: 'मृग', en: 'Deer', emoji: '🦌' },
  ],
};

export const ELEMENTS = [
  { dev: 'काठ', en: 'Wood', bo: 'ཤིང' }, { dev: 'आगो', en: 'Fire', bo: 'མེ' }, { dev: 'माटो', en: 'Earth', bo: 'ས' },
  { dev: 'धातु', en: 'Metal', bo: 'ལྕགས' }, { dev: 'पानी', en: 'Water', bo: 'ཆུ' },
];

/** `cycleYear` = the Gregorian year in which that community's year STARTED. */
export function animalOf(cycle: CycleId, cycleYear: number) {
  const i = (((cycleYear - 2020) % 12) + 12) % 12;
  return { index: i, ...ANIMALS[cycle][i] };
}

/** Tibetan element + gender (60-year cycle). 2026 → Fire Male Horse. */
export function elementOf(cycleYear: number) {
  const s = (((cycleYear - 4) % 10) + 10) % 10;
  return { ...ELEMENTS[Math.floor(s / 2)], gender: s % 2 === 0 ? 'male' as const : 'female' as const, genderDev: s % 2 === 0 ? 'पुरुष' : 'स्त्री' };
}

/** Era numbers (offset from the Gregorian year in which the era-year began). */
export const ERAS = {
  tamang: { dev: 'तामाङ सम्वत्', offset: 836, source: 'Radio Nepal: Sonam Lhosar 19 Jan 2026 = 2862', status: 'sourced' },
  tibetan: { dev: 'शेर्पा/तिब्बती राजवंशीय वर्ष', offset: 127, source: 'United Sherpa Association: Losar 2026 = 2153', status: 'sourced' },
  yele: { dev: 'किरात येले सम्वत्', offset: 3060, source: 'Community usage 5085 (2025), 5086 (2026); mundhum.com', status: 'review' },
} as const;

export function eraYear(era: keyof typeof ERAS, cycleYear: number) {
  return cycleYear + ERAS[era].offset;
}

/** Given a date and the new-year date of that year, which cycle-year are we in? */
export function cycleYearFor(dateIso: string, newYearThisGregorianYear: string): number {
  const y = Number(dateIso.slice(0, 4));
  return dateIso >= newYearThisGregorianYear ? y : y - 1;
}
