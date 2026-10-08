/**
 * Eclipse computations (pure). Local circumstances for any city via astronomy-engine.
 * Validated: 2 Aug 2027 Cádiz totality 174 s vs timeanddate.com 2 min 56 s; Luxor 385 s vs published ≈6 min 23 s.
 */
import * as A from "astronomy-engine";

export interface EclipseCity { slug: string; name: string; country: string; lat: number; lon: number; tz: string; h?: number; }

/** Cities chosen for the 2026–2028 European/African/Middle-East eclipse paths plus world capitals. */
export const ECLIPSE_CITIES: EclipseCity[] = [
  // Spain (2026 total in the north, 2027 total in the far south)
  ["madrid", "Madrid", "Spain", 40.4168, -3.7038, "Europe/Madrid", 657], ["barcelona", "Barcelona", "Spain", 41.3874, 2.1686, "Europe/Madrid", 12], ["valencia", "Valencia", "Spain", 39.4699, -0.3763, "Europe/Madrid", 15],
  ["sevilla", "Sevilla", "Spain", 37.3891, -5.9845, "Europe/Madrid", 7], ["malaga", "Málaga", "Spain", 36.7213, -4.4214, "Europe/Madrid", 11], ["cadiz", "Cádiz", "Spain", 36.5271, -6.2886, "Europe/Madrid", 11],
  ["jerez", "Jerez de la Frontera", "Spain", 36.685, -6.1261, "Europe/Madrid", 56], ["algeciras", "Algeciras", "Spain", 36.1408, -5.4562, "Europe/Madrid", 20], ["tarifa", "Tarifa", "Spain", 36.0143, -5.6044, "Europe/Madrid", 10],
  ["cordoba", "Córdoba", "Spain", 37.8882, -4.7794, "Europe/Madrid", 106], ["granada", "Granada", "Spain", 37.1773, -3.5986, "Europe/Madrid", 738], ["almeria", "Almería", "Spain", 36.834, -2.4637, "Europe/Madrid", 16],
  ["huelva", "Huelva", "Spain", 37.2614, -6.9447, "Europe/Madrid", 24], ["murcia", "Murcia", "Spain", 37.9922, -1.1307, "Europe/Madrid", 43], ["alicante", "Alicante", "Spain", 38.3452, -0.481, "Europe/Madrid", 3],
  ["palma", "Palma", "Spain", 39.5696, 2.6502, "Europe/Madrid", 13], ["bilbao", "Bilbao", "Spain", 43.263, -2.935, "Europe/Madrid", 19], ["zaragoza", "Zaragoza", "Spain", 41.6488, -0.8891, "Europe/Madrid", 199],
  ["valladolid", "Valladolid", "Spain", 41.6523, -4.7245, "Europe/Madrid", 698], ["burgos", "Burgos", "Spain", 42.3439, -3.6969, "Europe/Madrid", 856], ["leon", "León", "Spain", 42.5987, -5.5671, "Europe/Madrid", 837],
  ["oviedo", "Oviedo", "Spain", 43.3614, -5.8494, "Europe/Madrid", 232], ["a-coruna", "A Coruña", "Spain", 43.3623, -8.4115, "Europe/Madrid", 21], ["salamanca", "Salamanca", "Spain", 40.9701, -5.6635, "Europe/Madrid", 802],
  ["las-palmas", "Las Palmas de Gran Canaria", "Spain", 28.1235, -15.4363, "Atlantic/Canary", 8], ["ceuta", "Ceuta", "Spain", 35.8894, -5.3198, "Africa/Ceuta", 10], ["melilla", "Melilla", "Spain", 35.2923, -2.9381, "Africa/Ceuta", 30],
  ["gibraltar", "Gibraltar", "Gibraltar", 36.1408, -5.3536, "Europe/Gibraltar", 10],
  // Portugal
  ["lisboa", "Lisboa", "Portugal", 38.7223, -9.1393, "Europe/Lisbon", 50], ["porto", "Porto", "Portugal", 41.1579, -8.6291, "Europe/Lisbon", 100], ["faro", "Faro", "Portugal", 37.0194, -7.9322, "Europe/Lisbon", 10],
  // Morocco
  ["tanger", "Tanger", "Morocco", 35.7595, -5.834, "Africa/Casablanca", 80], ["tetouan", "Tétouan", "Morocco", 35.5785, -5.3684, "Africa/Casablanca", 90], ["rabat", "Rabat", "Morocco", 34.0209, -6.8416, "Africa/Casablanca", 75],
  ["casablanca", "Casablanca", "Morocco", 33.5731, -7.5898, "Africa/Casablanca", 27], ["fes", "Fès", "Morocco", 34.0181, -5.0078, "Africa/Casablanca", 400], ["marrakech", "Marrakech", "Morocco", 31.6295, -7.9811, "Africa/Casablanca", 466],
  ["al-hoceima", "Al Hoceïma", "Morocco", 35.2517, -3.9372, "Africa/Casablanca", 50], ["oujda", "Oujda", "Morocco", 34.6814, -1.9086, "Africa/Casablanca", 470],
  // Algeria, Tunisia, Libya
  ["alger", "Alger", "Algeria", 36.7538, 3.0588, "Africa/Algiers", 50], ["oran", "Oran", "Algeria", 35.6971, -0.6308, "Africa/Algiers", 100], ["constantine", "Constantine", "Algeria", 36.365, 6.6147, "Africa/Algiers", 640],
  ["tunis", "Tunis", "Tunisia", 36.8065, 10.1815, "Africa/Tunis", 10], ["sousse", "Sousse", "Tunisia", 35.8256, 10.636, "Africa/Tunis", 10], ["sfax", "Sfax", "Tunisia", 34.7406, 10.7603, "Africa/Tunis", 10],
  ["tripoli", "Tripoli", "Libya", 32.8872, 13.1913, "Africa/Tripoli", 30], ["benghazi", "Benghazi", "Libya", 32.1167, 20.0667, "Africa/Tripoli", 10],
  // Egypt
  ["cairo", "Cairo", "Egypt", 30.0444, 31.2357, "Africa/Cairo", 23], ["alexandria", "Alexandria", "Egypt", 31.2001, 29.9187, "Africa/Cairo", 5], ["luxor", "Luxor", "Egypt", 25.6872, 32.6396, "Africa/Cairo", 76],
  ["aswan", "Aswan", "Egypt", 24.0889, 32.8998, "Africa/Cairo", 194], ["hurghada", "Hurghada", "Egypt", 27.2579, 33.8116, "Africa/Cairo", 10], ["sohag", "Sohag", "Egypt", 26.5591, 31.6957, "Africa/Cairo", 70],
  // Arabia, Horn of Africa
  ["jeddah", "Jeddah", "Saudi Arabia", 21.4858, 39.1925, "Asia/Riyadh", 12], ["mecca", "Mecca", "Saudi Arabia", 21.3891, 39.8579, "Asia/Riyadh", 277], ["medina", "Medina", "Saudi Arabia", 24.5247, 39.5692, "Asia/Riyadh", 608],
  ["riyadh", "Riyadh", "Saudi Arabia", 24.7136, 46.6753, "Asia/Riyadh", 612], ["sanaa", "Sanaa", "Yemen", 15.3694, 44.191, "Asia/Aden", 2250], ["aden", "Aden", "Yemen", 12.7855, 45.0187, "Asia/Aden", 6],
  ["djibouti", "Djibouti", "Djibouti", 11.8251, 42.5903, "Africa/Djibouti", 14], ["mogadishu", "Mogadishu", "Somalia", 2.0469, 45.3182, "Africa/Mogadishu", 9],
  // Europe (partial)
  ["paris", "Paris", "France", 48.8566, 2.3522, "Europe/Paris", 35], ["lyon", "Lyon", "France", 45.764, 4.8357, "Europe/Paris", 173], ["marseille", "Marseille", "France", 43.2965, 5.3698, "Europe/Paris", 12],
  ["toulouse", "Toulouse", "France", 43.6047, 1.4442, "Europe/Paris", 146], ["bordeaux", "Bordeaux", "France", 44.8378, -0.5792, "Europe/Paris", 6], ["nice", "Nice", "France", 43.7102, 7.262, "Europe/Paris", 10],
  ["london", "London", "United Kingdom", 51.5074, -0.1278, "Europe/London", 11], ["dublin", "Dublin", "Ireland", 53.3498, -6.2603, "Europe/Dublin", 20], ["reykjavik", "Reykjavík", "Iceland", 64.1466, -21.9426, "Atlantic/Reykjavik", 20],
  ["berlin", "Berlin", "Germany", 52.52, 13.405, "Europe/Berlin", 34], ["munich", "München", "Germany", 48.1351, 11.582, "Europe/Berlin", 519], ["frankfurt", "Frankfurt", "Germany", 50.1109, 8.6821, "Europe/Berlin", 112],
  ["vienna", "Wien", "Austria", 48.2082, 16.3738, "Europe/Vienna", 190], ["zurich", "Zürich", "Switzerland", 47.3769, 8.5417, "Europe/Zurich", 408], ["amsterdam", "Amsterdam", "Netherlands", 52.3676, 4.9041, "Europe/Amsterdam", 0],
  ["brussels", "Bruxelles", "Belgium", 50.8503, 4.3517, "Europe/Brussels", 13], ["rome", "Roma", "Italy", 41.9028, 12.4964, "Europe/Rome", 21], ["milan", "Milano", "Italy", 45.4642, 9.19, "Europe/Rome", 120],
  ["naples", "Napoli", "Italy", 40.8518, 14.2681, "Europe/Rome", 17], ["palermo", "Palermo", "Italy", 38.1157, 13.3615, "Europe/Rome", 14], ["catania", "Catania", "Italy", 37.5079, 15.083, "Europe/Rome", 7],
  ["athens", "Athína", "Greece", 37.9838, 23.7275, "Europe/Athens", 70], ["istanbul", "İstanbul", "Türkiye", 41.0082, 28.9784, "Europe/Istanbul", 40], ["jerusalem", "Jerusalem", "Israel", 31.7683, 35.2137, "Asia/Jerusalem", 754],
  ["amman", "Amman", "Jordan", 31.9539, 35.9106, "Asia/Amman", 800], ["dubai", "Dubai", "UAE", 25.2048, 55.2708, "Asia/Dubai", 5],
  // Americas, Asia, Oceania
  ["new-york", "New York", "United States", 40.7128, -74.006, "America/New_York", 10], ["los-angeles", "Los Angeles", "United States", 34.0522, -118.2437, "America/Los_Angeles", 90],
  ["mexico-city", "Ciudad de México", "Mexico", 19.4326, -99.1332, "America/Mexico_City", 2240], ["buenos-aires", "Buenos Aires", "Argentina", -34.6037, -58.3816, "America/Argentina/Buenos_Aires", 25],
  ["delhi", "New Delhi", "India", 28.6139, 77.209, "Asia/Kolkata", 216], ["kathmandu", "Kathmandu", "Nepal", 27.7172, 85.324, "Asia/Kathmandu", 1400],
  ["sydney", "Sydney", "Australia", -33.8688, 151.2093, "Australia/Sydney", 30], ["perth", "Perth", "Australia", -31.9505, 115.8605, "Australia/Perth", 30], ["auckland", "Auckland", "New Zealand", -36.8485, 174.7633, "Pacific/Auckland", 30],
].map(([slug, name, country, lat, lon, tz, h]) => ({ slug, name, country, lat, lon, tz, h } as EclipseCity));

