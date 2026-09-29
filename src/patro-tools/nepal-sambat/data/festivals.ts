/**
 * Newar / Nepal Mandala festivals & jātrās keyed to the Nepal Sambat lunar calendar.
 *
 * `month` = NS month 1..12 (1 = Kachhalā), `paksha` thwa/ga, `tithi` 1..15.
 * The resolver converts these to civil dates every year with the same
 * observance rules as the main calendar (udaya / aparahna / pradosh / nishitha).
 *
 * ⚠️ Local jātrās (Bhoto Jātrā, some chariot days) are fixed by guthis/astrologers
 * each year. Those rows have `declaredAnnually: true` — show the computed date as
 * "सम्भावित" and let an editor confirm it in the admin table.
 */
import type { SourceKey, Status } from './calendar';

export type Tradition = 'hindu' | 'buddhist' | 'both' | 'civic';
export type Observance = 'udaya' | 'madhyahna' | 'aparahna' | 'pradosh' | 'nishitha';

export interface NsFestival {
  id: string;
  dev: string;
  roman: string;
  en: string;
  aliases: string[];
  anchor:
    | { kind: 'lunar'; month: number; paksha: 'thwa' | 'ga'; tithi: number; observance?: Observance; prefer?: 'first' | 'max' | 'last' }
    | { kind: 'sankranti'; rashi: number; offsetDays?: number };
  /** number of days (≥1) */
  spanDays: number;
  tradition: Tradition;
  places: string[];
  summary: string;
  isNewYear?: boolean;
  publicHoliday?: 'national' | 'valley' | 'none' | 'check';
  declaredAnnually?: boolean;
  sources: SourceKey[];
  status: Status;
}

const L = (month: number, paksha: 'thwa' | 'ga', tithi: number, observance: Observance = 'udaya', prefer?: 'first' | 'max' | 'last') =>
  ({ kind: 'lunar' as const, month, paksha, tithi, observance, prefer });

