import { defaultPanchang, panchangAt } from "../../patro-tools/core/astro";
import { KATHMANDU, type DayPanchang } from "../../patro-tools/core/types";

export const NPT = "Asia/Kathmandu";
export const NAKSHATRA_EN = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha",
  "Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha",
  "Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha",
  "Purva Bhadrapada","Uttara Bhadrapada","Revati"
] as const;
export const RASHI_EN = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"] as const;
export const YOGA_EN = [
  "Vishkambha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula",
  "Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyana",
  "Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"
] as const;
export const KARANA_EN = ["Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti (Bhadra)","Shakuni","Chatushpada","Naga","Kimstughna"] as const;
export const TITHI_EN = [
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami",
  "Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima","Pratipada","Dwitiya",
  "Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi",
  "Dwadashi","Trayodashi","Chaturdashi","Amavasya"
] as const;

export function todayInNepal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NPT, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function addIsoDays(value: string, offset: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset, 12));
  return date.toISOString().slice(0, 10);
}
export function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
export function formatLocalTime(value: Date | null | undefined, language: "ne" | "en"): string {
  if (!value || !Number.isFinite(value.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "ne" ? "ne-NP-u-nu-deva" : "en-GB", {
    timeZone: NPT, hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).format(value);
}
export function formatLocalDateTime(value: Date | null | undefined, language: "ne" | "en"): string {
  if (!value || !Number.isFinite(value.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "ne" ? "ne-NP-u-nu-deva" : "en-GB", {
    timeZone: NPT, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).format(value);
}
export function formatDuration(start: Date, end: Date, language: "ne" | "en"): string {
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return language === "ne" ? (h ? h + " घण्टा " : "") + (m ? m + " मिनेट" : h ? "" : "० मिनेट") : (h ? h + " h " : "") + (m ? m + " min" : h ? "" : "0 min");
}

export type PanchangField = "tithi" | "nakshatra" | "yoga" | "karana";

export function nextFieldTransition(start: Date, field: PanchangField, searchHours = 36): Date | null {
  const initial = panchangAt(start)[field];
  const endLimit = start.getTime() + searchHours * 3_600_000;
  const step = 10 * 60_000;
  let left = start.getTime();
  let right = left + step;
  while (right <= endLimit) {
    if (panchangAt(new Date(right))[field] !== initial) {
      let lo = left, hi = right;
      for (let i = 0; i < 32 && hi - lo > 1_000; i++) {
        const mid = Math.floor((lo + hi) / 2);
        if (panchangAt(new Date(mid))[field] === initial) lo = mid;
        else hi = mid;
      }
      return new Date(hi);
    }
    left = right;
    right += step;
  }
  return null;
}

export type LocalWindow = { start: Date; end: Date; segment?: number };
export type DayWindows = { rahu: LocalWindow; yamaganda: LocalWindow; gulika: LocalWindow; abhijit: LocalWindow; brahma: LocalWindow };

export function dayWindows(day: DayPanchang, previousSunset: Date): DayWindows {
  const weekday = new Date(day.date + "T12:00:00Z").getUTCDay();
  // Sunday=0 through Saturday=6. Segments are counted from local sunrise.
  const rahuSegment = [8, 2, 7, 5, 6, 4, 3][weekday];
  const yamaSegment = [5, 4, 3, 2, 1, 7, 6][weekday];
  const gulikaSegment = [7, 6, 5, 4, 3, 2, 1][weekday];
  const daylight = day.sunset.getTime() - day.sunrise.getTime();
  const eighth = daylight / 8;
  const window = (segment: number): LocalWindow => ({
    start: new Date(day.sunrise.getTime() + (segment - 1) * eighth),
    end: new Date(day.sunrise.getTime() + segment * eighth),
    segment
  });
  const previousNight = day.sunrise.getTime() - previousSunset.getTime();
  return {
    rahu: window(rahuSegment),
    yamaganda: window(yamaSegment),
    gulika: window(gulikaSegment),
    abhijit: {
      start: new Date(day.sunrise.getTime() + daylight / 2 - daylight / 30),
      end: new Date(day.sunrise.getTime() + daylight / 2 + daylight / 30)
    },
    brahma: {
      start: new Date(day.sunrise.getTime() - previousNight * 2 / 15),
      end: new Date(day.sunrise.getTime() - previousNight / 15)
    }
  };
}

export function calculateLocalDay(date: string): { day: DayPanchang; previousSunset: Date; nextSunrise: Date; windows: DayWindows } {
  if (!validIsoDate(date)) throw new Error("invalid_date");
  const day = defaultPanchang.day(date, KATHMANDU);
  const previous = defaultPanchang.day(addIsoDays(date, -1), KATHMANDU);
  const next = defaultPanchang.day(addIsoDays(date, 1), KATHMANDU);
  return {
    day,
    previousSunset: previous.sunset,
    nextSunrise: next.sunrise,
    windows: dayWindows(day, previous.sunset)
  };
}
