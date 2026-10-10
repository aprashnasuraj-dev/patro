import { jdnToGregorian, julianToJdn, type Ymd } from "../dates";

/**
 * Orthodox (Julian-computus) Easter Sunday, returned as a Gregorian civil date.
 * Meeus' Julian algorithm. Used by the Ethiopian Fasika pages and by the Greek/Bulgarian movable name days.
 * Verified: 2025-04-20, 2026-04-12, 2027-05-02, 2028-04-16, 2029-04-08, 2030-04-28, 2032-05-02.
 */
export function orthodoxEaster(year: number): Ymd {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return jdnToGregorian(julianToJdn(year, month, day));
}
