import { dayPanchang, zonedMidnight } from "@/patro-tools/core/astro";
import { createPanchangProvider } from "@/patro-tools/core/provider";
import { KATHMANDU, type DayPanchang, type GeoLocation, type Paksha } from "@/patro-tools/core/types";

type PatroPanchangPayload = {
  ad?: string;
  date?: string;
  panchang: {
    tithi: { number: number; paksha: string };
    tithi_transition?: { minutes?: number; time?: string | null } | null;
    nakshatra?: { number?: number; pada?: number } | null;
    sunrise?: string | null;
    sunset?: string | null;
    location?: string | null;
  };
};

const cache = new Map<string, PatroPanchangPayload>();

function isKathmanduReference(loc: GeoLocation) {
  return (
    Math.abs(loc.lat - KATHMANDU.lat) < 0.02 &&
    Math.abs(loc.lon - KATHMANDU.lon) < 0.02 &&
    loc.tz === KATHMANDU.tz
  );
}

function localInstant(date: string, hhmm: string | null | undefined, tz: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!match) return undefined;
  const midnight = zonedMidnight(date, tz);
  return new Date(midnight.getTime() + (Number(match[1]) * 60 + Number(match[2])) * 60_000);
}

function asPaksha(value: string): Paksha {
  return value.toLowerCase().startsWith("k") ? "krishna" : "shukla";
}

function primaryDay(date: string, loc: GeoLocation): DayPanchang | undefined {
  if (!isKathmanduReference(loc)) return undefined;
  const live = cache.get(date);
  if (!live) return undefined;

  // D1/archive values are authoritative when present. Astronomy Engine only fills gaps.
  const fallback = dayPanchang(date, loc, "purnimanta");
  const tithi = Number(live.panchang.tithi?.number);
  const paksha = asPaksha(live.panchang.tithi?.paksha || fallback.paksha);
  const sunrise = localInstant(date, live.panchang.sunrise, loc.tz) ?? fallback.sunrise;
  const sunset = localInstant(date, live.panchang.sunset, loc.tz) ?? fallback.sunset;
  const transitionMinutes = live.panchang.tithi_transition?.minutes;
  const tithiEnds = Number.isFinite(transitionMinutes)
    ? new Date(zonedMidnight(date, loc.tz).getTime() + Number(transitionMinutes) * 60_000)
    : fallback.tithiEnds;
  const nakNumber = Number(live.panchang.nakshatra?.number);
  const nakshatra = Number.isInteger(nakNumber) && nakNumber >= 1 && nakNumber <= 27
    ? nakNumber - 1
    : fallback.nakshatra;
  const pada = Number(live.panchang.nakshatra?.pada);
  const safeTithi = Number.isInteger(tithi) && tithi >= 1 && tithi <= 30 ? tithi : fallback.tithi;

  return {
    ...fallback,
    date,
    tithi: safeTithi,
    paksha,
    tithiInPaksha: paksha === "shukla" ? Math.min(safeTithi, 15) : Math.max(1, safeTithi - 15),
    nakshatra,
    nakshatraPada: Number.isInteger(pada) && pada >= 1 && pada <= 4 ? pada : fallback.nakshatraPada,
    sunrise,
    sunset,
    tithiEnds,
  };
}

export const panchangProvider = createPanchangProvider({
  primary: primaryDay,
  defaultLocation: KATHMANDU,
  system: "purnimanta",
});

export async function primePanchang(date: string, signal?: AbortSignal) {
  const response = await fetch("/api/v1/panchang?date=" + encodeURIComponent(date), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Patro panchang unavailable");
  const raw = await response.json() as PatroPanchangPayload;
  const resolvedDate = raw?.ad || raw?.date || date;
  if (resolvedDate !== date || !raw?.panchang?.tithi) throw new Error("Invalid Patro panchang response");
  const payload: PatroPanchangPayload = { ...raw, ad: date, date };
  cache.set(date, payload);
  return panchangProvider.day(date, KATHMANDU);
}

export async function primePanchangRange(from: string, to: string, signal?: AbortSignal) {
  const dates: string[] = [];
  const cursor = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (dates.length > 93) throw new RangeError("Panchang range is limited to 93 days");
  }
  const batchSize = 6;
  for (let i = 0; i < dates.length; i += batchSize) {
    await Promise.all(dates.slice(i, i + batchSize).map((date) => primePanchang(date, signal)));
  }
  return dates.map((date) => panchangProvider.day(date, KATHMANDU));
}

export function clearPanchangAdapterCache() {
  cache.clear();
}
