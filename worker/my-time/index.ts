import * as Astronomy from "astronomy-engine";
import { placeTiming } from "../../src/place/timing";
import { panchangAt } from "../../src/patro-tools/core/astro";
import { KARANA_NAMES, NAKSHATRAS, RASHIS, YOGAS, tithiName } from "../../src/patro-tools/core/names";

const DEG = Math.PI / 180;
const TITHI_NAMES = [
  ["Pratipada","प्रतिपदा"],["Dwitiya","द्वितीया"],["Tritiya","तृतीया"],["Chaturthi","चतुर्थी"],
  ["Panchami","पञ्चमी"],["Shashthi","षष्ठी"],["Saptami","सप्तमी"],["Ashtami","अष्टमी"],
  ["Navami","नवमी"],["Dashami","दशमी"],["Ekadashi","एकादशी"],["Dwadashi","द्वादशी"],
  ["Trayodashi","त्रयोदशी"],["Chaturdashi","चतुर्दशी"],["Purnima","पूर्णिमा"],
  ["Pratipada","प्रतिपदा"],["Dwitiya","द्वितीया"],["Tritiya","तृतीया"],["Chaturthi","चतुर्थी"],
  ["Panchami","पञ्चमी"],["Shashthi","षष्ठी"],["Saptami","सप्तमी"],["Ashtami","अष्टमी"],
  ["Navami","नवमी"],["Dashami","दशमी"],["Ekadashi","एकादशी"],["Dwadashi","द्वादशी"],
  ["Trayodashi","त्रयोदशी"],["Chaturdashi","चतुर्दशी"],["Amavasya","औंसी"]
] as const;

export interface MyTimeInput {
  date?: string;
  timezone?: string;
  lat?: number;
  lng?: number;
}

export function normalizeLongitude(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function localDateInTimezone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Convert a timezone's local wall-clock time to UTC without hard-coding Nepal's +05:45 offset. */
export function localDateTimeToUtc(date: string, timezone: string, hour = 12): Date {
  if (!isValidDate(date)) throw new Error("invalid_date");
  // Intl validates IANA timezone identifiers and applies historical/DST offset rules.
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date()); }
  catch { throw new Error("invalid_timezone"); }

  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, 0, 0);
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  });

  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    const correction = target - represented;
    guess += correction;
    if (correction === 0) break;
  }
  return new Date(guess);
}

