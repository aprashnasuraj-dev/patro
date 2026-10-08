const VALUES: Record<string, number> = {
  शून्य: 0, सुन्य: 0, एक: 1, दुई: 2, तीन: 3, चार: 4, पाँच: 5, छ: 6, सात: 7, आठ: 8, नौ: 9,
  दस: 10, दश: 10, एघार: 11, बाह्र: 12, तेह्र: 13, चौध: 14, पन्ध्र: 15, सोह्र: 16, सत्र: 17, अठार: 18, उन्नाइस: 19,
  बीस: 20, बिस: 20, एक्काइस: 21, बाइस: 22, तेइस: 23, चौबीस: 24, पच्चीस: 25, छब्बीस: 26, सत्ताइस: 27, अठ्ठाइस: 28, उनन्तीस: 29,
  तीस: 30, चालीस: 40, पचास: 50, साठी: 60, सत्तरी: 70, असी: 80, नब्बे: 90,
};
const SCALES: Record<string, number> = { सय: 100, हजार: 1000, लाख: 100000, करोड: 10000000 };
const tokens = [...Object.keys(VALUES), ...Object.keys(SCALES)].sort((a, b) => b.length - a.length).join('|');
const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${tokens})(?:\\s+(?:${tokens}))*(?![\\p{L}\\p{N}])`, 'gu');

/** Opt-in: common Nepali numbers; unsupported forms are left as dictated. */
export function convertSpokenNepaliNumbers(text: string) {
  return text.replace(pattern, (phrase: string, offset: number) => {
    const words = phrase.split(/\s+/);
    // छ is also the Nepali copula. Convert it only with a numeric context.
    if (phrase === 'छ' && text.trim() !== 'छ' && !/^\s+(?:बजे|बजेर|वटा|जना|दिन|महिना|वर्ष|साल|गते|रुपैयाँ|रुपैया|रुपियाँ|रुपिया|रु|किलो|मिटर|प्रतिशत|कक्षा)(?![\p{L}\p{N}])/u.test(text.slice(offset + phrase.length))) return phrase;
    if (!words.some(word => word in SCALES)) return words.map(word => String(VALUES[word])).join(' ');
    let total = 0, group = 0;
    for (const word of words) {
      if (word in VALUES) group += VALUES[word];
      else if (SCALES[word] === 100) group = (group || 1) * 100;
      else { total += (group || 1) * SCALES[word]; group = 0; }
    }
    return String(total + group);
  });
}

/** Repair a narrow ASR homophone only after predicates that take the copula.
 * Other dictated sixes stay numeric; this is not a general grammar rewriter. */
export function repairNepaliCopula(text: string) {
  return text.replace(/(सामर्थ्य|क्षमता|आवश्यकता|सम्भावना|जरुरी|आवश्यक)\s+[6६](?=\s*(?:[।.!?]|$))/gu, '$1 छ');
}
