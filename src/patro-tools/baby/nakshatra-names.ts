/**
 * Baby names by janma nakshatra (नक्षत्र चरण अक्षर / अवकहडा चक्र).
 * Birth details → nakshatra + pada → starting syllable → name suggestions.
 */
import { panchangAt } from '../core/astro';
import { NAKSHATRAS, RASHIS } from '../core/names';

/** 27 × 4 pada syllables (अवकहडा चक्र). */
export const PADA_SYLLABLES: string[][] = [
  ['चु', 'चे', 'चो', 'ला'], ['ली', 'लू', 'ले', 'लो'], ['अ', 'ई', 'उ', 'ए'],
  ['ओ', 'वा', 'वी', 'वू'], ['वे', 'वो', 'का', 'की'], ['कू', 'घ', 'ङ', 'छ'],
  ['के', 'को', 'हा', 'ही'], ['हू', 'हे', 'हो', 'डा'], ['डी', 'डू', 'डे', 'डो'],
  ['मा', 'मी', 'मू', 'मे'], ['मो', 'टा', 'टी', 'टू'], ['टे', 'टो', 'पा', 'पी'],
  ['पू', 'ष', 'ण', 'ठ'], ['पे', 'पो', 'रा', 'री'], ['रू', 'रे', 'रो', 'ता'],
  ['ती', 'तू', 'ते', 'तो'], ['ना', 'नी', 'नू', 'ने'], ['नो', 'या', 'यी', 'यू'],
  ['ये', 'यो', 'भा', 'भी'], ['भू', 'धा', 'फा', 'ढा'], ['भे', 'भो', 'जा', 'जी'],
  ['खी', 'खू', 'खे', 'खो'], ['गा', 'गी', 'गू', 'गे'], ['गो', 'सा', 'सी', 'सू'],
  ['से', 'सो', 'दा', 'दी'], ['दू', 'थ', 'झ', 'ञ'], ['दे', 'दो', 'चा', 'ची'],
];

export interface BirthStar {
  nakshatra: number;
  nakshatraName: string;
  pada: number;
  syllable: string;
  rashi: number;
  rashiName: string;
  /** all 4 syllables of the nakshatra — families often accept any of them */
  nakshatraSyllables: string[];
}

/** birth instant (UTC Date) → nakshatra, pada, syllable, rashi */
export function birthStar(instant: Date): BirthStar {
  const p = panchangAt(instant);
  return {
    nakshatra: p.nakshatra,
    nakshatraName: NAKSHATRAS[p.nakshatra],
    pada: p.nakshatraPada,
    syllable: PADA_SYLLABLES[p.nakshatra][p.nakshatraPada - 1],
    rashi: p.moonRashi,
    rashiName: RASHIS[p.moonRashi],
    nakshatraSyllables: PADA_SYLLABLES[p.nakshatra],
  };
}

export type Gender = 'm' | 'f' | 'u';
export interface NameEntry {
  name: string;
  roman: string;
  gender: Gender;
  meaning: string;
}

/**
 * Starter list. Replace with your full dataset (aim for 5,000+ names with
 * meanings; let users submit names and moderate them).
 */
