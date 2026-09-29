/**
 * Devanagari → Limbu (Sirijanga), Unicode U+1900–194F (Unicode 4.0).
 * Code points verified against the Unicode Character Database. Font: "Noto Sans Limbu".
 *
 * Rules implemented (status: REVIEW with a Limbu language teacher before launch):
 *  - consonants carry inherent "a"; vowel signs follow the consonant
 *  - independent vowels = vowel-carrier ᤀ + vowel sign
 *  - syllable-final consonants k ŋ t n p m r l → small final letters (ᤰ ᤱ ᤳ ᤴ ᤵ ᤶ ᤷ ᤸ)
 *  - conjunct + य / र / व → subjoined ᤩ ᤪ ᤫ
 *  - ज्ञ → ᤝ, त्र → ᤞ (dedicated letters)
 *  - long ई/ऊ → vowel sign + kemphreng ᤺ (length mark)
 *  - retroflex ट ठ ड ढ ण → dental letters (Limbu has no retroflex series)
 *  - ं / ँ → small anusvara ᤲ ; danda stays Devanagari (Limbu texts use ॥)
 */
const cp = (n: number) => String.fromCodePoint(n);
const CONS: Record<string, number> = {
  'क': 0x1901, 'ख': 0x1902, 'ग': 0x1903, 'घ': 0x1904, 'ङ': 0x1905, 'च': 0x1906, 'छ': 0x1907, 'ज': 0x1908, 'झ': 0x1909, 'ञ': 0x190a,
  'ट': 0x190b, 'ठ': 0x190c, 'ड': 0x190d, 'ढ': 0x190e, 'ण': 0x190f,
  'त': 0x190b, 'थ': 0x190c, 'द': 0x190d, 'ध': 0x190e, 'न': 0x190f, 'प': 0x1910, 'फ': 0x1911, 'ब': 0x1912, 'भ': 0x1913, 'म': 0x1914,
  'य': 0x1915, 'र': 0x1916, 'ल': 0x1917, 'व': 0x1918, 'श': 0x1919, 'ष': 0x191a, 'स': 0x191b, 'ह': 0x191c,
};
const FINALS: Record<string, number> = { 'क': 0x1930, 'ङ': 0x1931, 'त': 0x1933, 'न': 0x1934, 'प': 0x1935, 'म': 0x1936, 'र': 0x1937, 'ल': 0x1938 };
const SUBJOINED: Record<string, number> = { 'य': 0x1929, 'र': 0x192a, 'व': 0x192b };
const SIGNS: Record<string, string> = {
  'ा': cp(0x1920), 'ि': cp(0x1921), 'ी': cp(0x1921) + cp(0x193a), 'ु': cp(0x1922), 'ू': cp(0x1922) + cp(0x193a),
  'े': cp(0x1923), 'ै': cp(0x1924), 'ो': cp(0x1925), 'ौ': cp(0x1926),
};
const INDEP: Record<string, string> = { 'अ': '', 'आ': 'ा', 'इ': 'ि', 'ई': 'ी', 'उ': 'ु', 'ऊ': 'ू', 'ए': 'े', 'ऐ': 'ै', 'ओ': 'ो', 'औ': 'ौ' };
const VIRAMA = '्';
const isCons = (c?: string) => !!c && c in CONS;

export function devanagariToLimbu(input: string): string {
  const s = input.normalize('NFC');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (s.startsWith('ज्ञ', i)) { out += cp(0x191d); i += 2; continue; }
    if (s.startsWith('त्र', i)) { out += cp(0x191e); i += 2; continue; }
    if (c in INDEP) { out += cp(0x1900) + (INDEP[c] ? SIGNS[INDEP[c]] : ''); continue; }
    if (isCons(c)) {
      if (s[i + 1] === VIRAMA) {
        const next = s[i + 2];
        // conjunct with य/र/व → base + subjoined
        if (next && SUBJOINED[next]) { out += cp(CONS[c]) + cp(SUBJOINED[next]); i += 2; continue; }
        // syllable-final consonant (end of word or before another consonant)
        if (FINALS[c] && (!isCons(next) || next === undefined)) { out += cp(FINALS[c]); i += 1; continue; }
        if (FINALS[c] && isCons(next)) { out += cp(FINALS[c]); i += 1; continue; }
        out += cp(CONS[c]); i += 1; continue; // no final form: write consonant (inherent vowel dropped in reading)
      }
      out += cp(CONS[c]);
      continue;
    }
    if (c in SIGNS) { out += SIGNS[c]; continue; }
    if (c === 'ं' || c === 'ँ') { out += cp(0x1932); continue; }
    if (c >= '०' && c <= '९') { out += cp(0x1946 + '०१२३४५६७८९'.indexOf(c)); continue; }
    if (c === '?') { out += cp(0x1945); continue; }
    if (c === '!') { out += cp(0x1944); continue; }
    out += c;
  }
  return out;
}
export const LIMBU_FONT_STACK = '"Noto Sans Limbu", sans-serif';
