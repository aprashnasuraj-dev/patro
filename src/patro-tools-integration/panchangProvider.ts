import { createPanchangProvider } from "@/patro-tools/core/provider";
import { lunarMonthAt, monthInSystem, panchangAt, zonedMidnight } from "@/patro-tools/core/astro";
import { KATHMANDU, type DayPanchang, type GeoLocation } from "@/patro-tools/core/types";

type ProductionDay = {
  weekday: { number: number };
  panchang: {
    tithi: { number: number; paksha: "Shukla" | "Krishna" };
    tithi_transition?: { time?: string | null };
    nakshatra?: { number?: number; pada?: number };
    yoga?: { en?: string; ne?: string };
    karana?: { en?: string; ne?: string };
    sunrise?: string | null;
    sunset?: string | null;
  };
};

const cache = new Map<string, DayPanchang>();

function timeOnDate(date: string, hhmm: string | null | undefined, loc: GeoLocation) {
  const [h, m] = String(hhmm || "00:00").split(":").map(Number);
  return new Date(zonedMidnight(date, loc.tz).getTime() + (h * 60 + m) * 60_000);
}

function fromProduction(date: string, loc: GeoLocation, raw: ProductionDay): DayPanchang {
  const sunrise = timeOnDate(date, raw.panchang.sunrise, loc);
  const sunset = timeOnDate(date, raw.panchang.sunset, loc);
  const base = panchangAt(sunrise);
  const tithi = raw.panchang.tithi.number;
  const paksha = raw.panchang.tithi.paksha === "Shukla" ? "shukla" : "krishna";
  const lm = lunarMonthAt(sunrise);
  const transition = raw.panchang.tithi_transition?.time;
  let tithiEnds = transition ? timeOnDate(date, transition, loc) : base.instant;
  if (tithiEnds <= sunrise) tithiEnds = new Date(tithiEnds.getTime() + 86_400_000);
  return {
    ...base,
    date,
    weekday: raw.weekday.number,
    sunrise,
    sunset,
    tithi,
    paksha,
    tithiInPaksha: paksha === "shukla" ? tithi : tithi - 15,
    nakshatra: Math.max(0, (raw.panchang.nakshatra?.number ?? base.nakshatra + 1) - 1),
    nakshatraPada: raw.panchang.nakshatra?.pada ?? base.nakshatraPada,
    lunarMonth: lm,
    monthIndex: monthInSystem(lm.amantaIndex, paksha, "purnimanta"),
    tithiEnds,
  };
}

export async function primeProductionPanchang(date: string, loc: GeoLocation = KATHMANDU) {
  // The production archive is Kathmandu-based. Outside Kathmandu the kit fallback is intentional.
  if (Math.abs(loc.lat - KATHMANDU.lat) > 0.02 || Math.abs(loc.lon - KATHMANDU.lon) > 0.02) return;
  const key = `${date}|${loc.lat.toFixed(3)}|${loc.lon.toFixed(3)}`;
  if (cache.has(key)) return;
  const response = await fetch(`/api/date?ad=${encodeURIComponent(date)}`, { headers: { Accept: "application/json" } });
  if (!response.ok) return;
  const raw = await response.json() as ProductionDay;
  cache.set(key, fromProduction(date, loc, raw));
}

export const panchangProvider = createPanchangProvider({
  defaultLocation: KATHMANDU,
  primary(date, loc) {
    return cache.get(`${date}|${loc.lat.toFixed(3)}|${loc.lon.toFixed(3)}`);
  },
});