export const NAMES: NameEntry[] = [
  { name: 'चुडामणि', roman: 'Chudamani', gender: 'm', meaning: 'शिरको रत्न' },
  { name: 'चेतना', roman: 'Chetana', gender: 'f', meaning: 'चेतना, होस' },
  { name: 'चेतन', roman: 'Chetan', gender: 'm', meaning: 'सचेत' },
  { name: 'लावण्या', roman: 'Lavanya', gender: 'f', meaning: 'सौन्दर्य' },
  { name: 'लीला', roman: 'Leela', gender: 'f', meaning: 'दैवी क्रीडा' },
  { name: 'लेखनाथ', roman: 'Lekhnath', gender: 'm', meaning: 'लेखनका स्वामी' },
  { name: 'लोकेश', roman: 'Lokesh', gender: 'm', meaning: 'संसारका स्वामी' },
  { name: 'लोचन', roman: 'Lochan', gender: 'm', meaning: 'आँखा' },
  { name: 'अर्जुन', roman: 'Arjun', gender: 'm', meaning: 'उज्यालो, पाण्डव' },
  { name: 'अदिति', roman: 'Aditi', gender: 'f', meaning: 'देवताकी माता' },
  { name: 'अनिल', roman: 'Anil', gender: 'm', meaning: 'हावा' },
  { name: 'ईश्वर', roman: 'Ishwar', gender: 'm', meaning: 'भगवान' },
  { name: 'ईशा', roman: 'Isha', gender: 'f', meaning: 'देवी' },
  { name: 'उषा', roman: 'Usha', gender: 'f', meaning: 'बिहानी' },
  { name: 'उत्तम', roman: 'Uttam', gender: 'm', meaning: 'सर्वोत्तम' },
  { name: 'एकता', roman: 'Ekata', gender: 'f', meaning: 'एकता' },
  { name: 'ओम', roman: 'Om', gender: 'm', meaning: 'पवित्र अक्षर' },
  { name: 'ओजस्वी', roman: 'Ojaswi', gender: 'u', meaning: 'तेजिलो' },
  { name: 'वाणी', roman: 'Vani', gender: 'f', meaning: 'वचन, सरस्वती' },
  { name: 'वीणा', roman: 'Veena', gender: 'f', meaning: 'बाजा' },
  { name: 'वीर', roman: 'Veer', gender: 'm', meaning: 'बहादुर' },
  { name: 'वेद', roman: 'Ved', gender: 'm', meaning: 'ज्ञान' },
  { name: 'कामना', roman: 'Kamana', gender: 'f', meaning: 'इच्छा' },
  { name: 'कार्तिक', roman: 'Kartik', gender: 'm', meaning: 'कार्तिकेय' },
  { name: 'कीर्ति', roman: 'Kirti', gender: 'f', meaning: 'यश' },
  { name: 'घनश्याम', roman: 'Ghanashyam', gender: 'm', meaning: 'कृष्ण' },
  { name: 'छवि', roman: 'Chhavi', gender: 'f', meaning: 'रूप, तस्बिर' },
  { name: 'केशव', roman: 'Keshav', gender: 'm', meaning: 'कृष्ण' },
  { name: 'केतकी', roman: 'Ketaki', gender: 'f', meaning: 'एक फूल' },
  { name: 'कोमल', roman: 'Komal', gender: 'u', meaning: 'नरम' },
  { name: 'कोकिला', roman: 'Kokila', gender: 'f', meaning: 'कोइली' },
  { name: 'हार्दिक', roman: 'Hardik', gender: 'm', meaning: 'हृदयदेखिको' },
  { name: 'हीरा', roman: 'Heera', gender: 'f', meaning: 'हीरा' },
  { name: 'हेमन्त', roman: 'Hemant', gender: 'm', meaning: 'हेमन्त ऋतु' },
  { name: 'हेमा', roman: 'Hema', gender: 'f', meaning: 'सुनौलो' },
  { name: 'माधव', roman: 'Madhav', gender: 'm', meaning: 'कृष्ण' },
  { name: 'माया', roman: 'Maya', gender: 'f', meaning: 'माया, प्रेम' },
  { name: 'मानसी', roman: 'Mansi', gender: 'f', meaning: 'मनकी' },
  { name: 'मीरा', roman: 'Meera', gender: 'f', meaning: 'कृष्णभक्त' },
  { name: 'मेघा', roman: 'Megha', gender: 'f', meaning: 'बादल' },
  { name: 'मोहन', roman: 'Mohan', gender: 'm', meaning: 'मनमोहक' },
  { name: 'पार्वती', roman: 'Parvati', gender: 'f', meaning: 'पर्वतपुत्री' },
  { name: 'पार्थ', roman: 'Parth', gender: 'm', meaning: 'अर्जुन' },
  { name: 'पीताम्बर', roman: 'Pitambar', gender: 'm', meaning: 'पहेंलो वस्त्रधारी' },
  { name: 'पूजा', roman: 'Puja', gender: 'f', meaning: 'पूजा' },
  { name: 'पूर्णिमा', roman: 'Purnima', gender: 'f', meaning: 'पूर्ण चन्द्र' },
  { name: 'राम', roman: 'Ram', gender: 'm', meaning: 'भगवान राम' },
  { name: 'राधा', roman: 'Radha', gender: 'f', meaning: 'कृष्णप्रिया' },
  { name: 'राजेश', roman: 'Rajesh', gender: 'm', meaning: 'राजाहरूका राजा' },
  { name: 'रूपा', roman: 'Rupa', gender: 'f', meaning: 'सुन्दर' },
  { name: 'रेखा', roman: 'Rekha', gender: 'f', meaning: 'रेखा' },
  { name: 'रेणु', roman: 'Renu', gender: 'f', meaning: 'कण' },
  { name: 'रोहन', roman: 'Rohan', gender: 'm', meaning: 'माथि उक्लने' },
  { name: 'रोशनी', roman: 'Roshani', gender: 'f', meaning: 'उज्यालो' },
  { name: 'तारा', roman: 'Tara', gender: 'f', meaning: 'तारा' },
  { name: 'तीर्थ', roman: 'Tirtha', gender: 'm', meaning: 'पवित्र स्थल' },
  { name: 'तेज', roman: 'Tej', gender: 'm', meaning: 'तेज, चमक' },
  { name: 'नारायण', roman: 'Narayan', gender: 'm', meaning: 'विष्णु' },
  { name: 'नारायणी', roman: 'Narayani', gender: 'f', meaning: 'लक्ष्मी' },
  { name: 'नीरज', roman: 'Neeraj', gender: 'm', meaning: 'कमल' },
  { name: 'नीलम', roman: 'Neelam', gender: 'f', meaning: 'नीलमणि' },
  { name: 'नूतन', roman: 'Nutan', gender: 'u', meaning: 'नयाँ' },
  { name: 'नेत्र', roman: 'Netra', gender: 'm', meaning: 'आँखा' },
  { name: 'यामिनी', roman: 'Yamini', gender: 'f', meaning: 'रात' },
  { name: 'योगेश', roman: 'Yogesh', gender: 'm', meaning: 'योगका स्वामी' },
  { name: 'भानु', roman: 'Bhanu', gender: 'm', meaning: 'सूर्य' },
  { name: 'भारती', roman: 'Bharati', gender: 'f', meaning: 'सरस्वती' },
  { name: 'भीम', roman: 'Bhim', gender: 'm', meaning: 'बलशाली' },
  { name: 'भूमि', roman: 'Bhumi', gender: 'f', meaning: 'धरती' },
  { name: 'भूपेन्द्र', roman: 'Bhupendra', gender: 'm', meaning: 'राजा' },
  { name: 'धारा', roman: 'Dhara', gender: 'f', meaning: 'धारा, प्रवाह' },
  { name: 'फाल्गुनी', roman: 'Falguni', gender: 'f', meaning: 'फाल्गुनमा जन्मेकी' },
  { name: 'भोला', roman: 'Bhola', gender: 'm', meaning: 'निश्छल, शिव' },
  { name: 'जानकी', roman: 'Janaki', gender: 'f', meaning: 'सीता' },
  { name: 'जीवन', roman: 'Jeevan', gender: 'm', meaning: 'जीवन' },
  { name: 'गायत्री', roman: 'Gayatri', gender: 'f', meaning: 'वेदमाता' },
  { name: 'गार्गी', roman: 'Gargi', gender: 'f', meaning: 'विदुषी ऋषि' },
  { name: 'गीता', roman: 'Gita', gender: 'f', meaning: 'पवित्र गीत' },
  { name: 'गोपाल', roman: 'Gopal', gender: 'm', meaning: 'कृष्ण' },
  { name: 'सागर', roman: 'Sagar', gender: 'm', meaning: 'समुद्र' },
  { name: 'साधना', roman: 'Sadhana', gender: 'f', meaning: 'तपस्या' },
  { name: 'सीता', roman: 'Sita', gender: 'f', meaning: 'जानकी' },
  { name: 'सूर्य', roman: 'Surya', gender: 'm', meaning: 'सूर्य' },
  { name: 'सोनम', roman: 'Sonam', gender: 'u', meaning: 'भाग्यशाली' },
  { name: 'सोमनाथ', roman: 'Somnath', gender: 'm', meaning: 'शिव' },
  { name: 'दामोदर', roman: 'Damodar', gender: 'm', meaning: 'कृष्ण' },
  { name: 'दीपक', roman: 'Deepak', gender: 'm', meaning: 'दियो' },
  { name: 'दीपा', roman: 'Deepa', gender: 'f', meaning: 'उज्यालो' },
  { name: 'देवेन्द्र', roman: 'Devendra', gender: 'm', meaning: 'देवताका राजा' },
  { name: 'देवी', roman: 'Devi', gender: 'f', meaning: 'देवी' },
  { name: 'चाँदनी', roman: 'Chandani', gender: 'f', meaning: 'जुनेली' },
];

