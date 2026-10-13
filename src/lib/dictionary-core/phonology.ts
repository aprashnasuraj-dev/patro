/**
 * Devanagari → phoneme sequence → romanization / search keys / rhyme keys.
 *
 * Nepali-specific decisions (documented in docs/04-search-romanization.md):
 *   • Word-final inherent "a" is silent in multi-syllable words (घर → ghar, जीवन → jiban)
 *     but kept after a conjunct (सत्य → satya, धर्म → dharma), in one-akshara words (म → ma)
 *     and in "-aya" endings (समय → samaya, हृदय → hridaya).
 *   • Medial inherent "a" is kept (सपना → sapana, कमल → kamal) — unlike Hindi.
 *   • Display romanization follows common Nepali web usage (no diacritics, आ → a,
 *     व → b, but w inside clusters like स्व/द्व). Editors can override per entry with `roman`.
 */

import { cleanLatin } from './normalize.ts';

type Phone =
  | { t: 'C'; v: string }
  | { t: 'V'; v: string; inherent: boolean; afterCluster: boolean }
  | { t: 'N' }; // anusvara / chandrabindu

const CONS: Record<string, string> = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'ng',
  च: 'c', छ: 'ch', ज: 'j', झ: 'jh', ञ: 'ny',
  ट: 'T', ठ: 'Th', ड: 'D', ढ: 'Dh', ण: 'N',
  त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm',
  य: 'y', र: 'r', ल: 'l', व: 'w',
  श: 'sh', ष: 'Sh', स: 's', ह: 'h',
};

const INDEP_VOWEL: Record<string, string> = {
  अ: 'a', आ: 'A', इ: 'i', ई: 'I', उ: 'u', ऊ: 'U', ऋ: 'ri',
  ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au', ऑ: 'o',
};

const MATRA: Record<string, string> = {
  'ा': 'A', 'ि': 'i', 'ी': 'I', 'ु': 'u', 'ू': 'U', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o',
};

const HALANTA = '्';
const NASALS = new Set(['ँ', 'ं']);

/** Parse ONE word (no spaces) into phones, applying Nepali schwa deletion. */
export function phonemes(word: string): Phone[] {
  const chars = [...word.normalize('NFD').replace(/़/g, '').normalize('NFC')];
  const out: Phone[] = [];
  let pendingCluster = false; // previous consonant carried a halanta

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    // ज्ञ is pronounced "gya" in Nepali
    if (ch === 'ज' && chars[i + 1] === HALANTA && chars[i + 2] === 'ञ') {
      out.push({ t: 'C', v: 'gy' });
      i += 2;
      i = pushVowelAfterConsonant(chars, i, out, true);
      pendingCluster = chars[i] === HALANTA;
      continue;
    }

    if (CONS[ch]) {
      out.push({ t: 'C', v: CONS[ch] });
      const inCluster = pendingCluster;
      i = pushVowelAfterConsonant(chars, i, out, inCluster);
      pendingCluster = chars[i] === HALANTA;
      continue;
    }

    pendingCluster = false;
    if (INDEP_VOWEL[ch]) {
      out.push({ t: 'V', v: INDEP_VOWEL[ch], inherent: false, afterCluster: false });
    } else if (NASALS.has(ch)) {
      out.push({ t: 'N' });
    }
    // visarga, avagraha, digits, punctuation: ignored
  }

  applySchwaDeletion(out);
  return out;
}

/** Looks at chars[i+1]; pushes the vowel; returns the index of the last consumed char. */
function pushVowelAfterConsonant(chars: string[], i: number, out: Phone[], afterCluster: boolean): number {
  const next = chars[i + 1];
  if (next === HALANTA) return i + 1; // no vowel
  if (next && MATRA[next]) {
    out.push({ t: 'V', v: MATRA[next], inherent: false, afterCluster });
    return i + 1;
  }
  out.push({ t: 'V', v: 'a', inherent: true, afterCluster });
  return i;
}

