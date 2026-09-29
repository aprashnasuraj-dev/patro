/**
 * Devanagari ⇄ Newa (Prachalit Nepal lipi, Unicode block U+11400–U+1147F, Unicode 9.0+).
 *
 * - Code points verified against the Unicode Character Database (Unicode 14).
 * - Newa has dedicated MURMURED letters that Devanagari writes as consonant+्+ह:
 *     ङ्ह→𑐓 NGHA, ञ्ह→𑐙 NYHA, न्ह→𑐤 NHA, म्ह→𑐪 MHA, र्ह→𑐭 RHA, ल्ह→𑐯 LHA
 *   We fold those sequences into the single Newa letter (and unfold on the way back).
 * - Rendering needs a Newa font: Noto Sans Newa (Google Fonts, OFL) and a
 *   shaping engine with USE support (all current Chrome/Safari/Firefox/Android).
 * - Newa ↔ Devanagari is NOT a perfect 1:1 for manuscripts; this is for modern
 *   Nepal Bhasa written in Devanagari (names, dates, UI labels).
 */

const cp = (n: number) => String.fromCodePoint(n);

const VOWELS: [string, number][] = [
  ['अ', 0x11400], ['आ', 0x11401], ['इ', 0x11402], ['ई', 0x11403], ['उ', 0x11404], ['ऊ', 0x11405],
  ['ऋ', 0x11406], ['ॠ', 0x11407], ['ऌ', 0x11408], ['ॡ', 0x11409], ['ए', 0x1140a], ['ऐ', 0x1140b],
  ['ओ', 0x1140c], ['औ', 0x1140d],
];

const CONSONANTS: [string, number][] = [
  ['क', 0x1140e], ['ख', 0x1140f], ['ग', 0x11410], ['घ', 0x11411], ['ङ', 0x11412],
  ['च', 0x11414], ['छ', 0x11415], ['ज', 0x11416], ['झ', 0x11417], ['ञ', 0x11418],
  ['ट', 0x1141a], ['ठ', 0x1141b], ['ड', 0x1141c], ['ढ', 0x1141d], ['ण', 0x1141e],
  ['त', 0x1141f], ['थ', 0x11420], ['द', 0x11421], ['ध', 0x11422], ['न', 0x11423],
  ['प', 0x11425], ['फ', 0x11426], ['ब', 0x11427], ['भ', 0x11428], ['म', 0x11429],
  ['य', 0x1142b], ['र', 0x1142c], ['ल', 0x1142e], ['व', 0x11430],
  ['श', 0x11431], ['ष', 0x11432], ['स', 0x11433], ['ह', 0x11434],
];

/** Devanagari C + ् + ह → Newa murmured letter */
const MURMURED: [string, number][] = [
  ['ङ्ह', 0x11413], ['ञ्ह', 0x11419], ['न्ह', 0x11424], ['म्ह', 0x1142a], ['र्ह', 0x1142d], ['ल्ह', 0x1142f],
];

const SIGNS: [string, number][] = [
  ['ा', 0x11435], ['ि', 0x11436], ['ी', 0x11437], ['ु', 0x11438], ['ू', 0x11439],
  ['ृ', 0x1143a], ['ॄ', 0x1143b], ['ॢ', 0x1143c], ['ॣ', 0x1143d],
  ['े', 0x1143e], ['ै', 0x1143f], ['ो', 0x11440], ['ौ', 0x11441],
  ['्', 0x11442], ['ँ', 0x11443], ['ं', 0x11444], ['ः', 0x11445], ['़', 0x11446], ['ऽ', 0x11447],
  ['ॐ', 0x11449], ['।', 0x1144b], ['॥', 0x1144c],
];

export const NEWA_DIGITS = Array.from({ length: 10 }, (_, i) => cp(0x11450 + i));
const DEVA_DIGITS = '०१२३४५६७८९';

const toNewaMap = new Map<string, string>();
const toDevaMap = new Map<string, string>();
for (const [d, n] of [...VOWELS, ...CONSONANTS, ...SIGNS, ...MURMURED]) {
  toNewaMap.set(d, cp(n));
  toDevaMap.set(cp(n), d);
}
DEVA_DIGITS.split('').forEach((d, i) => { toNewaMap.set(d, NEWA_DIGITS[i]); toDevaMap.set(NEWA_DIGITS[i], d); });

/** Devanagari (Nepal Bhasa / Nepali) → Newa script. Latin digits optionally converted. */
export function devanagariToNewa(text: string, opts: { latinDigits?: boolean } = {}): string {
  const s = text.normalize('NFC');
  let out = '';
  for (let i = 0; i < s.length; ) {
    const three = s.slice(i, i + 3);
    if (toNewaMap.has(three) && MURMURED.some(([d]) => d === three)) { out += toNewaMap.get(three); i += 3; continue; }
    const ch = s[i];
    if (opts.latinDigits && ch >= '0' && ch <= '9') { out += NEWA_DIGITS[Number(ch)]; i++; continue; }
    out += toNewaMap.get(ch) ?? ch;
    i++;
  }
  return out;
}

/** Newa → Devanagari (unfolds murmured letters to C्ह). */
export function newaToDevanagari(text: string): string {
  let out = '';
  for (const ch of text) out += toDevaMap.get(ch) ?? ch;
  return out.normalize('NFC');
}

export function toNewaDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => NEWA_DIGITS[Number(d)]).replace(/[०-९]/g, (d) => NEWA_DIGITS[DEVA_DIGITS.indexOf(d)]);
}

export function isNewa(text: string): boolean {
  return /[\u{11400}-\u{1147F}]/u.test(text);
}

/** CSS font stack for Newa text. Load "Noto Sans Newa" from Google Fonts. */
export const NEWA_FONT_STACK = '"Noto Sans Newa", "Nepal Lipi", sans-serif';