export type SolarKind = "total" | "annular" | "partial" | "hybrid";

export interface GlobalSolar { date: string; kind: SolarKind; peak: Date; lat?: number; lon?: number; }
export interface GlobalLunar { date: string; kind: "penumbral" | "partial" | "total"; peak: Date; sdTotalMin: number; sdPartialMin: number; }

const SOLAR_MEMO = new Map<string, GlobalSolar[]>();
export function solarEclipsesBetween(fromYear: number, toYear: number): GlobalSolar[] {
  const key = `${fromYear}-${toYear}`;
  const hit = SOLAR_MEMO.get(key);
  if (hit) return hit;
  const out: GlobalSolar[] = [];
  let e = A.SearchGlobalSolarEclipse(A.MakeTime(new Date(Date.UTC(fromYear, 0, 1))));
  while (e.peak.date.getUTCFullYear() <= toYear) {
    out.push({ date: e.peak.date.toISOString().slice(0, 10), kind: e.kind as SolarKind, peak: e.peak.date, lat: e.latitude, lon: e.longitude });
    e = A.NextGlobalSolarEclipse(e.peak);
  }
  SOLAR_MEMO.set(key, out);
  return out;
}

export function lunarEclipsesBetween(fromYear: number, toYear: number): GlobalLunar[] {
  const out: GlobalLunar[] = [];
  let e = A.SearchLunarEclipse(A.MakeTime(new Date(Date.UTC(fromYear, 0, 1))));
  while (e.peak.date.getUTCFullYear() <= toYear) {
    out.push({ date: e.peak.date.toISOString().slice(0, 10), kind: e.kind as GlobalLunar["kind"], peak: e.peak.date, sdTotalMin: e.sd_total, sdPartialMin: e.sd_partial });
    e = A.NextLunarEclipse(e.peak);
  }
  return out;
}

