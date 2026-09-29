/** Nepali labels used across tools. Keep all display strings here. */

export const LUNAR_MONTHS = [
  'चैत्र', 'वैशाख', 'ज्येष्ठ', 'आषाढ', 'श्रावण', 'भाद्र',
  'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन',
] as const;

export const LUNAR_MONTHS_ROMAN = [
  'chaitra', 'baisakh', 'jestha', 'ashadh', 'shrawan', 'bhadra',
  'ashwin', 'kartik', 'mangsir', 'poush', 'magh', 'falgun',
] as const;

export const BS_MONTHS = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत',
] as const;

export const TITHI_NAMES = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी', 'षष्ठी', 'सप्तमी',
  'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी',
] as const;

/** tithi 1..30 → label */
export function tithiName(tithi: number): string {
  if (tithi === 15) return 'पूर्णिमा';
  if (tithi === 30) return 'औंसी';
  return TITHI_NAMES[(tithi - 1) % 15];
}

export const PAKSHA_NAMES = { shukla: 'शुक्ल', krishna: 'कृष्ण' } as const;

export const NAKSHATRAS = [
  'अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु',
  'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वाफाल्गुनी', 'उत्तराफाल्गुनी', 'हस्त',
  'चित्रा', 'स्वाती', 'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढा',
  'उत्तराषाढा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वभाद्रपद', 'उत्तरभाद्रपद', 'रेवती',
] as const;

export const RASHIS = [
  'मेष', 'वृष', 'मिथुन', 'कर्कट', 'सिंह', 'कन्या',
  'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन',
] as const;

export const YOGAS = [
  'विष्कम्भ', 'प्रीति', 'आयुष्मान्', 'सौभाग्य', 'शोभन', 'अतिगण्ड', 'सुकर्मा',
  'धृति', 'शूल', 'गण्ड', 'वृद्धि', 'ध्रुव', 'व्याघात', 'हर्षण', 'वज्र',
  'सिद्धि', 'व्यतीपात', 'वरीयान्', 'परिघ', 'शिव', 'सिद्ध', 'साध्य',
  'शुभ', 'शुक्ल', 'ब्रह्म', 'इन्द्र', 'वैधृति',
] as const;

/** 0..6 movable, 7..10 fixed */
export const KARANA_NAMES = [
  'बव', 'बालव', 'कौलव', 'तैतिल', 'गर', 'वणिज', 'विष्टि (भद्रा)',
  'शकुनि', 'चतुष्पद', 'नाग', 'किंस्तुघ्न',
] as const;
export const VISHTI_KARANA = 6;

export const WEEKDAYS = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'] as const;

const NP_DIGITS = '०१२३४५६७८९';
export function toNepaliDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => NP_DIGITS[Number(d)]);
}
export function fromNepaliDigits(input: string): string {
  return input.replace(/[०-९]/g, (d) => String(NP_DIGITS.indexOf(d)));
}

/** "आश्विन कृष्ण तृतीया" */
export function formatLunarDate(monthIndex: number, paksha: 'shukla' | 'krishna', tithi: number, adhik = false): string {
  return `${adhik ? 'अधिक ' : ''}${LUNAR_MONTHS[monthIndex]} ${PAKSHA_NAMES[paksha]} ${tithiName(tithi)}`;
}
