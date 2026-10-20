import { NAKSHATRAS as NE_NAKSHATRAS, RASHIS as NE_SIGNS } from "../patro-tools/core/names";
import type { ChartResult } from "./jyotishEngine";

export const JANMAPATRO_CONTEXT_STORAGE_KEY = "aafnai.jyotish.china.context.v1";

/** Shared curated places: common birthplaces can fill coordinates without manual GPS entry. */
export const JANMAPATRO_BIRTH_PLACES = [
  ["Kathmandu", 27.7172, 85.3240], ["Lalitpur", 27.6644, 85.3188], ["Bhaktapur", 27.6710, 85.4298],
  ["Pokhara", 28.2096, 83.9856], ["Biratnagar", 26.4525, 87.2718], ["Janakpur", 26.7288, 85.9250],
  ["Birgunj", 27.0104, 84.8774], ["Chitwan", 27.5291, 84.3542], ["Butwal", 27.7006, 83.4484],
  ["Nepalgunj", 28.0500, 81.6167], ["Dhangadhi", 28.7017, 80.5898], ["Charikot", 27.6667, 86.0333],
  ["Manthali", 27.3833, 86.0667], ["Chautara", 27.7744, 85.7120], ["Melamchi", 27.8294, 85.5775],
  ["Tokyo, Japan", 35.6762, 139.6503], ["Osaka, Japan", 34.6937, 135.5023], ["Yokohama, Japan", 35.4437, 139.6380],
  ["Delhi, India", 28.6139, 77.2090], ["Mumbai, India", 19.0760, 72.8777], ["Dhaka, Bangladesh", 23.8103, 90.4125],
  ["Bangkok, Thailand", 13.7563, 100.5018], ["Dubai, UAE", 25.2048, 55.2708],
  ["London, United Kingdom", 51.5072, -0.1276], ["New York, USA", 40.7128, -74.0060],
  ["Los Angeles, USA", 34.0522, -118.2437], ["Seoul, South Korea", 37.5665, 126.9780],
  ["Sydney, Australia", -33.8688, 151.2093]
] as const;

export function findJanmaPatroBirthPlace(value: string) {
  const wanted = value.trim().normalize("NFKC").toLowerCase();
  if (!wanted) return null;
  const place = JANMAPATRO_BIRTH_PLACES.find(([name]) => name.normalize("NFKC").toLowerCase() === wanted);
  return place ? { name: place[0], lat: place[1], lng: place[2] } : null;
}

/** Canonical local context shape shared by Janmapatro and My Time. */
export function createJanmaPatroContext(chart: ChartResult) {
  const moon = chart.planets.find(planet => planet.key === "moon");
  if (!moon) throw new Error("Moon position is unavailable in the birth chart.");
  return {
    time_known: true,
    lagna: { name: NE_SIGNS[chart.ascSignIndex], degree: chart.ascendant },
    rashi: { name: NE_SIGNS[moon.signIndex] },
    nakshatra: { name: NE_NAKSHATRAS[chart.moonNakshatraIndex], pada: chart.moonPada },
    birth: { ...chart.input },
    planets: chart.planets.map(planet => ({
      planet_en: planet.name, rashi: { name: NE_SIGNS[planet.signIndex] }, house: planet.house, degree: planet.longitude
    })),
    dasha: { periods: chart.dashas.map(period => ({ ...period, start: period.start.toISOString(), end: period.end.toISOString() })) },
    other_important_points: { manglik: chart.manglik },
    data_quality: { source: "janmapatro-engine", methodology: chart.methodology }
  };
}

/** Persist birth context locally only; birth details are never sent to a new service. */
export function saveJanmaPatroContext(context: unknown, storage?: Pick<Storage, "setItem">): boolean {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    if (!target) return false;
    target.setItem(JANMAPATRO_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("patro:china-updated", { detail: context }));
    return true;
  } catch {
    return false;
  }
}
