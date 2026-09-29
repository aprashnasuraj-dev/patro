/**
 * Devanagari ⇄ Tirhuta (Mithilakshar), Unicode U+11480–114DF (Unicode 7.0).
 * Code points verified against the Unicode Character Database. Font: "Noto Sans Tirhuta".
 * Tirhuta uses the Devanagari danda (।, ॥) — kept as is.
 */
const cp = (n: number) => String.fromCodePoint(n);
const PAIRS: [string, number][] = [
  ['अ', 0x11481], ['आ', 0x11482], ['इ', 0x11483], ['ई', 0x11484], ['उ', 0x11485], ['ऊ', 0x11486], ['ऋ', 0x11487], ['ॠ', 0x11488],
  ['ऌ', 0x11489], ['ॡ', 0x1148a], ['ए', 0x1148b], ['ऐ', 0x1148c], ['ओ', 0x1148d], ['औ', 0x1148e],
  ['क', 0x1148f], ['ख', 0x11490], ['ग', 0x11491], ['घ', 0x11492], ['ङ', 0x11493], ['च', 0x11494], ['छ', 0x11495], ['ज', 0x11496], ['झ', 0x11497], ['ञ', 0x11498],
  ['ट', 0x11499], ['ठ', 0x1149a], ['ड', 0x1149b], ['ढ', 0x1149c], ['ण', 0x1149d], ['त', 0x1149e], ['थ', 0x1149f], ['द', 0x114a0], ['ध', 0x114a1], ['न', 0x114a2],
  ['प', 0x114a3], ['फ', 0x114a4], ['ब', 0x114a5], ['भ', 0x114a6], ['म', 0x114a7], ['य', 0x114a8], ['र', 0x114a9], ['ल', 0x114aa], ['व', 0x114ab],
  ['श', 0x114ac], ['ष', 0x114ad], ['स', 0x114ae], ['ह', 0x114af],
  ['ा', 0x114b0], ['ि', 0x114b1], ['ी', 0x114b2], ['ु', 0x114b3], ['ू', 0x114b4], ['ृ', 0x114b5], ['ॄ', 0x114b6], ['ॢ', 0x114b7], ['ॣ', 0x114b8],
  ['े', 0x114b9], ['ै', 0x114bb], ['ो', 0x114bc], ['ौ', 0x114be],
  ['ँ', 0x114bf], ['ं', 0x114c0], ['ः', 0x114c1], ['्', 0x114c2], ['़', 0x114c3], ['ऽ', 0x114c4], ['ॐ', 0x114c7],
];
const to = new Map<string, string>(); const from = new Map<string, string>();
for (const [d, n] of PAIRS) { to.set(d, cp(n)); from.set(cp(n), d); }
'०१२३४५६७८९'.split('').forEach((d, i) => { to.set(d, cp(0x114d0 + i)); from.set(cp(0x114d0 + i), d); });

export function devanagariToTirhuta(s: string): string { let o = ''; for (const ch of s.normalize('NFC')) o += to.get(ch) ?? ch; return o; }
export function tirhutaToDevanagari(s: string): string { let o = ''; for (const ch of s) o += from.get(ch) ?? ch; return o.normalize('NFC'); }
export const TIRHUTA_FONT_STACK = '"Noto Sans Tirhuta", sans-serif';
