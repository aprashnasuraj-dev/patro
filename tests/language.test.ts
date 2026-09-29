import { describe, expect, it } from 'vitest';
import { autoFix, checkSpelling, createDictionary, normalize } from '../src/patro-tools/language/spellcheck';
import { compareNames, devanagariToRoman } from '../src/patro-tools/language/name-match';
import { postProcessDictation } from '../src/patro-tools/language/react/useNepaliDictation';
import { splitForSpeech } from '../src/patro-tools/language/react/useNepaliSpeech';

const dict = createDictionary(['विद्यालय', 'परीक्षा', 'राष्ट्रिय', 'घर', 'नीति', 'आज', 'पानी']);

describe('spellcheck', () => {
  it('normalizes', () => {
    expect(normalize('कीी हो । राम|').text).toBe('की हो। राम।');
    expect(normalize('र्‍याल').text).toBe('र्‍याल'); // eyelash ra kept
  });
  it('fixes common mistakes with postpositions', () => {
    expect(autoFix('आज बिद्यालयमा परिक्षा छ', dict)).toBe('आज विद्यालयमा परीक्षा छ');
  });
  it('suggests via confusion sets for unknown words', () => {
    const { issues } = checkSpelling('पानि', dict);
    expect(issues[0].suggestions[0]).toBe('पानी');
  });
});

describe('name match', () => {
  it('transliterates', () => { expect(devanagariToRoman('सुरज दाहाल')).toBe('suraj daahaal'); });
  it.each([
    ['Suraj Dahal', 'सुरज दाहाल', 'match'],
    ['Suraj Dahal', 'Sooraj Dahal', 'spelling_differs'],
    ['Laxmi Thapa', 'Lakshmi Thapa', 'spelling_differs'],
    ['Ram Bahadur Shrestha', 'Ram Shreshtha', 'token_missing'],
    ['Dahal Suraj', 'Suraj Dahal', 'order_differs'],
    ['Sita Sharma', 'Gita Sharma', 'mismatch'],
  ])('%s vs %s → %s', (a, b, v) => { expect(compareNames(a, b).verdict).toBe(v); });
});

describe('voice + tts helpers', () => {
  it('spoken punctuation and digits', () => {
    expect(postProcessDictation('आज 5 गते हो पूर्णविराम')).toBe('आज ५ गते हो।');
  });
  it('splits long text for speech', () => {
    const parts = splitForSpeech('पहिलो वाक्य। दोस्रो वाक्य? तेस्रो!');
    expect(parts).toEqual(['पहिलो वाक्य।', 'दोस्रो वाक्य?', 'तेस्रो!']);
  });
});