export interface LocalSolar {
  city: EclipseCity;
  kind: SolarKind | "none";
  start?: Date; end?: Date; peak?: Date; totalStart?: Date; totalEnd?: Date;
  obscuration: number;         // 0..1 at peak
  peakAltitude: number;        // sun altitude at peak, degrees
  visible: boolean;            // some part of the eclipse happens with the sun above the horizon
  totalitySeconds: number;
}

const MEMO = new Map<string, LocalSolar>();
/** Local circumstances (memoized per eclipse and city: the result never changes). */
export function localSolar(globalPeak: Date, city: EclipseCity): LocalSolar {
  const k = `${globalPeak.toISOString().slice(0, 13)}|${city.slug}`;
  const hit = MEMO.get(k);
  if (hit) return hit;
  const r = computeLocalSolar(globalPeak, city);
  if (MEMO.size > 5000) MEMO.clear();
  MEMO.set(k, r);
  return r;
}

function computeLocalSolar(globalPeak: Date, city: EclipseCity): LocalSolar {
  const obs = new A.Observer(city.lat, city.lon, city.h ?? 0);
  const e = A.SearchLocalSolarEclipse(A.MakeTime(new Date(globalPeak.getTime() - 86_400_000)), obs);
  if (Math.abs(e.peak.time.date.getTime() - globalPeak.getTime()) > 86_400_000) {
    return { city, kind: "none", obscuration: 0, peakAltitude: -90, visible: false, totalitySeconds: 0 };
  }
  const alts = [e.partial_begin.altitude, e.peak.altitude, e.partial_end.altitude];
  const totalitySeconds = e.total_begin && e.total_end ? Math.round((e.total_end.time.ut - e.total_begin.time.ut) * 86400) : 0;
  const kind: SolarKind = e.kind === A.EclipseKind.Total ? "total" : e.kind === A.EclipseKind.Annular ? "annular" : "partial";
  return {
    city, kind,
    start: e.partial_begin.time.date, end: e.partial_end.time.date, peak: e.peak.time.date,
    totalStart: e.total_begin?.time.date, totalEnd: e.total_end?.time.date,
    obscuration: e.obscuration, peakAltitude: e.peak.altitude,
    visible: alts.some((a) => a > 0),
    totalitySeconds,
  };
}
