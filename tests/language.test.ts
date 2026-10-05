import { describe, expect, it } from 'vitest';
import { autoFix, checkSpelling, createDictionary, normalize } from '../src/patro-tools/language/spellcheck';
import { compareNames, devanagariToRoman } from '../src/patro-tools/language/name-match';
import { postProcessDictation } from '../src/patro-tools/language/react/useNepaliDictation';
import { detectSpeechLanguage, splitForSpeech } from '../src/patro-tools/language/react/useNepaliSpeech';

const dict = createDictionary(['विद्यालय', 'परीक्षा', 'राष्ट्रिय', 'घर', 'नीति', 'आज', 'पानी']);

describe('spellcheck', () => {
  it('normalizes', () => {
    const first = normalize('कीी हो । राम|');
    expect(first.text).toBe('की हो। राम।');
    expect(first.changes.length).toBeGreaterThan(0);
    expect(normalize(first.text).text).toBe(first.text);
    expect(normalize('र्‍याल').text).toBe('र्‍याल');
    expect(normalize(`राम\u200C`).text).toBe('राम');
  });
  it('fixes common mistakes with postpositions', () => {
    expect(autoFix('आज बिद्यालयमा परिक्षा छ', dict)).toBe('आज विद्यालयमा परीक्षा छ');
    expect(autoFix('बिद्यालयबाट घरमा', dict)).toBe('आज विद्यालयमा परीक्षा छ'.replace('आज विद्यालयमा परीक्षा छ', 'विद्यालयबाट घरमा'));
    expect(autoFix('घरमा पानि छ', dict)).toBe('घरमा पानि छ');
  });
  it('suggests via confusion sets for unknown words', () => {
    const { text, issues } = checkSpelling('पानि', dict);
    expect(text).toBe('पानि');
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ index: 0, word: 'पानि', kind: 'unknown' });
    expect(issues[0].suggestions[0]).toBe('पानी');
    expect(checkSpelling('घरमा', dict).issues).toHaveLength(0);
  });
});

describe('name match', () => {
  it('transliterates', () => {
    expect(devanagariToRoman('सुरज दाहाल')).toBe('suraj daahaal');
    expect(devanagariToRoman('राम')).toBe('raam');
    expect(devanagariToRoman('ईशा')).toBe('eeshaa');
  });
  it.each([
    ['Suraj Dahal', 'सुरज दाहाल', 'match'],
    ['Suraj Dahal', 'Sooraj Dahal', 'spelling_differs'],
    ['Laxmi Thapa', 'Lakshmi Thapa', 'spelling_differs'],
    ['Ram Bahadur Shrestha', 'Ram Shreshtha', 'token_missing'],
    ['Dahal Suraj', 'Suraj Dahal', 'order_differs'],
    ['Sita Sharma', 'Gita Sharma', 'mismatch'],
  ])('%s vs %s → %s', (a, b, v) => {
    const result = compareNames(a, b);
    expect(result.verdict).toBe(v);
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.details.length).toBeGreaterThan(0);
    expect(compareNames(b, a).verdict).toBe(v);
  });
});

describe('voice + tts helpers', () => {
  it('processes Nepali and English dictation punctuation without mixing language rules', () => {
    expect(postProcessDictation('आज 5 गते हो पूर्णविराम')).toBe('आज ५ गते हो।');
    expect(postProcessDictation('आज 5 गते हो पूर्णविराम', { nepaliDigits: false })).toBe('आज 5 गते हो।');
    expect(postProcessDictation('ठिक छ प्रश्नचिन्ह')).toBe('ठिक छ?');
    expect(postProcessDictation('Hello world period', { language: 'en-US' })).toBe('Hello world.');
    expect(postProcessDictation('How are you question mark', { language: 'en-US' })).toBe('How are you?');
    expect(postProcessDictation('First line new line second line', { language: 'en-US' })).toBe('First line\nsecond line');
    expect(postProcessDictation('Version 5 period', { language: 'en-US' })).toBe('Version 5.');
  });
  it('detects Devanagari and English speech language', () => {
    expect(detectSpeechLanguage('आज मौसम राम्रो छ।')).toBe('ne-NP');
    expect(detectSpeechLanguage('Read this sentence aloud.')).toBe('en-US');
    expect(detectSpeechLanguage('WorldLink को सेवा')).toBe('ne-NP');
  });
  it('splits long text for speech without losing newlines or oversized chunks', () => {
    const parts = splitForSpeech('पहिलो वाक्य। दोस्रो वाक्य? तेस्रो!');
    expect(parts).toEqual(['पहिलो वाक्य।', 'दोस्रो वाक्य?', 'तेस्रो!']);
    expect(splitForSpeech('पहिलो लाइन\nदोस्रो लाइन')).toEqual(['पहिलो लाइन', 'दोस्रो लाइन']);
    const long = splitForSpeech('शब्द '.repeat(30).trim(), 20);
    expect(long.length).toBeGreaterThan(1);
    expect(long.every((part) => part.length <= 20 && part.trim() === part)).toBe(true);
    expect(splitForSpeech('अ'.repeat(45), 20).every((part) => part.length <= 20)).toBe(true);
    expect(splitForSpeech('   ')).toEqual([]);
  });
});