/**
 * Nepali pronunciation leniency: ि≈ी, ु≈ू, व≈ब, श≈ष≈स (optional).
 * Families usually accept names that SOUND like the syllable.
 */
function soundKey(s: string, lenient: boolean): string {
  let k = s.normalize('NFC');
  if (!lenient) return k;
  k = k.replace(/ी/g, 'ि').replace(/ू/g, 'ु').replace(/व/g, 'ब').replace(/[शष]/g, 'स').replace(/[ँं]/g, '');
  return k;
}

export function namesForSyllables(
  syllables: string[],
  opts: { gender?: Gender; lenient?: boolean; list?: NameEntry[] } = {},
): { syllable: string; names: NameEntry[] }[] {
  const lenient = opts.lenient ?? true;
  const list = opts.list ?? NAMES;
  return syllables.map((syl) => {
    const key = soundKey(syl, lenient);
    const bareConsonant = /^[\u0915-\u0939]$/.test(syl); // ष, ण, ठ, घ, छ, थ, झ …
    const names = list.filter((n) => {
      if (opts.gender && n.gender !== opts.gender && n.gender !== 'u') return false;
      const nk = soundKey(n.name, lenient);
      if (!nk.startsWith(key)) return false;
      // bare consonant = consonant + inherent "a": next char must not be a matra/virama
      return !bareConsonant || !/^[\u093E-\u094D]/.test(nk.slice(key.length));
    });
    return { syllable: syl, names };
  });
}