export const NS_FESTIVALS: NsFestival[] = [
  // ─── Kachhalā (1) ──────────────────────────────────────────────
  { id: 'mha-puja', dev: 'म्हपूजा', roman: 'Mha Pujā', en: 'Worship of the self · Nepal Sambat New Year', aliases: ['mha puja', 'mhapuja', 'nepal sambat new year', 'न्हूदँ', 'nhu da'], anchor: L(1, 'thwa', 1), spanDays: 1, tradition: 'both', places: ['Nepal Mandala', 'Newar diaspora'], summary: 'नेपाल सम्बत नयाँ वर्ष। परिवारका सदस्यका लागि मण्डः बनाई आफैंको पूजा, सगुन र भ्वय्।', isNewYear: true, publicHoliday: 'national', sources: ['wiki_ns', 'wiki_swanti', 'hypercal'], status: 'sourced' },
  { id: 'kija-puja', dev: 'किजा पूजा', roman: 'Kijā Pujā', en: 'Worship of brothers (Bhai Tika)', aliases: ['kija puja', 'bhai tika', 'भाइटीका'], anchor: L(1, 'thwa', 2), spanDays: 1, tradition: 'hindu', places: ['Nepal Mandala'], summary: 'दिदीबहिनीले दाजुभाइको मण्डः पूजा गरी तेल, धागो र सगुन दिने।', publicHoliday: 'national', sources: ['wiki_swanti'], status: 'sourced' },
  { id: 'saki-mana-punhi', dev: 'सकिमना पुन्हि', roman: 'Saki Manā Punhi', en: 'Kārtik Purnimā', aliases: ['saki mila punhi', 'kartik purnima'], anchor: L(1, 'thwa', 15), spanDays: 1, tradition: 'hindu', places: ['Nepal Mandala'], summary: 'कार्तिक पूर्णिमा; हलिमलि पौभा र सकि (पिँडालु) खाने चलन।', sources: ['wiki_months'], status: 'sourced' },
  // ─── Thinlā (2) ────────────────────────────────────────────────
  { id: 'yomari-punhi', dev: 'यःमरि पुन्हि', roman: 'Yomari Punhi', en: 'Yomari full moon (harvest)', aliases: ['yomari punhi', 'dhanya purnima', 'yomari'], anchor: L(2, 'thwa', 15), spanDays: 1, tradition: 'both', places: ['Nepal Mandala'], summary: 'धान भित्र्याएपछिको पर्व; चाकु र तिलले भरिएको यःमरि बनाई अन्नपूर्णा पुज्ने।', publicHoliday: 'valley', sources: ['wiki_thinla'], status: 'sourced' },
  // ─── Pwanhelā (3) ──────────────────────────────────────────────
  { id: 'jana-baha-snan', dev: 'जनबहाः द्यः म्वः ल्हुइगु', roman: 'Jana Bāhā Dyah Mwah Lhuigu', en: 'Sacred bathing of White Machhendranāth', aliases: ['seto machhindranath snan'], anchor: L(3, 'thwa', 8), spanDays: 1, tradition: 'buddhist', places: ['Jana Bāhā, Kathmandu'], summary: 'करुणामय (सेतो मच्छिन्द्रनाथ) को स्नान।', sources: ['wiki_pwanhela'], status: 'review' },
  { id: 'mila-punhi', dev: 'मिला पुन्हि', roman: 'Milā Punhi', en: 'Pauṣ Purnimā · Swasthāni begins', aliases: ['swasthani', 'स्वस्थानी', 'mila punhi'], anchor: L(3, 'thwa', 15), spanDays: 1, tradition: 'hindu', places: ['Kathmandu', 'Sankhu'], summary: 'चाँगुनारायणको जात्रा; महिनाभरि स्वस्थानी व्रतकथा सुरु।', sources: ['wiki_pwanhela'], status: 'sourced' },
  // ─── Silā (4) ──────────────────────────────────────────────────
  { id: 'shree-panchami', dev: 'श्रीपञ्चमी', roman: 'Shree Panchami', en: 'Basanta Panchami', aliases: ['basanta panchami', 'saraswati puja'], anchor: L(4, 'thwa', 5), spanDays: 1, tradition: 'hindu', places: ['Nepal-wide'], summary: 'वसन्त ऋतुको पहिलो दिन; सरस्वती पूजा।', publicHoliday: 'check', sources: ['wiki_sila'], status: 'sourced' },
  { id: 'si-punhi', dev: 'सि पुन्हि', roman: 'Si Punhi', en: 'Māghi Purnimā · Swasthāni ends', aliases: ['maghi purnima'], anchor: L(4, 'thwa', 15), spanDays: 1, tradition: 'hindu', places: ['Sankhu', 'Nepal Mandala'], summary: 'स्वस्थानी व्रत समापन।', sources: ['wiki_sila'], status: 'sourced' },
  { id: 'sila-charhe', dev: 'सिला चह्रे', roman: 'Silā Charhe', en: 'Mahā Shivarātri', aliases: ['shivaratri', 'शिवरात्रि'], anchor: L(4, 'ga', 14, 'nishitha'), spanDays: 1, tradition: 'hindu', places: ['Pashupati', 'Nepal-wide'], summary: 'शिवको पर्व; पशुपतिमा ठूलो मेला।', publicHoliday: 'national', sources: ['wiki_sila'], status: 'sourced' },
  // ─── Chilā (5) ─────────────────────────────────────────────────
  { id: 'holi-chir', dev: 'होलि (चीर स्वनेगु)', roman: 'Holi · Chir', en: 'Holi — chir pole raised', aliases: ['holi', 'fagu', 'chir'], anchor: L(5, 'thwa', 8), spanDays: 8, tradition: 'hindu', places: ['Basantapur, Kathmandu Durbar Square'], summary: 'अष्टमीमा चीर ठड्याई पूर्णिमासम्म रङ्गको पर्व।', sources: ['wiki_chila'], status: 'sourced' },
  { id: 'nala-karunamaya', dev: 'नला करुणामय स्नान', roman: 'Nālā Karunāmaya', en: 'Nālā Karunāmaya bathing & chariot', aliases: ['nala jatra'], anchor: L(5, 'ga', 1), spanDays: 3, tradition: 'buddhist', places: ['Nālā'], summary: 'पारुमा स्नान, तृतीयामा रथयात्रा।', sources: ['wiki_chila'], status: 'sourced' },
  { id: 'pahan-charhe', dev: 'पाहाँ चह्रे', roman: 'Pāhān Charhe', en: 'Pahan Charhe', aliases: ['pahan charhe', 'pasa chahre'], anchor: L(5, 'ga', 14), spanDays: 3, tradition: 'hindu', places: ['Kathmandu (Ason, Indrachok, Maru)'], summary: 'काठमाडौंका अजिमाहरूको खटजात्रा र भेटघाट।', publicHoliday: 'valley', sources: ['wiki_chila'], status: 'sourced' },
  { id: 'ghode-jatra', dev: 'घोडेजात्रा', roman: 'Ghode Jātrā', en: 'Horse festival', aliases: ['ghode jatra', 'ghodejatra'], anchor: L(5, 'ga', 15), spanDays: 1, tradition: 'civic', places: ['Tundikhel, Kathmandu'], summary: 'टुँडिखेलमा घोडा दौड।', publicHoliday: 'valley', sources: ['wiki_chila'], status: 'sourced' },
  // ─── Chaulā (6) ────────────────────────────────────────────────
  { id: 'jana-baha-jatra', dev: 'जनबहाः द्यः जात्रा', roman: 'Jana Bāhā Dyah Jātrā', en: 'White Machhendranāth chariot', aliases: ['seto machhindranath jatra'], anchor: L(6, 'thwa', 8), spanDays: 4, tradition: 'buddhist', places: ['Jamal → Asan, Kathmandu'], summary: 'सेतो मच्छिन्द्रनाथको रथयात्रा।', sources: ['wiki_chaula'], status: 'sourced' },
  { id: 'lhuti-punhi', dev: 'ल्हुति पुन्हि', roman: 'Lhuti Punhi', en: 'Bālāju Purnimā', aliases: ['balaju purnima'], anchor: L(6, 'thwa', 15), spanDays: 1, tradition: 'both', places: ['Bālāju', 'Jāmāchwa'], summary: 'बालाजु बाइसधारामा स्नान र जामाचो डाँडा यात्रा।', sources: ['wiki_chaula'], status: 'sourced' },
  { id: 'mata-tirtha', dev: 'मामं ख्वाः स्वयेगु', roman: 'Māmyā Khwā Swayegu', en: "Mother's Day (Mātā Tīrtha Aunsi)", aliases: ['mata tirtha', "mother's day", 'आमाको मुख हेर्ने'], anchor: L(6, 'ga', 15), spanDays: 1, tradition: 'hindu', places: ['Mātā Tīrtha', 'Nepal-wide'], summary: 'आमाको मुख हेर्ने दिन।', sources: ['wiki_chaula'], status: 'review' },
  // ─── Bachhalā (7) ──────────────────────────────────────────────
  { id: 'bunga-dyah-jatra', dev: 'बुंगद्यः जात्रा', roman: 'Bunga Dyah Jātrā', en: 'Rato Machhindranāth chariot (Patan)', aliases: ['rato machhindranath', 'bunga dyo', 'machhindranath jatra'], anchor: L(7, 'thwa', 4), spanDays: 1, tradition: 'both', places: ['Pulchowk → Jawalakhel, Lalitpur'], summary: 'ललितपुरको सबैभन्दा लामो रथयात्रा सुरु; भोटो जात्राको दिन गुठीले तोक्छ।', declaredAnnually: true, sources: ['wiki_bachhala'], status: 'sourced' },
  { id: 'swanya-punhi', dev: 'स्वांया पुन्हि', roman: 'Swānyā Punhi', en: 'Buddha Jayanti', aliases: ['buddha jayanti', 'buddha purnima'], anchor: L(7, 'thwa', 15), spanDays: 1, tradition: 'buddhist', places: ['Swayambhu', 'Nepal-wide'], summary: 'बुद्धको जन्म, बोधि र महापरिनिर्वाणको पर्व।', publicHoliday: 'national', sources: ['wiki_bachhala'], status: 'sourced' },
  // ─── Tachhalā (8) ──────────────────────────────────────────────
  { id: 'sithi-nakha', dev: 'सिथि नखः', roman: 'Sithi Nakhah', en: 'Kumar Shashthi', aliases: ['sithi nakha', 'kumar sasthi'], anchor: L(8, 'thwa', 6), spanDays: 1, tradition: 'hindu', places: ['Nepal Mandala'], summary: 'कुमार (कार्तिकेय) को पर्व; इनार–पोखरी सफा गर्ने, व/वः खाने।', sources: ['wiki_tachhala'], status: 'sourced' },
  { id: 'jya-punhi', dev: 'ज्या पुन्हि', roman: 'Jyā Punhi', en: 'Jeṭh Purnimā', aliases: ['gaidu purnima'], anchor: L(8, 'thwa', 15), spanDays: 1, tradition: 'buddhist', places: ['Nepal Mandala'], summary: 'राजकुमार सिद्धार्थले गृहत्याग गरेको दिन।', sources: ['wiki_tachhala'], status: 'sourced' },
  { id: 'panauti-jatra', dev: 'पनौति जात्रा', roman: 'Panauti Jātrā', en: 'Panauti chariot festival', aliases: ['panauti jatra'], anchor: L(8, 'thwa', 15), spanDays: 1, tradition: 'hindu', places: ['Panauti'], summary: 'भैरव र भद्रकालीको रथयात्रा।', declaredAnnually: true, sources: ['wiki_tachhala'], status: 'review' },
  { id: 'macha-tiya-jatra', dev: 'मचा तिया जात्रा', roman: 'Machā Tiyā Jātrā', en: 'Trishul Jātrā', aliases: ['trishul jatra'], anchor: L(8, 'ga', 8), spanDays: 1, tradition: 'hindu', places: ['Deopatan'], summary: 'त्रिशूल सहितको जात्रा।', sources: ['wiki_tachhala'], status: 'sourced' },
  // ─── Dilā (9) ──────────────────────────────────────────────────
  { id: 'harishayani', dev: 'हरिशयनी एकादशी', roman: 'Hari Shayani Ekādashi', en: 'Vishnu’s sleep begins · Tulsi planting', aliases: ['harishayani'], anchor: L(9, 'thwa', 11), spanDays: 2, tradition: 'hindu', places: ['Homes'], summary: 'चातुर्मास सुरु; भोलिपल्ट तुलसी रोप्ने।', sources: ['wiki_dila'], status: 'sourced' },
  { id: 'dila-punhi', dev: 'दिला पुन्हि', roman: 'Dilā Punhi', en: 'Guru Purnimā', aliases: ['guru purnima'], anchor: L(9, 'thwa', 15), spanDays: 1, tradition: 'both', places: ['Nepal-wide'], summary: 'गुरु पूर्णिमा; बुद्धको प्रथम उपदेश (धर्मचक्र प्रवर्तन)।', sources: ['wiki_dila'], status: 'sourced' },
  { id: 'gathamuga', dev: 'गथांमुगः चह्रे', roman: 'Gathān Mugah Charhe', en: 'Ghantakarna', aliases: ['gathamuga', 'ghantakarna', 'गठेमंगल'], anchor: L(9, 'ga', 14), spanDays: 1, tradition: 'hindu', places: ['Every Newar tole'], summary: 'गथांमुगःको पुत्ला बनाई भूतप्रेत नगरबाहिर पठाउने।', sources: ['wiki_dila'], status: 'sourced' },
  // ─── Gunlā (10) ────────────────────────────────────────────────
  { id: 'gunla-dharma', dev: 'गुंला धर्म', roman: 'Gunlā Dharma', en: 'Holy Buddhist month', aliases: ['gunla', 'gunla bajan'], anchor: L(10, 'thwa', 1), spanDays: 30, tradition: 'buddhist', places: ['Swayambhu', 'Bāhās'], summary: 'महिनाभरि गुंला बाजं, द्यः थायेगु, बहीद्यः ब्वयेगु।', sources: ['wiki_gunla'], status: 'sourced' },
  { id: 'nag-panchami', dev: 'नाग पञ्चमी', roman: 'Nāg Panchami', en: 'Nāg Panchami', aliases: ['nag panchami'], anchor: L(10, 'thwa', 5), spanDays: 1, tradition: 'hindu', places: ['Nepal-wide'], summary: 'नागको पूजा।', sources: ['wiki_gunla'], status: 'sourced' },
  { id: 'bahidyah-bwayegu', dev: 'बहीद्यः ब्वयेगु', roman: 'Bahidyah Bwayegu', en: 'Display of Dipankara images', aliases: [], anchor: L(10, 'thwa', 8), spanDays: 1, tradition: 'buddhist', places: ['Bāhās of Kathmandu & Lalitpur'], summary: 'बहाः–बहीमा दीपंकर बुद्ध र पौभा प्रदर्शन।', sources: ['wiki_gunla'], status: 'sourced' },
  { id: 'kwati-punhi', dev: 'क्वाँति पुन्हि', roman: 'Kwānti Punhi', en: 'Janai Purnimā', aliases: ['janai purnima', 'kwati', 'rakshya bandhan'], anchor: L(10, 'thwa', 15), spanDays: 1, tradition: 'hindu', places: ['Nepal-wide'], summary: 'जनै फेर्ने, रक्षाबन्धन, क्वाँति खाने।', publicHoliday: 'national', sources: ['wiki_gunla'], status: 'review' },
  { id: 'sa-paru', dev: 'सापारु', roman: 'Sā Pāru', en: 'Gāi Jātrā', aliases: ['gai jatra', 'gaijatra', 'सापारु'], anchor: L(10, 'ga', 1), spanDays: 1, tradition: 'hindu', places: ['Kathmandu', 'Lalitpur', 'Bhaktapur'], summary: 'वर्षभित्र दिवंगत भएकाको सम्झनामा गाईजात्रा।', publicHoliday: 'valley', sources: ['wiki_gunla'], status: 'sourced' },
  { id: 'mataya', dev: 'मतया', roman: 'Matayā', en: 'Festival of lights procession (Patan)', aliases: ['mataya'], anchor: L(10, 'ga', 2), spanDays: 1, tradition: 'buddhist', places: ['Lalitpur'], summary: 'ललितपुरका बहाः–बहीमा बत्ती बोकेर परिक्रमा।', sources: ['wiki_gunla'], status: 'review' },
  { id: 'krishna-janmashtami', dev: 'कृष्ण जन्माष्टमी', roman: 'Krishna Janmāshtami', en: 'Krishna Janmāshtami', aliases: ['janmashtami'], anchor: L(10, 'ga', 8), spanDays: 1, tradition: 'hindu', places: ['Krishna Mandir, Patan'], summary: 'श्रीकृष्णको जन्मोत्सव।', publicHoliday: 'national', sources: ['wiki_gunla'], status: 'sourced' },
  { id: 'gokarna-aunsi', dev: 'बौया ख्वाः स्वयेगु', roman: 'Bauyā Khwā Swayegu', en: "Father's Day (Gokarna Aunsi)", aliases: ['gokarna aunsi', "father's day", 'बुबाको मुख हेर्ने'], anchor: L(10, 'ga', 15), spanDays: 1, tradition: 'hindu', places: ['Gokarna', 'Nepal-wide'], summary: 'बुबाको मुख हेर्ने दिन।', sources: ['wiki_gunla'], status: 'review' },
  // ─── Yanlā (11) ────────────────────────────────────────────────
  { id: 'chatha', dev: 'चथा', roman: 'Chathā', en: 'Ganesh Chaturthi', aliases: ['ganesh chaturthi', 'chatha'], anchor: L(11, 'thwa', 4), spanDays: 1, tradition: 'hindu', places: ['Nepal Mandala'], summary: 'गणेशको जन्मदिन; जुन हेर्न नहुने दिन।', sources: ['wiki_yanla'], status: 'sourced' },
  { id: 'yenya', dev: 'येँयाः', roman: 'Yenyā', en: 'Indra Jātrā', aliases: ['indra jatra', 'yenya', 'kumari jatra'], anchor: L(11, 'thwa', 12), spanDays: 8, tradition: 'both', places: ['Kathmandu Durbar Square', 'Hanuman Dhoka'], summary: 'लिंगो ठड्याउने, कुमारी रथयात्रा, लाखे–पुलुकिसि नाच, आकाशभैरव दर्शन।', publicHoliday: 'valley', sources: ['wiki_yanla'], status: 'sourced' },
  { id: 'yenya-punhi', dev: 'येँयाः पुन्हि', roman: 'Yenyā Punhi', en: 'Bhādra Purnimā (Indra Jātrā main day)', aliases: ['yenya punhi'], anchor: L(11, 'thwa', 15), spanDays: 1, tradition: 'both', places: ['Kathmandu'], summary: 'येँयाःको मुख्य पूर्णिमा।', sources: ['wiki_yanla'], status: 'sourced' },
  // ─── Kaulā (12) ────────────────────────────────────────────────
  { id: 'nalaswane', dev: 'नःलास्वने', roman: 'Nahlā Swanegu', en: 'Mohani begins (Ghatasthāpanā)', aliases: ['mohani', 'ghatasthapana', 'dashain'], anchor: L(12, 'thwa', 1), spanDays: 1, tradition: 'hindu', places: ['Nepal Mandala'], summary: 'मोहनी (दशैं) सुरु; जमरा रोप्ने।', publicHoliday: 'check', sources: ['wiki_kaula'], status: 'review' },
  { id: 'khokana-rudrayani', dev: 'खोकना रुद्रायणी प्याखं', roman: 'Rudrāyani dances', en: 'Rudrāyani masked dances', aliases: ['khokana'], anchor: L(12, 'thwa', 3), spanDays: 1, tradition: 'hindu', places: ['Khokana'], summary: 'रुद्रायणीको मुकुण्डो नाच।', sources: ['wiki_kaula'], status: 'sourced' },
  { id: 'kuchhi-bhwoy', dev: 'कुछिभ्वय्', roman: 'Kuchhi Bhwoy', en: 'Mohani — Mahā Ashtami feast', aliases: ['maha ashtami'], anchor: L(12, 'thwa', 8), spanDays: 1, tradition: 'hindu', places: ['Nepal Mandala'], summary: 'अष्टमीको भोज।', sources: ['wiki_kaula'], status: 'review' },
  { id: 'syakwo-tyakwo', dev: 'स्याक्वः त्याक्वः', roman: 'Syākwah Tyākwah', en: 'Mohani — Mahā Navami', aliases: ['maha navami'], anchor: L(12, 'thwa', 9), spanDays: 1, tradition: 'hindu', places: ['Nepal Mandala'], summary: 'नवमीको बलि र पूजा।', sources: ['wiki_kaula'], status: 'review' },
  { id: 'mohani-tika', dev: 'मोहनी टीका', roman: 'Mohani Tikā', en: 'Vijaya Dashami', aliases: ['vijaya dashami', 'dashain tika'], anchor: L(12, 'thwa', 10, 'aparahna', 'last'), spanDays: 1, tradition: 'hindu', places: ['Nepal-wide'], summary: 'विजया दशमी; ठूलाबडाबाट टीका, खड्ग जात्रा।', publicHoliday: 'national', sources: ['wiki_kaula'], status: 'sourced' },
  { id: 'kwah-puja', dev: 'क्वः पूजा', roman: 'Kwah Pujā', en: 'Swanti day 1 — crows', aliases: ['kag tihar'], anchor: L(12, 'ga', 13), spanDays: 1, tradition: 'hindu', places: ['Nepal Mandala'], summary: 'स्वन्तिको पहिलो दिन; कागलाई भोजन।', sources: ['wiki_swanti', 'wiki_kaula'], status: 'sourced' },
  { id: 'khicha-puja', dev: 'खिचा पूजा', roman: 'Khichā Pujā', en: 'Swanti day 2 — dogs', aliases: ['kukur tihar'], anchor: L(12, 'ga', 14), spanDays: 1, tradition: 'hindu', places: ['Nepal Mandala'], summary: 'कुकुरलाई माला र भोजन।', sources: ['wiki_swanti'], status: 'sourced' },
  { id: 'laxmi-puja', dev: 'सा पूजा · लक्ष्मी पूजा', roman: 'Sā Pujā · Lakshmi Pujā', en: 'Swanti day 3 — cows & Lakshmi', aliases: ['laxmi puja', 'lakshmi puja', 'gai tihar'], anchor: L(12, 'ga', 15, 'pradosh'), spanDays: 1, tradition: 'hindu', places: ['Nepal-wide'], summary: 'गाईको पूजा; साँझ लक्ष्मी पूजा।', publicHoliday: 'national', sources: ['wiki_swanti', 'wiki_kaula'], status: 'sourced' },
  // ─── Solar (संक्रान्ति / सँल्हु) ──────────────────────────────
  { id: 'ghyah-chaku-sanhu', dev: 'घ्यः चाकु सँल्हु', roman: 'Ghyah Chāku Sanhu', en: 'Māghe Sankrānti', aliases: ['maghe sankranti', 'ghyo chaku'], anchor: { kind: 'sankranti', rashi: 9 }, spanDays: 1, tradition: 'hindu', places: ['Nepal-wide'], summary: 'घ्यू, चाकु, तिलको लड्डु र तरुल खाने दिन।', publicHoliday: 'national', sources: ['wiki_sila'], status: 'review' },
  { id: 'biska', dev: 'बिस्का जात्रा', roman: 'Biskā Jātrā', en: 'Bisket Jātrā (Bhaktapur, Thimi)', aliases: ['bisket jatra', 'biska', 'sindur jatra'], anchor: { kind: 'sankranti', rashi: 0, offsetDays: -4 }, spanDays: 9, tradition: 'hindu', places: ['Bhaktapur', 'Thimi', 'Bode'], summary: 'भैरव–भद्रकालीको रथ तान्ने, योसिं (लिंगो) ठड्याउने र ढाल्ने; मेष संक्रान्तिमा केन्द्रित।', declaredAnnually: true, sources: [], status: 'review' },
];