function applySchwaDeletion(p: Phone[]): void {
  const vowelIdx = p.map((x, i) => (x.t === 'V' ? i : -1)).filter((i) => i >= 0);
  if (vowelIdx.length < 2) return; // one-akshara words keep their vowel: म, र, न
  const last = vowelIdx[vowelIdx.length - 1];
  const lv = p[last];
  if (lv.t !== 'V' || !lv.inherent || last !== p.length - 1) return;
  if (lv.afterCluster) return; // सत्य, धर्म, मित्र
  // "-aya" endings: समय, हृदय, विषय → keep
  const prevC = p[last - 1];
  const prevV = p[last - 2];
  if (prevC?.t === 'C' && prevC.v === 'y' && prevV?.t === 'V') return;
  p.splice(last, 1);
}

// ───────────────────────── romanization ─────────────────────────

const DISPLAY_C: Record<string, string> = {
  c: 'ch', ch: 'chh', ny: 'n', T: 't', Th: 'th', D: 'd', Dh: 'dh', N: 'n', Sh: 'sh',
};
const DISPLAY_V: Record<string, string> = { A: 'a', I: 'i', U: 'u' };
const LABIAL = new Set(['p', 'ph', 'b', 'bh', 'm']);

/**
 * Inflectional suffixes after which the stem's final schwa is silent too:
 * आकाशको → akashko, घरहरू → gharharu. Kept short on purpose — "मा"/"ले" are
 * excluded because too many base words end in them (उपमा, सीमा…).
 */
const SUFFIXES = ['हरूको', 'हरूलाई', 'हरू', 'लाई', 'बाट', 'देखि', 'को'];

function romanizeWord(word: string): string {
  for (const suf of SUFFIXES) {
    const stem = word.slice(0, -suf.length);
    if (word.endsWith(suf) && (stem.match(/[\u0905-\u0914\u0915-\u0939]/g)?.length ?? 0) >= 2) {
      return romanizeWord(stem) + romanizeWord(suf);
    }
  }
  const p = phonemes(word);
  let s = '';
  p.forEach((x, i) => {
    if (x.t === 'C') {
      // व is pronounced b in Nepali (विवाह bibah, शिविर shibir) except after a consonant in a cluster (स्वर swar, द्वार dwar)
      if (x.v === 'w') s += p[i - 1]?.t === 'C' ? 'w' : 'b';
      else s += DISPLAY_C[x.v] ?? x.v;
    } else if (x.t === 'V') {
      s += DISPLAY_V[x.v] ?? x.v;
    } else {
      const nxt = p[i + 1];
      s += nxt?.t === 'C' && LABIAL.has(nxt.v) ? 'm' : 'n';
    }
  });
  return s;
}

/** Human-friendly romanization: "घर" → "ghar", "सपना" → "sapana", "जीवन" → "jiban". */
export function romanize(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(romanizeWord)
    .join(' ');
}

/**
 * Latin search key — apply to BOTH generated romanizations and user queries.
 * Keeps aspiration; folds everything people type inconsistently.
 *   "Ghaar" → "ghar", "shahar" → "sahar", "vivah" → "bibah", "phool"/"ful" → "phul"
 */
export function romanKey(latin: string): string {
  let s = cleanLatin(latin);
  s = s
    .replace(/chh/g, 'c')
    .replace(/ch/g, 'c')
    .replace(/sh/g, 's')
    .replace(/[vw]/g, 'b')
    .replace(/z/g, 'j')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/f/g, 'ph')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/ou/g, 'au');
  s = s.replace(/([a-z])\1+/g, '$1'); // aa→a, ii→i, kk→k, gharr→ghar
  return s.replace(/ /g, '');
}

const LATIN_CONS = /[bcdfghjklmnpqrstvwxyz]/;

/**
 * Loosest Latin key: drops aspiration and "optional" a's.
 *   "sapana" / "sapna" → "sapn", "ghar" → "gar", "maya" → "may"
 * Used only as a fallback tier, after exact/roman matches.
 */
