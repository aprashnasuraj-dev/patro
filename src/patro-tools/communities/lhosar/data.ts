/**
 * Lhosar suite — Tamang, Hyolmo, Gurung, Sherpa (and other Tibetan-Buddhist communities).
 * Every date is a rule → zero yearly maintenance. Optional overrides for Gyalpo
 * Lhosar in years where the Tibetan Phugpa calendar differs from the approximation.
 */
import type { Suite } from '../shared/types';

export const LHOSAR_SOURCES = {
  radionepal2026: 'https://radionepalonline.com/en/2026/01/19/423441.html',
  wiki_sonam: 'https://en.wikipedia.org/wiki/Sonam_Lhosar',
  wiki_tamu: 'https://en.wikipedia.org/wiki/Tamu_Lhosar',
  tamupariwar: 'https://www.tamupariwarny.org/gurung-lho-system',
  wiki_gyalpo: 'https://en.wikipedia.org/wiki/Gyalpo_Losar',
  usa_sherpa: 'https://www.sherpakyidug.org/annual-sherpa-gyalpo-losar-party-2026-year-of-the-fire-male-horse-2153-celebration/',
  hypercal97: 'https://github.com/kitsuyui/hyper-calendar/pull/97',
  wiki_tamyig: 'https://en.wikipedia.org/wiki/Tamyig',
};

export const LHOSAR: Suite = {
  id: 'lhosar',
  dev: 'ल्होसार',
  en: 'Lhosar suite',
  communities: ['तामाङ', 'ह्योल्मो', 'गुरुङ', 'शेर्पा', 'भोटिया'],
  sources: LHOSAR_SOURCES,
  festivals: [
    {
      id: 'sonam-lhosar', dev: 'सोनाम ल्होसार', roman: 'Sonam Lhosar', en: 'Tamang & Hyolmo New Year',
      aliases: ['sonam lhosar', 'sonam losar', 'tamang new year', 'सोनाम ल्होछार'],
      rule: { kind: 'lunar', system: 'amanta', month: 10, paksha: 'shukla', tithi: 1, observance: 'udaya' }, // Magh Shukla Pratipada
      communities: ['तामाङ', 'ह्योल्मो'],
      summary: 'माघ शुक्ल प्रतिपदा (जाडो अयनान्तपछिको दोस्रो औंसीपछि) मनाइने तामाङ र ह्योल्मोको नयाँ वर्ष।',
      details: ['गुम्बा र स्तुपा दर्शन, मुकुण्डो नाच', 'घर सफा गरी देवताको स्वागत', 'तामाङ सेलो र डम्फु, ह्योल्मो/रसुवामा स्याब्रु नाच', 'ह्योल्मो परिकार: खाप्से, बबर, थोङसे'],
      places: ['बौद्ध', 'स्वयम्भू', 'बागमती प्रदेशका तामाङ बस्ती'],
      holiday: 'national', announced: true,
      sources: ['radionepal2026', 'wiki_sonam'], status: 'sourced',
    },
    {
      id: 'tamu-lhosar', dev: 'तमु ल्होसार', roman: 'Tamu Lhosar', en: 'Gurung New Year',
      aliases: ['tamu lhosar', 'tamu losar', 'gurung new year', 'तमु ल्होछार'],
      rule: { kind: 'bs', month: 9, day: 15 }, // Poush 15 (≈ 30 Dec)
      communities: ['गुरुङ'],
      summary: 'पुस १५ मा मनाइने गुरुङ (तमु) समुदायको नयाँ वर्ष; पुरानो ल्होलाई बिदाइ गरी नयाँ ल्हो स्वागत।',
      details: ['स्वयम्भू र बौद्धमा लुङ्दर (प्रार्थना झण्डा)', 'परम्परागत पहिरन', 'घाटु र चुड्का नाच', 'पुस १५ मा जन्मेको बच्चा नयाँ ल्हो, पुस १४ मा जन्मेको पुरानो ल्होमा पर्छ'],
      places: ['टुँडिखेल/काठमाडौं', 'पोखरा', 'लमजुङ', 'गोरखा', 'कास्की'],
      holiday: 'national', sources: ['wiki_tamu', 'tamupariwar', 'hypercal97'], status: 'sourced',
    },
    {
      id: 'gyalpo-lhosar', dev: 'ग्याल्पो ल्होसार', roman: 'Gyalpo Lhosar', en: 'Sherpa & Tibetan New Year',
      aliases: ['gyalpo lhosar', 'gyalpo losar', 'sherpa new year', 'losar'],
      rule: { kind: 'tibetan-new-year' }, // first sunrise after the first new moon on/after 3 Feb (fits Losar 2013–2027)
      communities: ['शेर्पा', 'तामाङ', 'भोटिया', 'तिब्बती'],
      summary: 'तिब्बती पात्रोको पहिलो दिन (फेब्रुअरी ३ पछिको पहिलो औंसीपछिको दिन) मनाइने शेर्पा र भोटे समुदायको नयाँ वर्ष।',
      details: ['छ्याङकोल, गुथुक सुप, खाप्से', 'गुम्बामा चाम (मुकुण्डो नाच) र मन्त्र', 'मशाल र पटाकाले नराम्रो शक्ति धपाउने'],
      places: ['बौद्ध', 'खुम्बु', 'पोखरा', 'सोलुखुम्बु'],
      holiday: 'national', announced: true,
      sources: ['wiki_gyalpo', 'usa_sherpa', 'hypercal97'], status: 'sourced',
    },
    {
      id: 'buddha-jayanti', dev: 'बुद्ध जयन्ती', roman: 'Buddha Jayanti', en: 'Buddha Purnima',
      rule: { kind: 'lunar', system: 'purnimanta', month: 1, paksha: 'shukla', tithi: 15, observance: 'madhyahna' },
      communities: ['तामाङ', 'गुरुङ', 'शेर्पा', 'ह्योल्मो'], summary: 'बुद्धको जन्म, ज्ञान र महापरिनिर्वाणको पूर्णिमा।',
      holiday: 'national', sources: ['hypercal97'], status: 'derived',
    },
  ],
};

/** Losar greetings (Tibetan script is Unicode U+0F00–0FFF; Devanagari for Tamang/Gurung usage). */
export const LHOSAR_GREETINGS = [
  { script: 'tibetan', text: 'ལོ་གསར་བཀྲ་ཤིས་བདེ་ལེགས།', roman: 'Losar Tashi Delek', status: 'sourced' },
  { script: 'dev', text: 'ल्होसार ताशी देलेक', roman: 'Lhosar Tashi Delek', status: 'derived' },
  { script: 'dev', text: 'ल्होसारको हार्दिक शुभकामना', roman: 'Heartfelt Lhosar wishes (Nepali)', status: 'derived' },
];
