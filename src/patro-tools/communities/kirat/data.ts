/**
 * Kirat suite — Rai, Limbu (Yakthung), Yakkha, Sunuwar.
 * Sakela/Chasok dates are pure lunar rules. Yele Sambat new-year rule is
 * CONFIGURABLE because sources disagree (see YELE_NEW_YEAR_MODE).
 */
import type { Suite } from '../shared/types';

export const KIRAT_SOURCES = {
  wiki_sakela: 'https://en.wikipedia.org/wiki/Sakela',
  wiki_udhauli: 'https://en.wikipedia.org/wiki/Udhauli',
  wiki_yele: 'https://en.wikipedia.org/wiki/Yele_Sambat',
  mundhum: 'https://mundhum.com/calendar',
  wiki_limbu_script: 'https://en.wikipedia.org/wiki/Limbu_script',
  wiki_kirat_rai_block: 'https://en.wikipedia.org/wiki/Kirat_Rai_(Unicode_block)',
};

/** Names of Sakela in Kirat languages (Wikipedia: Sakela). */
export const SAKELA_NAMES: Record<string, string> = {
  'Chamling': 'Sakela', 'Bantawa': 'Sakewa / Sakenwa', 'Dungmali': 'Sakewa', 'Mewahang': 'Sakewa',
  'Kulung': 'Tosh', 'Nachhiring': 'Tosh', 'Thulung': 'Toshi', 'Bahing': 'Segro',
  'Lohorung': 'Iksamang', 'Yamphu': 'Iksamang', 'Puma': 'Fagulak',
};

export const KIRAT: Suite = {
  id: 'kirat',
  dev: 'किरात',
  en: 'Kirat suite',
  communities: ['राई', 'लिम्बू (याक्थुङ)', 'याक्खा', 'सुनुवार'],
  sources: KIRAT_SOURCES,
  festivals: [
    {
      id: 'ubhauli', dev: 'साकेला उभौली', roman: 'Sakela Ubhauli', en: 'Spring Sakela (upward migration)',
      names: SAKELA_NAMES, aliases: ['ubhauli', 'sakela', 'sakewa', 'sakela ubhauli'],
      rule: { kind: 'lunar', system: 'purnimanta', month: 1, paksha: 'shukla', tithi: 15, observance: 'udaya' }, // Baisakh Purnima
      communities: ['राई', 'लिम्बू', 'याक्खा', 'सुनुवार'],
      summary: 'बैशाख पूर्णिमामा बाली लगाउनुअघि भूमि र पितृ (पारुहाङ–सुम्निमा) को पूजा; सिलिमाङपा–सिलिमाङमाको अगुवाइमा साकेला सिली नाच।',
      details: ['उत्सव मौसम १५ दिनसम्म', 'सिली (नाचका शैली) ले मानव र प्रकृतिको सम्बन्ध देखाउँछ', 'ढोल–झ्याम्टा, परम्परागत पहिरन'],
      holiday: 'national', sources: ['wiki_sakela', 'wiki_udhauli'], status: 'sourced',
    },
    {
      id: 'udhauli', dev: 'साकेला उधौली', roman: 'Sakela Udhauli', en: 'Autumn Sakela (harvest, downward migration)',
      names: SAKELA_NAMES, aliases: ['udhauli', 'sakela udhauli'],
      rule: { kind: 'lunar', system: 'purnimanta', month: 8, paksha: 'shukla', tithi: 15, observance: 'udaya' }, // Mangsir Purnima
      communities: ['राई', 'लिम्बू', 'याक्खा', 'सुनुवार'],
      summary: 'मंसिर पूर्णिमामा अन्नबाली भित्र्याएपछि प्रकृति र पितृप्रति कृतज्ञता; साकेला नाच।',
      holiday: 'national', sources: ['wiki_sakela', 'wiki_udhauli'], status: 'sourced',
    },
    {
      id: 'chasok-tangnam', dev: 'चासोक तङनाम', roman: 'Chasok Tangnam', en: 'Limbu harvest festival',
      rule: { kind: 'lunar', system: 'purnimanta', month: 8, paksha: 'shukla', tithi: 15, observance: 'udaya' },
      communities: ['लिम्बू'], summary: 'नयाँ अन्न युमा साम्माङ र पितृलाई चढाउने लिम्बू न्वागी पर्व।', holiday: 'community', sources: ['mundhum'], status: 'review',
    },
    {
      id: 'yele-new-year', dev: 'येले सम्वत् नयाँ वर्ष (काक्फेक्वा तङनाम)', roman: 'Yele Sambat New Year', en: 'Kirat New Year',
      aliases: ['yele sambat', 'kakphekwa', 'yele dong', 'kirat new year'],
      rule: { kind: 'sankranti', rashi: 9 }, // default: Maghe Sankranti (Wikipedia). Alternative in yele.ts
      communities: ['राई', 'लिम्बू', 'याक्खा', 'सुनुवार'],
      summary: 'किरात येले सम्वत्को नयाँ वर्ष; तरुल, सखरखण्ड र सेलरोटी खाने चलन।', holiday: 'national', sources: ['wiki_yele', 'mundhum'], status: 'review',
    },
  ],
};

/** Seasonal Kirat observances with no single date rule yet (display as "season" only). */
export const KIRAT_SEASONAL = [
  { id: 'yokwa', dev: 'योक्वा', communities: ['लिम्बू'], season: 'शरद (असोज–कात्तिक)', note: 'पितृ आह्वान', source: 'mundhum', status: 'review' },
  { id: 'balihang-tangnam', dev: 'बलिहाङ तङनाम', communities: ['लिम्बू'], season: 'वसन्त (फागुन–चैत)', note: 'राजा बलिहाङको सम्झना', source: 'mundhum', status: 'review' },
  { id: 'wadhangmi', dev: 'वाधाङमी / न्वागी', communities: ['राई'], season: 'शरद', note: 'नयाँ अन्न', source: 'mundhum', status: 'review' },
];
