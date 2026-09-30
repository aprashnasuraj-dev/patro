/**
 * Mithila suite — Maithil festivals of Madhesh (Janakpur, Dhanusha, Mahottari, Siraha, Saptari, Sarlahi …).
 * Solar new year (Jur Sital) + lunar festivals. Chhath is also announced by the Home Ministry each year
 * (an optional override); the rule reproduces 2026 (15 Nov).
 */
import type { Suite } from '../shared/types';

export const MITHILA_SOURCES = {
  wiki_tirhuta_cal: 'https://en.wikipedia.org/wiki/Tirhuta_calendar',
  wiki_tirhuta_panchang: 'https://en.wikipedia.org/wiki/Tirhuta_Panchang',
  wiki_jursital: 'https://en.wikipedia.org/wiki/Jur_Sital',
  wiki_madhushravani: 'https://en.wikipedia.org/wiki/Madhushravani',
  mithilalegacy: 'https://mithilalegacy.com/en/calendar',
  hypercal97: 'https://github.com/kitsuyui/hyper-calendar/pull/97',
  wiki_holidays: 'https://en.wikipedia.org/wiki/Public_holidays_in_Nepal',
};

export const MITHILA: Suite = {
  id: 'mithila',
  dev: 'मिथिला',
  en: 'Mithila suite',
  communities: ['मैथिल', 'मधेशी'],
  sources: MITHILA_SOURCES,
  festivals: [
    { id: 'tila-sankranti', dev: 'तिला संक्रान्ति', roman: 'Tila Sankranti', en: 'Makar Sankranti (Mithila)', rule: { kind: 'sankranti', rashi: 9 },
      communities: ['मैथिल'], summary: 'तिल, दही–चिउरा र तिलकुट खाने दिन।', holiday: 'national', sources: ['mithilalegacy'], status: 'sourced' },
    { id: 'saraswati-puja', dev: 'सरस्वती पूजा', roman: 'Saraswati Puja', en: 'Basant Panchami', rule: { kind: 'lunar', system: 'amanta', month: 10, paksha: 'shukla', tithi: 5, observance: 'udaya' },
      communities: ['मैथिल'], summary: 'विद्याकी देवी सरस्वतीको पूजा; विद्यालयमा मूर्ति स्थापना।', holiday: 'check', sources: ['mithilalegacy', 'wiki_tirhuta_cal'], status: 'derived' },
    { id: 'jur-sital', dev: 'जुडशीतल', roman: 'Jur Sital', en: 'Maithili New Year (Aakhar Bochhor)', aliases: ['jur sital', 'jude sheetal', 'satuain', 'mithila diwas'],
      rule: { kind: 'sankranti', rashi: 0 }, spanDays: 2, communities: ['मैथिल', 'थारू'],
      summary: 'मेष संक्रान्ति: तिरहुता पञ्चाङ्गको नयाँ वर्ष। ठूलाले सानालाई शिरमा पानी छर्किने; बडी–भात र सातु।', holiday: 'regional', sources: ['wiki_jursital', 'wiki_tirhuta_panchang'], status: 'sourced' },
    { id: 'janaki-navami', dev: 'जानकी नवमी', roman: 'Janaki Navami', en: 'Sita’s birth anniversary', rule: { kind: 'lunar', system: 'amanta', month: 1, paksha: 'shukla', tithi: 9, observance: 'madhyahna' },
      communities: ['मैथिल'], summary: 'सीता (जानकी) को जन्मोत्सव; जनकपुरधाममा विशेष पूजा।', places: ['जनकपुरधाम'], holiday: 'check', sources: [], status: 'review' },
    { id: 'madhushravani', dev: 'मधुश्रावणी', roman: 'Madhushravani', en: 'Festival of newly-wed women',
      rule: { kind: 'lunar', system: 'purnimanta', month: 4, paksha: 'shukla', tithi: 3, observance: 'udaya' }, startOffset: 14, spanDays: 15,
      communities: ['मैथिल'], summary: 'नवविवाहिताले साउन कृष्ण पञ्चमीदेखि शुक्ल तृतीयासम्म नाग–गौरी पूजा र कथा सुन्ने पर्व।', sources: ['wiki_madhushravani', 'mithilalegacy'], status: 'review' },
    { id: 'chauth-chandra', dev: 'चौरचन', roman: 'Chaurchan (Chauth Chandra)', en: 'Moon worship', aliases: ['chaurchan', 'chauth chandra'],
      rule: { kind: 'lunar', system: 'purnimanta', month: 5, paksha: 'shukla', tithi: 4, observance: 'udaya' },
      communities: ['मैथिल'], summary: 'भदौ शुक्ल चतुर्थीको साँझ फलफूल, दही र पकवान चढाएर चन्द्रमाको पूजा।', sources: ['mithilalegacy'], status: 'derived' },
    { id: 'jitiya', dev: 'जितिया', roman: 'Jitiya', en: 'Mothers’ fast for children', rule: { kind: 'lunar', system: 'purnimanta', month: 6, paksha: 'krishna', tithi: 8, observance: 'udaya' },
      communities: ['मैथिल', 'थारू'], summary: 'आमाहरूले सन्तानको दीर्घायुका लागि निराहार व्रत बस्ने।', holiday: 'women', sources: ['wiki_holidays', 'mithilalegacy'], status: 'derived' },
    { id: 'kojagara', dev: 'कोजागरा', roman: 'Kojagara', en: 'Lakshmi puja · newly-weds', rule: { kind: 'lunar', system: 'purnimanta', month: 6, paksha: 'shukla', tithi: 15, observance: 'nishitha' },
      communities: ['मैथिल'], summary: 'आश्विन पूर्णिमाको रात लक्ष्मी पूजा; नवविवाहित वरलाई मखान र पान बाँड्ने।', sources: ['mithilalegacy'], status: 'derived' },
    { id: 'chhath', dev: 'छठ', roman: 'Chhath', en: 'Sun worship (4 days)', aliases: ['chhath', 'chhath puja', 'surya shashthi'],
      rule: { kind: 'lunar', system: 'amanta', month: 7, paksha: 'shukla', tithi: 6, observance: 'udaya' }, startOffset: 2, spanDays: 4,
      communities: ['मैथिल', 'मधेशी', 'थारू'],
      summary: 'नहाय–खाय, खरना, साँझको अर्घ्य (मुख्य दिन) र बिहानको उषा अर्घ्य — चार दिने सूर्य उपासना।',
      details: ['दिन १: नहाय–खाय (शुक्ल चतुर्थी)', 'दिन २: खरना (पञ्चमी)', 'दिन ३: साँझको अर्घ्य (षष्ठी)', 'दिन ४: उषा अर्घ्य (सप्तमी)', 'ठेकुवा, भुसवा, केरा, उखु'],
      holiday: 'national', announced: true, sources: ['mithilalegacy', 'hypercal97'], status: 'derived' },
    { id: 'sama-chakeva', dev: 'सामा–चकेवा', roman: 'Sama-Chakeva', en: 'Brother–sister festival with clay birds',
      rule: { kind: 'lunar', system: 'purnimanta', month: 7, paksha: 'shukla', tithi: 15, observance: 'udaya' }, startOffset: 8, spanDays: 9,
      communities: ['मैथिल'], summary: 'कार्तिक शुक्ल सप्तमीदेखि पूर्णिमासम्म दिदीबहिनीले माटाका चराचुरुङ्गी बनाई गीत गाउने; पूर्णिमामा विसर्जन।', sources: ['mithilalegacy'], status: 'derived' },
    { id: 'vivah-panchami', dev: 'विवाह पञ्चमी', roman: 'Vivah Panchami', en: 'Ram–Sita wedding anniversary',
      rule: { kind: 'lunar', system: 'amanta', month: 8, paksha: 'shukla', tithi: 5, observance: 'udaya' },
      communities: ['मैथिल'], summary: 'राम–सीता विवाहको सम्झनामा जनकपुरधाममा भव्य विवाह महोत्सव।', places: ['जनकपुरधाम'], sources: ['mithilalegacy'], status: 'derived' },
    { id: 'holi-terai', dev: 'होली (तराई)', roman: 'Holi (Terai)', en: 'Holi — Terai day', aliases: ['holi', 'phagua', 'फगुवा'],
      rule: { kind: 'lunar', system: 'purnimanta', month: 0, paksha: 'krishna', tithi: 1, observance: 'udaya' },
      communities: ['मैथिल', 'मधेशी'], summary: 'पहाडभन्दा एक दिनपछि (चैत्र कृष्ण प्रतिपदा) तराईमा मनाइने रङको पर्व; फगुवा गीत।', holiday: 'regional', sources: ['hypercal97'], status: 'derived' },
  ],
};
