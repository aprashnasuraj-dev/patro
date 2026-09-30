/**
 * Tharu suite. Maghi + Atwari + Jitiya + Jur Sital — all rule-based.
 * Deliberately NOT included: Tharu month names (no source found) — add only after community review.
 */
import type { Suite } from '../shared/types';

export const THARU_SOURCES = {
  kpost_maghi: 'https://kathmandupost.com/art-culture/2024/01/15/delicacies-and-rituals-of-maghi',
  rising_maghi: 'https://risingnepaldaily.com/news/55284',
  kantipur_maghi: 'https://ekantipur.com/news/2025/01/15/en/maghi-festival-in-tharu-settlement-15-10.html',
  wiki_atwari: 'https://en.wikipedia.org/wiki/Atwari',
  wiki_jursital: 'https://en.wikipedia.org/wiki/Jur_Sital',
  wiki_holidays: 'https://en.wikipedia.org/wiki/Public_holidays_in_Nepal',
};

export const THARU: Suite = {
  id: 'tharu',
  dev: 'थारू',
  en: 'Tharu suite',
  communities: ['दङ्गौरा थारू', 'राना थारू', 'कठरिया थारू', 'कोचिला थारू', 'चितवनिया थारू'],
  sources: THARU_SOURCES,
  festivals: [
    {
      id: 'maghi', dev: 'माघी', roman: 'Maghi', en: 'Tharu New Year',
      aliases: ['maghi', 'tharu new year', 'माघी पर्व'],
      rule: { kind: 'sankranti', rashi: 9 }, // Makar sankranti = Magh 1
      startOffset: 3, spanDays: 5, // Poush 28 → Magh 2
      communities: ['थारू'],
      summary: 'थारू समुदायको नयाँ वर्ष र सबैभन्दा ठूलो पर्व। क्षेत्रअनुसार १–३ दिनदेखि पुस २८ – माघ २ सम्म।',
      details: [
        'पुस २८: माछा मार्ने; पुस २९: (केही ठाउँमा) बँदेल सिकार',
        'बिहानै स्नान र टीका; दाजुभाइले दिदीबहिनीलाई चामल, दाल, नुन (निस्राउ) दिने',
        'आगो वरिपरि ढोल–नाच, मघौटा/सखिया नाच',
        'अवधि जिल्लाअनुसार १–३ दिन फरक (बर्दिया, कपिलवस्तु, रुपन्देही, दाङ) — स्थानीय विवरण समुदायबाट लिनुहोस्',
        'बरघर/बडघर, चौकीदार, लोहार, गुरुवा छान्ने/नवीकरण गर्ने गाउँ भेला — सामाजिक नियम पनि बनाइन्छ',
        'परिकार: जाँड, ढिकरी, खिचडी, घोंघी, तिलको लड्डु, भुजा, माछा',
      ],
      places: ['बर्दिया', 'दाङ', 'कैलाली', 'कञ्चनपुर', 'बाँके', 'कपिलवस्तु', 'रुपन्देही', 'चितवन'],
      holiday: 'national', sources: ['kpost_maghi', 'rising_maghi', 'kantipur_maghi'], status: 'sourced',
    },
    {
      id: 'krishna-janmashtami', dev: 'कृष्ण जन्माष्टमी (अष्टिम्की)', roman: 'Ashtimki', en: 'Krishna Janmashtami',
      rule: { kind: 'lunar', system: 'purnimanta', month: 5, paksha: 'krishna', tithi: 8, observance: 'udaya' },
      communities: ['थारू'], summary: 'थारू समुदायमा अष्टिम्की भनिने; भित्तेचित्र (अष्टिम्की चित्र) बनाउने चलन।',
      holiday: 'national', sources: ['wiki_atwari'], status: 'derived',
    },
    {
      id: 'atwari', dev: 'अट्वारी', roman: 'Atwari', en: 'Atwari (brothers fast for sisters)',
      aliases: ['atwari', 'badka atwari'],
      rule: { kind: 'relative', ref: 'krishna-janmashtami', weekday: 0, nth: 2 },
      communities: ['थारू (पश्चिम तराई)'],
      summary: 'कृष्ण जन्माष्टमीपछिको दोस्रो आइतबार; दाजुभाइले दिदीबहिनीको सुस्वास्थ्यका लागि व्रत बस्ने, भीम र सूर्यको पूजा।',
      places: ['दाङ', 'बर्दिया', 'कैलाली', 'बाँके'],
      holiday: 'community', sources: ['wiki_atwari'], status: 'review',
    },
    {
      id: 'jitiya', dev: 'जितिया', roman: 'Jitiya', en: 'Jitiya (mothers fast for children)',
      aliases: ['jitiya', 'jiutiya', 'jivitputrika'],
      rule: { kind: 'lunar', system: 'purnimanta', month: 6, paksha: 'krishna', tithi: 8, observance: 'udaya' }, // Ashwin Krishna Ashtami
      communities: ['थारू', 'मैथिल'], summary: 'आश्विन कृष्ण अष्टमीमा आमाहरूले सन्तानको दीर्घायुका लागि निराहार व्रत।',
      holiday: 'women', sources: ['wiki_holidays'], status: 'derived',
    },
    {
      id: 'jur-sital', dev: 'जुडशीतल', roman: 'Jur Sital', en: 'Solar new year (eastern Tharu)',
      rule: { kind: 'sankranti', rashi: 0 }, spanDays: 2,
      communities: ['थारू (पूर्व)', 'मैथिल'],
      summary: 'मेष संक्रान्ति: ठूलाले सानालाई शिरमा पानी छर्किने, सानाले ठूलाको खुट्टामा पानी हालेर आदर।',
      holiday: 'regional', sources: ['wiki_jursital'], status: 'sourced',
    },
  ],
};
