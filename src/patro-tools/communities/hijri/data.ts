/** Hijri suite — Islamic observances, all resolved by crescent-visibility rule (expected). */
import type { Suite } from '../shared/types';

export const HIJRI_SOURCES = {
  ratopati_eid2026: 'https://english.ratopati.com/story/54693/eid-ul-fitr-on-saturday-ministry-of-home-affairs-issues-notice',
  kpost_eid2025: 'https://kathmandupost.com/national/2025/03/30/government-declares-public-holiday-on-monday',
  nepalnews_adha: 'https://english.nepalnews.com/s/nation/public-holiday-announced-on-may-28-for-eid-al-adha/',
};

export const HIJRI: Suite = {
  id: 'hijri',
  dev: 'हिजरी',
  en: 'Hijri suite',
  communities: ['मुस्लिम'],
  sources: HIJRI_SOURCES,
  festivals: [
    { id: 'islamic-new-year', dev: 'हिजरी नयाँ वर्ष', roman: 'Islamic New Year', en: '1 Muharram', rule: { kind: 'hijri', month: 1, day: 1 }, communities: ['मुस्लिम'], summary: 'हिजरी सम्वत्को पहिलो दिन।', sources: [], status: 'derived' },
    { id: 'ashura', dev: 'आशुरा', roman: 'Ashura', en: '10 Muharram', rule: { kind: 'hijri', month: 1, day: 10 }, communities: ['मुस्लिम'], summary: 'मुहर्रमको दशौं दिन; ताजिया जुलुस (कतिपय स्थानमा)।', sources: [], status: 'derived' },
    { id: 'mawlid', dev: 'मिलाद–उन–नबी', roman: 'Mawlid an-Nabi', en: '12 Rabi al-Awwal', rule: { kind: 'hijri', month: 3, day: 12 }, communities: ['मुस्लिम'], summary: 'पैगम्बर मुहम्मदको जन्मदिन मनाउने दिन (परम्पराअनुसार)।', sources: [], status: 'derived' },
    { id: 'shab-e-miraj', dev: 'शब–ए–मेराज', roman: 'Shab-e-Miraj', en: 'Night of 27 Rajab', rule: { kind: 'hijri', month: 7, day: 27, eve: true }, communities: ['मुस्लिम'], summary: 'रजब २७ को रात।', sources: [], status: 'derived' },
    { id: 'shab-e-barat', dev: 'शब–ए–बरात', roman: 'Shab-e-Barat', en: 'Night of 15 Sha’ban', rule: { kind: 'hijri', month: 8, day: 15, eve: true }, communities: ['मुस्लिम'], summary: 'शाबान १४–१५ को रात; प्रार्थना र पितृ सम्झना।', sources: [], status: 'derived' },
    { id: 'ramadan-start', dev: 'रमजान सुरु', roman: 'Ramadan begins', en: '1 Ramadan', rule: { kind: 'hijri', month: 9, day: 1 }, spanDays: 29, communities: ['मुस्लिम'], summary: 'रोजाको महिना; सेहरी र इफ्तारको समय तल हेर्नुहोस्।', announced: true, sources: [], status: 'derived' },
    { id: 'laylat-al-qadr', dev: 'शब–ए–कद्र', roman: 'Laylat al-Qadr', en: 'Night of 27 Ramadan', rule: { kind: 'hijri', month: 9, day: 27, eve: true }, communities: ['मुस्लिम'], summary: 'रमजानको अन्तिम दश रातमध्ये (प्रायः २७ औं रात)।', sources: [], status: 'derived' },
    { id: 'eid-ul-fitr', dev: 'ईद–उल–फित्र', roman: 'Eid ul-Fitr', en: '1 Shawwal', aliases: ['eid', 'ramjan edul fikra', 'रमजान ईद'], rule: { kind: 'hijri', month: 10, day: 1 }, communities: ['मुस्लिम'],
      summary: 'रमजानपछिको ईद। नेपालमा मुस्लिम आयोगको चन्द्रदर्शनको आधारमा गृह मन्त्रालयले बिदा घोषणा गर्छ।', holiday: 'national', announced: true, sources: ['ratopati_eid2026', 'kpost_eid2025'], status: 'sourced' },
    { id: 'eid-al-adha', dev: 'ईद–उल–अजहा (बकर ईद)', roman: 'Eid al-Adha', en: '10 Dhu al-Hijjah', aliases: ['bakar eid', 'bakrid'], rule: { kind: 'hijri', month: 12, day: 10 }, communities: ['मुस्लिम'],
      summary: 'कुर्बानीको ईद; हज्जको समयसँग जोडिएको।', holiday: 'national', announced: true, sources: ['nepalnews_adha'], status: 'sourced' },
  ],
};
