/**
 * Intent parser for chat bots. Handles Devanagari, Romanized Nepali and English:
 *   "aaja", "आज", "today", "miti", "bholi", "dashain kahile", "2083-06-13 ad",
 *   "2026-09-29 bs", "mesh rashifal", "subscribe", "रोक्नुहोस्"
 * Unknown text → 'help'. (Optional: send unknowns to an LLM with the panchang
 * data as context, but keep the deterministic path for the common 95%.)
 */
import { findFestival, type FestivalDef } from '../festivals/festivals';
import { fromNepaliDigits } from '../core/names';

export type Intent =
  | { type: 'today' }
  | { type: 'tomorrow' }
  | { type: 'festival'; festival: FestivalDef }
  | { type: 'convert'; direction: 'bs2ad' | 'ad2bs'; y: number; m: number; d: number }
  | { type: 'rashifal'; rashi: number }
  | { type: 'subscribe' }
  | { type: 'unsubscribe' }
  | { type: 'help' };

const RASHI_ALIASES: [number, string[]][] = [
  [0, ['mesh', 'mesha', 'मेष', 'aries']], [1, ['brish', 'vrish', 'vrishabh', 'वृष', 'taurus']],
  [2, ['mithun', 'मिथुन', 'gemini']], [3, ['karkat', 'kark', 'कर्कट', 'कर्क', 'cancer']],
  [4, ['singh', 'simha', 'सिंह', 'leo']], [5, ['kanya', 'कन्या', 'virgo']],
  [6, ['tula', 'तुला', 'libra']], [7, ['brischik', 'vrishchik', 'वृश्चिक', 'scorpio']],
  [8, ['dhanu', 'धनु', 'sagittarius']], [9, ['makar', 'मकर', 'capricorn']],
  [10, ['kumbha', 'kumbh', 'कुम्भ', 'aquarius']], [11, ['meen', 'min', 'मीन', 'pisces']],
];

const has = (q: string, words: string[]) => words.some((w) => new RegExp(`(^|\\s)${w}(\\s|$)`).test(q));

export function parseIntent(input: string): Intent {
  const q = fromNepaliDigits(input).toLowerCase().normalize('NFC').replace(/[?।!,]/g, ' ').replace(/\s+/g, ' ').trim();

  if (has(q, ['stop', 'unsubscribe', 'रोक', 'रोक्नुहोस्', 'बन्द'])) return { type: 'unsubscribe' };
  if (has(q, ['start', 'subscribe', 'सुरु', 'दैनिक'])) return { type: 'subscribe' };

  const date = q.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (date) {
    const [y, m, d] = [Number(date[1]), Number(date[2]), Number(date[3])];
    const saysAd = has(q, ['ad', 'english', 'इस्वी', 'अंग्रेजी']);
    const saysBs = has(q, ['bs', 'nepali', 'बिसं', 'वि.सं', 'नेपाली']);
    // "convert to X" wording: 2083-06-13 ad → user wants AD. Year heuristic otherwise.
    const isBsInput = saysAd ? true : saysBs ? false : y > 2060;
    return { type: 'convert', direction: isBsInput ? 'bs2ad' : 'ad2bs', y, m, d };
  }

  const festival = findFestival(q);
  if (festival) return { type: 'festival', festival };

  if (has(q, ['rashifal', 'राशिफल', 'horoscope']) || RASHI_ALIASES.some(([, a]) => has(q, a))) {
    const hit = RASHI_ALIASES.find(([, a]) => has(q, a));
    if (hit) return { type: 'rashifal', rashi: hit[0] };
  }

  if (has(q, ['bholi', 'भोलि', 'tomorrow'])) return { type: 'tomorrow' };
  if (has(q, ['aaja', 'aja', 'आज', 'today', 'miti', 'मिति', 'tithi', 'तिथि', 'patro', 'पात्रो', 'gate', 'गते'])) return { type: 'today' };
  return { type: 'help' };
}