export function looseKey(latinOrRomanKey: string): string {
  const s = romanKey(latinOrRomanKey).replace(/([bcdgjkpt])h/g, '$1');
  const chars = [...s];
  let seenVowel = false;
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const isVowel = /[aeiou]/.test(c);
    if (c === 'a' && seenVowel) {
      const prev = chars[i - 1];
      const next = chars[i + 1];
      const prevCons = prev !== undefined && LATIN_CONS.test(prev);
      const nextCons = next === undefined || LATIN_CONS.test(next);
      if (prevCons && nextCons) continue; // inner or final "a" after a consonant
    }
    if (isVowel) seenVowel = true;
    out += c;
  }
  return out;
}

// ───────────────────────── rhyme keys ─────────────────────────

const RHYME_FOLD: Record<string, string> = {
  I: 'i', U: 'u', sh: 's', Sh: 's', w: 'b', ny: 'n', N: 'n',
};

const MANNER: Record<string, string> = {
  k: 'P', c: 'P', T: 'P', t: 'P', p: 'P',
  kh: 'P', ch: 'P', Th: 'P', th: 'P', ph: 'P',
  g: 'B', j: 'B', D: 'B', d: 'B', b: 'B', gy: 'B',
  gh: 'B', jh: 'B', Dh: 'B', dh: 'B', bh: 'B',
  ng: 'M', n: 'M', m: 'M',
  r: 'L', l: 'L',
  s: 'S',
  y: 'Y',
  h: 'H',
};

type RToken = { k: 'C' | 'V'; v: string };

function rhymeTokens(word: string): RToken[] {
  const out: RToken[] = [];
  for (const x of phonemes(word)) {
    if (x.t === 'N') {
      // nasalisation attaches to the preceding vowel
      const last = out[out.length - 1];
      if (last?.k === 'V') last.v += '~';
      else out.push({ k: 'C', v: 'n' });
      continue;
    }
    const v = RHYME_FOLD[x.v] ?? x.v;
    out.push({ k: x.t === 'C' ? 'C' : 'V', v });
  }
  return out;
}

export interface RhymeInfo {
  double: string;
  single: string;
  vowel: string;
  slant: string;
  syllables: number;
}

/**
 * Rhyme keys for the LAST word of a headword.
 *   घर  → single "ar"             सहर  → single "ar",  double "ahar"
 *   पानी → single "Ani"            सपना → single "anA", double "apanA"
 * "single" starts at the last vowel that is followed by a consonant, so open
 * syllables rhyme on consonant+vowel (पानी/रानी/कहानी) rather than on "i" alone.
 */
export function rhymeInfo(text: string): RhymeInfo {
  const words = text.split(/\s+/).filter(Boolean);
  const toks = rhymeTokens(words[words.length - 1] ?? '');
  const vIdx = toks.map((t, i) => (t.k === 'V' ? i : -1)).filter((i) => i >= 0);
  const syllables = vIdx.length;
  if (!syllables) return { double: '', single: '', vowel: '', slant: '', syllables: 0 };

  // Fallback (all-vowel tail, e.g. गाउँ "gAu~"): start at the first vowel after the last consonant.
  const lastC = toks.map((t) => t.k).lastIndexOf('C');
  let pivotPos = Math.max(0, vIdx.findIndex((i) => i > lastC));
  for (let j = vIdx.length - 1; j >= 0; j--) {
    if (toks.slice(vIdx[j] + 1).some((t) => t.k === 'C')) {
      pivotPos = j;
      break;
    }
  }
  const pivot = vIdx[pivotPos];
  const tail = toks.slice(pivot);
  const join = (ts: RToken[]) => ts.map((t) => t.v).join('');
  const single = join(tail);
  const double = pivotPos > 0 ? join(toks.slice(vIdx[pivotPos - 1])) : '';
  const vowel = tail.filter((t) => t.k === 'V').map((t) => t.v).join('-');
  const slant = tail.map((t) => (t.k === 'V' ? t.v : MANNER[t.v] ?? '?')).join('');
  return { double, single, vowel, slant, syllables };
}

/** Syllable count of a whole headword (all words). */
export function syllableCount(text: string): number {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .reduce((n, w) => n + phonemes(w).filter((p) => p.t === 'V').length, 0);
}