export function calculateMyTimeSnapshot(input: MyTimeInput, now = new Date()) {
  const timezone = input.timezone || "Asia/Kathmandu";
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(now); }
  catch { throw new Error("invalid_timezone"); }

  const date = input.date || localDateInTimezone(now, timezone);
  if (!isValidDate(date)) throw new Error("invalid_date");
  const lat = input.lat ?? 27.7172;
  const lng = input.lng ?? 85.3240;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("invalid_latitude");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("invalid_longitude");

  // Reuse AafnaiPatro's existing location-aware Panchang provider first. It uses civilBounds,
  // shared Lahiri/sidereal conventions, Astronomy Engine and explicit polar-day failure behavior.
  // If sunrise is unavailable, keep the page useful with an explicitly marked local-noon snapshot.
  const evaluatedAt = localDateTimeToUtc(date, timezone, 12);
  const location = { lat, lon: lng, tz: timezone, height: 0, name: "My Time" };
  let daily: ReturnType<typeof placeTiming> | null = null;
  try { daily = placeTiming(date, location); } catch { daily = null; }
  const panchang = daily || panchangAt(evaluatedAt);
  const sunLongitude = normalizeLongitude(Astronomy.SunPosition(evaluatedAt).elon);
  const moonLongitude = normalizeLongitude(Astronomy.EclipticGeoMoon(evaluatedAt).lon);
  const phaseAngle = normalizeLongitude(panchang.moonPhaseAngle);
  const tithiIndex = panchang.tithi;
  const tithiProgress = ((phaseAngle % 12) / 12) * 100;
  const illumination = ((1 - Math.cos(phaseAngle * DEG)) / 2) * 100;
  const observer = new Astronomy.Observer(lat, lng, 0);
  const sunEquator = Astronomy.Equator(Astronomy.Body.Sun, evaluatedAt, observer, true, true);
  const solarAltitude = Astronomy.Horizon(evaluatedAt, observer, sunEquator.ra, sunEquator.dec, "normal").altitude;
  const timeAnchor = daily ? "local sunrise (shared AafnaiPatro Panchang provider)" : "local noon fallback (sunrise/sunset unavailable)";

  return {
    schema_version: 1,
    date,
    timezone,
    evaluated_at_utc: evaluatedAt.toISOString(),
    location: { lat, lng },
    panchang: {
      tithi_index: tithiIndex,
      tithi_name: ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima","Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya"][tithiIndex - 1],
      tithi_name_ne: tithiName(tithiIndex),
      paksha: panchang.paksha === "shukla" ? "Shukla Paksha" : "Krishna Paksha",
      phase_angle_deg: phaseAngle,
      tithi_progress_percent: tithiProgress,
      nakshatra_index: panchang.nakshatra + 1,
      nakshatra_name_ne: NAKSHATRAS[panchang.nakshatra],
      nakshatra_pada: panchang.nakshatraPada,
      yoga_index: panchang.yoga + 1,
      yoga_name_ne: YOGAS[panchang.yoga],
      karana_index: panchang.karana,
      karana_name_ne: KARANA_NAMES[panchang.karana],
      moon_rashi_ne: RASHIS[panchang.moonRashi],
      sun_rashi_ne: RASHIS[panchang.sunRashi],
      sunrise_utc: daily?.sunrise.toISOString() ?? null,
      sunset_utc: daily?.sunset.toISOString() ?? null,
      moonrise_utc: daily?.moonrise?.toISOString() ?? null,
      tithi_end_utc: daily?.tithiEnds?.toISOString() ?? null
    },
    sky: {
      sun_longitude_tropical_deg: sunLongitude,
      moon_longitude_tropical_deg: moonLongitude,
      sun_longitude_sidereal_deg: panchang.sunSidereal,
      moon_longitude_sidereal_deg: panchang.moonSidereal,
      solar_altitude_deg_at_evaluation: solarAltitude,
      moon_illumination_percent: illumination
    },
    methodology: {
      engine: "AafnaiPatro shared Panchang provider + astronomy-engine",
      time_anchor: timeAnchor,
      sidereal_positions: true,
      limitations: [
        "The shared Panchang provider calculates Tithi, Nakshatra/Pada, Yoga, Karana, sidereal Sun/Moon signs and local sunrise/sunset where available.",
        "If sunrise or sunset is unavailable for the selected civil day, the Panchang snapshot falls back to local noon and solar event fields are null.",
        "Choghadiya, Rahu Kaal, Hora, twilight, eclipse contacts, Tarabalam/Chandrabalam, and personalized Muhurta are not included in this API slice.",
        "Moon illumination is a simplified phase-angle estimate, not a high-precision illuminated fraction."
      ]
    }
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-content-type-options": "nosniff"
    }
  });
}

/** Scoped handler imported by the existing main Worker; it is not a separate Worker entry point. */
export async function myTimeResponse(request: Request, env: Record<string, unknown> = {}): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/v1/mytime/today") return null;
  if (env.MY_TIME_ENABLED !== true && env.MY_TIME_ENABLED !== "true") return json({ ok: false, error: "feature_disabled" }, 404);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  const numberParam = (key: string): number | undefined => {
    const raw = url.searchParams.get(key);
    if (raw === null || raw.trim() === "") return undefined;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`invalid_${key}`);
    return value;
  };

  try {
    const snapshot = calculateMyTimeSnapshot({
      date: url.searchParams.get("date") || undefined,
      timezone: url.searchParams.get("timezone") || undefined,
      lat: numberParam("lat"),
      lng: numberParam("lng")
    });
    return request.method === "HEAD" ? new Response(null, { headers: { "cache-control": "public, max-age=60, s-maxage=300" } }) : json({ ok: true, data: snapshot });
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_request";
    const allowed = new Set(["invalid_date", "invalid_timezone", "invalid_latitude", "invalid_longitude", "invalid_lat", "invalid_lng"]);
    return json({ ok: false, error: allowed.has(code) ? code : "invalid_request" }, 400);
  }
}
