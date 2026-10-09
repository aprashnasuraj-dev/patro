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

/** Correct sentence-final छ misheard as the numeral ६, preserving explicit numeric contexts.
 * Audio pronunciation is ambiguous: stand-alone sixes and numeric answers remain digits. */
export function repairNepaliCopula(text: string) {
  return text.replace(/(^|[^\p{L}\p{M}\p{N}])([6६])(?=\s*(?:[।!?]|[.](?![0-9०-९])|$))/gu,
    (match, prefix, _digit, offset) => {
      const before = text.slice(0, offset + prefix.length).trimEnd();
      const words = before.match(/[\p{L}\p{M}]+/gu) || [];
      const last = words[words.length - 1] || '';
      if (!/[\u0900-\u0963]/u.test(last)) return match;
      const numberCue = /^(?:नं|नम्बर|नंबर|अङ्क|अंक|संख्या|क्रमाङ्क|क्रमांक|कोड|पिन|ओटीपी|कक्षा|ग्रेड|दफा|धारा|अध्याय|पृष्ठ|पेज|उमेर|दर|रकम|मूल्य|स्कोर|उत्तर|रोल|साल|वर्ष|गते|बजे|सेट|वार्ड|वडा|टोकन|संस्करण|भर्सन|जम्मा|करिब|लगभग|झण्डै|देखि|भन्दा|र)$/u.test(last);
      if (numberCue || /[0-9०-९]\s*(?:[+\-*/=×÷–]|र|देखि|,)\s*$/u.test(before)) return match;
      const predicate = /^(?:सामर्थ्य|क्षमता|आवश्यकता|सम्भावना|जरुरी|आवश्यक|बाध्य|तयार|राम्रो|नराम्रो|खराब|ठीक|ठिक|सही|गलत|सम्भव|असम्भव|उपलब्ध|अनुपलब्ध|बिरामी|स्वस्थ|खुसी|खुशि|खुशी|निश्चित|सुरक्षित|असुरक्षित|सक्रिय|निष्क्रिय|महत्त्वपूर्ण|महत्वपूर्ण|रहेको|भएको|गरेको)$/u.test(last);
      if (!predicate && words.length < 2) return match;
      return `${prefix}छ`;
    });
}
