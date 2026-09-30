/**
 * Community suites — shared types.
 *
 * DESIGN GOAL: zero yearly maintenance. Every date is a RULE evaluated by the
 * engine for any year (1900–2100). Nothing is a hard-coded date.
 * Optional `Override`s let an editor pin an officially announced date
 * (Home Ministry notice, Muslim Commission moon sighting) — the app keeps
 * working without them; they only upgrade "expected" to "announced".
 */
export type Status = 'sourced' | 'derived' | 'review';

export type Rule =
  /** lunar tithi. month 0 = Chaitra … 11 = Falgun, in `system` naming */
  | { kind: 'lunar'; system: 'amanta' | 'purnimanta'; month: number; paksha: 'shukla' | 'krishna'; tithi: number;
      observance?: 'udaya' | 'madhyahna' | 'aparahna' | 'pradosh' | 'nishitha'; prefer?: 'first' | 'max' | 'last' }
  /** day the Sun enters a sidereal sign (0 = Mesha … 9 = Makara), ± offset */
  | { kind: 'sankranti'; rashi: number; offsetDays?: number }
  /** fixed Bikram Sambat date (month 1 = Baisakh). Uses your BS adapter; falls back to sankranti + (day-1). */
  | { kind: 'bs'; month: number; day: number }
  /** nth weekday after another festival of the same suite (0 = Sunday) */
  | { kind: 'relative'; ref: string; weekday: number; nth: number }
  /** Islamic month/day — resolved to an EXPECTED date by crescent visibility */
  | { kind: 'hijri'; month: number; day: number; eve?: boolean }
  /** Tibetan new year approximated by amanta Phalguna shukla 1 (see lhosar/README) */
  | { kind: 'tibetan-new-year' };

export interface RegionVariant {
  id: string;
  label: string;
  /** shift relative to the main date (e.g. Terai Holi = +1) */
  offsetDays?: number;
  spanDays?: number;
  startOffset?: number;
}

export interface CommunityFestival {
  id: string;
  /** Devanagari name */
  dev: string;
  roman: string;
  en: string;
  /** other names by language/community: { "Bantawa": "Sakewa", … } */
  names?: Record<string, string>;
  aliases?: string[];
  rule: Rule;
  /** days before the main day the observance starts (e.g. Chhath starts 2 days before Sandhya Arghya) */
  startOffset?: number;
  spanDays?: number;
  regions?: RegionVariant[];
  communities: string[];
  summary: string;
  /** rituals, foods, music — short bullet lines */
  details?: string[];
  places?: string[];
  holiday?: 'national' | 'community' | 'women' | 'regional' | 'none' | 'check';
  /** date is also announced officially each year (optional override) */
  announced?: boolean;
  sources: string[];
  status: Status;
}

export interface Override { festivalId: string; year: number; start: string; end?: string; note?: string }

export type Confidence = 'computed' | 'expected' | 'announced';

export interface ResolvedDate {
  festival: CommunityFestival;
  region?: RegionVariant;
  /** the main observance day */
  main: string;
  start: string;
  end: string;
  confidence: Confidence;
}

export interface Suite {
  id: 'lhosar' | 'tharu' | 'mithila' | 'kirat' | 'hijri';
  dev: string;
  en: string;
  communities: string[];
  festivals: CommunityFestival[];
  sources: Record<string, string>;
}
