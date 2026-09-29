/**
 * Shared types for every Patro tool.
 *
 * Design rule: tools never talk to astronomy code directly. They ask a
 * `PanchangProvider`. Your app already has a panchang engine — wrap it in this
 * interface (see core/provider.ts) and every tool automatically uses YOUR
 * numbers, so the calendar, reminders, sait and bots can never disagree.
 */

export type Paksha = 'shukla' | 'krishna';

/** 0 = Chaitra … 11 = Falgun (lunar month names). */
export type LunarMonthIndex = number;

/**
 * Month-naming convention.
 * - 'purnimanta': month ends on Purnima. Nepal's panchang uses this for naming
 *   (e.g. Krishna Janmashtami = "भाद्र कृष्ण अष्टमी").
 * - 'amanta': month ends on Aunsi (Maharashtra, Gujarat, South India).
 */
export type MonthSystem = 'purnimanta' | 'amanta';

export interface GeoLocation {
  lat: number;
  lon: number;
  /** metres; optional */
  height?: number;
  /** IANA zone used for display + "local day" boundaries */
  tz: string;
  name?: string;
}

export const KATHMANDU: GeoLocation = {
  lat: 27.7172,
  lon: 85.324,
  height: 1400,
  tz: 'Asia/Kathmandu',
  name: 'काठमाडौं',
};

export interface LunarMonthInfo {
  /** amanta index (0 = Chaitra) of the month this instant falls in */
  amantaIndex: LunarMonthIndex;
  /** true when the month has no sankranti (अधिक / मलमास) */
  adhik: boolean;
  /** true when the month contains two sankrantis (क्षय मास — very rare) */
  kshaya: boolean;
  /** new moon that starts the amanta month */
  start: Date;
  /** next new moon */
  end: Date;
}

export interface PanchangAt {
  instant: Date;
  /** 1..30 — 1..15 shukla (15 = Purnima), 16..30 krishna (30 = Aunsi) */
  tithi: number;
  paksha: Paksha;
  /** 1..15 within the paksha (15 = Purnima/Aunsi) */
  tithiInPaksha: number;
  /** 0..26 (0 = Ashwini) */
  nakshatra: number;
  /** 1..4 */
  nakshatraPada: number;
  /** 0..26 */
  yoga: number;
  /** 0..10 index into KARANA_NAMES */
  karana: number;
  /** 0..11 (0 = Mesha) — sidereal Moon sign */
  moonRashi: number;
  /** 0..11 — sidereal Sun sign */
  sunRashi: number;
  /** 0..360 Moon–Sun elongation, handy for drawing the moon */
  moonPhaseAngle: number;
  /** sidereal longitudes (Lahiri) */
  moonSidereal: number;
  sunSidereal: number;
}

export interface DayPanchang extends PanchangAt {
  /** local civil date yyyy-mm-dd (in location tz) */
  date: string;
  /** 0 = Sunday */
  weekday: number;
  sunrise: Date;
  sunset: Date;
  lunarMonth: LunarMonthInfo;
  /** month index in the requested system (purnimanta by default) */
  monthIndex: LunarMonthIndex;
  /** when the sunrise tithi ends */
  tithiEnds: Date;
}

/**
 * BS ↔ AD adapter. Your app already has a verified BS table — plug it in here.
 * Months are 1..12 (1 = Baisakh).
 */
export interface BsDate {
  year: number;
  month: number;
  day: number;
}

export interface BsAdapter {
  toAD(bs: BsDate): { year: number; month: number; day: number };
  toBS(ad: { year: number; month: number; day: number }): BsDate;
}
