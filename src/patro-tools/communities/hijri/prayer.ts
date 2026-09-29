/**
 * Prayer times, sehri/iftar and Qibla — pure astronomy, no yearly updates.
 * Methods: Karachi (University of Islamic Sciences, 18°/18°) is common in South Asia;
 * MWL 18°/17°. Asr: Hanafi (shadow 2×) — widely followed in Nepal — or Shafi'i (1×).
 * Always show the method on screen and let users switch.
 */
import * as A from 'astronomy-engine';
import { sunriseSunset, zonedMidnight } from '../../core/astro';
import type { GeoLocation } from '../../core/types';

export const METHODS = {
  karachi: { label: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
  mwl: { label: 'Muslim World League', fajr: 18, isha: 17 },
  isna: { label: 'ISNA', fajr: 15, isha: 15 },
} as const;
export type MethodId = keyof typeof METHODS;

export interface PrayerTimes { fajr: Date; sunrise: Date; dhuhr: Date; asr: Date; maghrib: Date; isha: Date; method: MethodId; asrSchool: 'hanafi' | 'shafii' }

export function prayerTimes(date: string, loc: GeoLocation, method: MethodId = 'karachi', asrSchool: 'hanafi' | 'shafii' = 'hanafi'): PrayerTimes {
  const obs = new A.Observer(loc.lat, loc.lon, loc.height ?? 0);
  const midnight = zonedMidnight(date, loc.tz);
  const m = METHODS[method];
  const need = (t: A.AstroTime | null, what: string) => { if (!t) throw new Error(`${what} not found (high latitude?)`); return t.date; };
  const { sunrise, sunset } = sunriseSunset(date, loc);
  const noon = A.SearchHourAngle(A.Body.Sun, obs, 0, midnight).time.date;
  const dec = A.Equator(A.Body.Sun, noon, obs, true, true).dec;
  const k = asrSchool === 'hanafi' ? 2 : 1;
  const asrAlt = (Math.atan(1 / (k + Math.tan(Math.abs(loc.lat - dec) * Math.PI / 180))) * 180) / Math.PI;
  return {
    fajr: need(A.SearchAltitude(A.Body.Sun, obs, +1, midnight, 1, -m.fajr), 'fajr'),
    sunrise,
    dhuhr: new Date(noon.getTime() + 2 * 60_000), // 2-minute precaution after zenith
    asr: need(A.SearchAltitude(A.Body.Sun, obs, -1, noon, 1, asrAlt), 'asr'),
    maghrib: sunset,
    isha: need(A.SearchAltitude(A.Body.Sun, obs, -1, sunset, 1, -m.isha), 'isha'),
    method, asrSchool,
  };
}

/** Sehri ends at Fajr; iftar at Maghrib. */
export function ramadanDay(date: string, loc: GeoLocation, method: MethodId = 'karachi') {
  const p = prayerTimes(date, loc, method);
  return { date, sehriEnds: p.fajr, iftar: p.maghrib };
}

const KAABA = { lat: 21.422487, lon: 39.826206 };
/** Initial great-circle bearing to the Kaaba, degrees clockwise from true north. */
export function qibla(lat: number, lon: number): number {
  const r = Math.PI / 180;
  const dLon = (KAABA.lon - lon) * r;
  const y = Math.sin(dLon);
  const x = Math.cos(lat * r) * Math.tan(KAABA.lat * r) - Math.sin(lat * r) * Math.cos(dLon);
  return ((Math.atan2(y, x) / r) + 360) % 360;
}

/** Nepal cities with sizeable Muslim populations (coordinates, rounded). */
export const NEPAL_CITIES: GeoLocation[] = [
  { name: 'काठमाडौं', lat: 27.7172, lon: 85.324, tz: 'Asia/Kathmandu', height: 1400 },
  { name: 'बीरगञ्ज', lat: 27.0104, lon: 84.8779, tz: 'Asia/Kathmandu', height: 90 },
  { name: 'नेपालगञ्ज', lat: 28.05, lon: 81.6167, tz: 'Asia/Kathmandu', height: 150 },
  { name: 'जनकपुर', lat: 26.7288, lon: 85.9263, tz: 'Asia/Kathmandu', height: 75 },
  { name: 'कृष्णनगर', lat: 27.5667, lon: 83.0333, tz: 'Asia/Kathmandu', height: 110 },
  { name: 'विराटनगर', lat: 26.4525, lon: 87.2718, tz: 'Asia/Kathmandu', height: 72 },
  { name: 'भैरहवा', lat: 27.5059, lon: 83.4495, tz: 'Asia/Kathmandu', height: 105 },
  { name: 'राजविराज', lat: 26.5395, lon: 86.7475, tz: 'Asia/Kathmandu', height: 76 },
  { name: 'गौर', lat: 26.7667, lon: 85.2833, tz: 'Asia/Kathmandu', height: 80 },
  { name: 'पोखरा', lat: 28.2096, lon: 83.9856, tz: 'Asia/Kathmandu', height: 820 },
];
