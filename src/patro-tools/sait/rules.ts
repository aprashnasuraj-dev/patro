/**
 * Sait (muhurat) rule sets.
 *
 * ⚠️ These are the widely used classical filters (Muhurta Chintamani style).
 * Nepal's official vivah/bratabandha saits are published by the Nepal Panchang
 * Nirnayak Samiti. Load that list as `officialDates` — the finder shows official
 * dates first and labels computed ones as "सम्भावित — पुरोहितसँग पक्का गर्नुहोस्".
 * Have a jyotishi review this file before launch; treat it as config, not code.
 */

export type SaitKind = 'vivah' | 'bratabandha' | 'griha_pravesh' | 'vehicle' | 'business' | 'namakaran';

export interface SaitRuleSet {
  kind: SaitKind;
  label: string;
  /** allowed nakshatra indices (0 = Ashwini) */
  nakshatras: number[];
  /** allowed weekdays, 0 = Sunday */
  weekdays: number[];
  /** forbidden tithis 1..30 */
  avoidTithis: number[];
  avoidYogas: number[];
  avoidVishti: boolean;
  avoidChaturmas: boolean;
  /** Sun in Dhanu or Meen (खरमास) */
  avoidKharmas: boolean;
  avoidAdhik: boolean;
  /** Venus/Jupiter combust (शुक्र/गुरु अस्त) */
  avoidCombust: boolean;
  /** allowed amanta months, if restricted (e.g. bratabandha season) */
  months?: number[];
}

const RIKTA_AND_AUNSI = [4, 9, 14, 19, 24, 29, 30];
// विष्कम्भ, अतिगण्ड, शूल, गण्ड, व्याघात, वज्र, व्यतीपात, परिघ, वैधृति
const BAD_YOGAS = [0, 5, 8, 9, 12, 14, 16, 18, 26];

export const SAIT_RULES: Record<SaitKind, SaitRuleSet> = {
  vivah: {
    kind: 'vivah', label: 'विवाह',
    nakshatras: [3, 4, 9, 11, 12, 14, 16, 18, 20, 25, 26],
    weekdays: [1, 3, 4, 5],
    avoidTithis: RIKTA_AND_AUNSI, avoidYogas: BAD_YOGAS, avoidVishti: true,
    avoidChaturmas: true, avoidKharmas: true, avoidAdhik: true, avoidCombust: true,
  },
  bratabandha: {
    kind: 'bratabandha', label: 'व्रतबन्ध',
    nakshatras: [0, 3, 4, 6, 7, 11, 12, 13, 14, 20, 21, 22, 23, 25, 26],
    weekdays: [0, 1, 3, 4, 5],
    avoidTithis: RIKTA_AND_AUNSI, avoidYogas: BAD_YOGAS, avoidVishti: true,
    avoidChaturmas: true, avoidKharmas: true, avoidAdhik: true, avoidCombust: true,
    months: [0, 1, 2, 9, 10, 11], // चैत्र–ज्येष्ठ, पौष–फाल्गुन (उत्तरायण)
  },
  griha_pravesh: {
    kind: 'griha_pravesh', label: 'गृहप्रवेश',
    nakshatras: [3, 4, 11, 13, 16, 20, 22, 23, 25, 26],
    weekdays: [1, 3, 4, 5],
    avoidTithis: RIKTA_AND_AUNSI, avoidYogas: BAD_YOGAS, avoidVishti: true,
    avoidChaturmas: true, avoidKharmas: true, avoidAdhik: true, avoidCombust: true,
  },
  vehicle: {
    kind: 'vehicle', label: 'सवारी साधन खरिद',
    nakshatras: [0, 4, 6, 7, 12, 13, 14, 16, 21, 22, 23, 26],
    weekdays: [1, 3, 4, 5],
    avoidTithis: RIKTA_AND_AUNSI, avoidYogas: BAD_YOGAS, avoidVishti: true,
    avoidChaturmas: false, avoidKharmas: false, avoidAdhik: false, avoidCombust: false,
  },
  business: {
    kind: 'business', label: 'व्यवसाय शुभारम्भ',
    nakshatras: [0, 3, 7, 11, 12, 13, 16, 20, 25, 26],
    weekdays: [1, 3, 4, 5],
    avoidTithis: RIKTA_AND_AUNSI, avoidYogas: BAD_YOGAS, avoidVishti: true,
    avoidChaturmas: false, avoidKharmas: true, avoidAdhik: true, avoidCombust: false,
  },
  namakaran: {
    kind: 'namakaran', label: 'न्वारन / नामकरण',
    nakshatras: [0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 23, 25, 26],
    weekdays: [0, 1, 3, 4, 5],
    avoidTithis: RIKTA_AND_AUNSI, avoidYogas: [], avoidVishti: true,
    avoidChaturmas: false, avoidKharmas: false, avoidAdhik: false, avoidCombust: false,
  },
};
