import * as Astronomy from "npm:astronomy-engine@2.1.19";

const TITHI_NAMES = [
  ["Pratipada","प्रतिपदा"],["Dwitiya","द्वितीया"],["Tritiya","तृतीया"],["Chaturthi","चतुर्थी"],
  ["Panchami","पञ्चमी"],["Shashthi","षष्ठी"],["Saptami","सप्तमी"],["Ashtami","अष्टमी"],
  ["Navami","नवमी"],["Dashami","दशमी"],["Ekadashi","एकादशी"],["Dwadashi","द्वादशी"],
  ["Trayodashi","त्रयोदशी"],["Chaturdashi","चतुर्दशी"],["Purnima","पूर्णिमा"],
  ["Pratipada","प्रतिपदा"],["Dwitiya","द्वितीया"],["Tritiya","तृतीया"],["Chaturthi","चतुर्थी"],
  ["Panchami","पञ्चमी"],["Shashthi","षष्ठी"],["Saptami","सप्तमी"],["Ashtami","अष्टमी"],
  ["Navami","नवमी"],["Dashami","दशमी"],["Ekadashi","एकादशी"],["Dwadashi","द्वादशी"],
  ["Trayodashi","त्रयोदशी"],["Chaturdashi","चतुर्दशी"],["Amavasya","औंसी"]
];

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function norm360(value: number) {
  const n = value % 360;
  return n < 0 ? n + 360 : n;
}

function addDate(iso: string, days: number) {
  const [y,m,d] = iso.split("-").map(Number);
  const x = new Date(Date.UTC(y,m-1,d));
  x.setUTCDate(x.getUTCDate() + days);
  return x.getUTCFullYear() + "-" + String(x.getUTCMonth()+1).padStart(2,"0") + "-" + String(x.getUTCDate()).padStart(2,"0");
}

function nptNoon(iso: string) {
  const [y,m,d] = iso.split("-").map(Number);
  if (![y,m,d].every(Number.isFinite)) throw new Error("invalid_date");
  // Nepal Standard Time is UTC+05:45, so 12:00 local is 06:15 UTC.
  return new Date(Date.UTC(y,m-1,d,6,15,0));
}

function phaseAt(date: Date) {
  const sun = norm360(Astronomy.SunPosition(date).elon);
  const moon = norm360(Astronomy.EclipticGeoMoon(date).lon);
  const delta = norm360(moon - sun);
  const tithiIndex = Math.floor(delta / 12) + 1;
  const progress = ((delta % 12) / 12) * 100;
  const illumination = ((1 - Math.cos(delta * DEG)) / 2) * 100;
  return {
    sun_longitude_deg: sun,
    moon_longitude_deg: moon,
    phase_angle_deg: delta,
    tithi_index: tithiIndex,
    tithi_progress_percent: progress,
    illumination_percent: illumination,
    paksha: tithiIndex <= 15 ? "Shukla Paksha" : "Krishna Paksha",
    tithi_name: TITHI_NAMES[tithiIndex - 1][0],
    tithi_name_ne: TITHI_NAMES[tithiIndex - 1][1]
  };
}

function nextTithiTransition(from: Date, currentIndex: number) {
  let lo = from.getTime();
  let hi = lo + 2 * 3600000;
  const max = lo + 32 * 3600000;
  while (hi <= max && phaseAt(new Date(hi)).tithi_index === currentIndex) hi += 2 * 3600000;
  if (hi > max) return null;
  let left = Math.max(lo, hi - 2 * 3600000), right = hi;
  for (let i = 0; i < 28; i++) {
    const mid = Math.floor((left + right) / 2);
    if (phaseAt(new Date(mid)).tithi_index === currentIndex) left = mid;
    else right = mid;
  }
  return new Date(right);
}

function dayOfYear(y: number, m: number, d: number) {
  const start = Date.UTC(y,0,0);
  const now = Date.UTC(y,m-1,d);
  return Math.floor((now - start) / 86400000);
}

// NOAA-style sunrise approximation (zenith 90.833°). Used only for Kshaya/Adhika
// sunrise-day classification; Sun/Moon longitudes themselves use Astronomy Engine.
function sunriseUtc(iso: string, lat: number, lng: number): Date | null {
  const [y,m,d] = iso.split("-").map(Number);
  const N = dayOfYear(y,m,d);
  const lngHour = lng / 15;
  const t = N + ((6 - lngHour) / 24);
  const M = (0.9856 * t) - 3.289;
  let L = M + 1.916 * Math.sin(M * DEG) + 0.020 * Math.sin(2 * M * DEG) + 282.634;
  L = norm360(L);
  let RA = RAD * Math.atan(0.91764 * Math.tan(L * DEG));
  RA = norm360(RA);
  const Lquadrant = Math.floor(L / 90) * 90;
  const RAquadrant = Math.floor(RA / 90) * 90;
  RA = (RA + Lquadrant - RAquadrant) / 15;
  const sinDec = 0.39782 * Math.sin(L * DEG);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(90.833 * DEG) - sinDec * Math.sin(lat * DEG)) /
    (cosDec * Math.cos(lat * DEG));
  if (cosH > 1 || cosH < -1) return null;
  const H = (360 - RAD * Math.acos(cosH)) / 15;
  const localMean = H + RA - 0.06571 * t - 6.622;
  let UT = localMean - lngHour;
  UT = ((UT % 24) + 24) % 24;
  return new Date(Date.UTC(y,m-1,d) + UT * 3600000);
}

function advance(a: number, b: number) {
  return (b - a + 30) % 30;
}

function skippedBetween(a: number, b: number) {
  const n = advance(a,b);
  const out: number[] = [];
  for (let i = 1; i < n; i++) out.push(((a - 1 + i) % 30) + 1);
  return out;
}

export interface TithiInput {
  date: string;
  lat?: number;
  lng?: number;
  bsFormatted?: string | null;
  nsFormatted?: string | null;
}

export function calculateAstronomicalTithi(input: TithiInput) {
  const lat = Number.isFinite(input.lat) ? Number(input.lat) : 27.7172;
  const lng = Number.isFinite(input.lng) ? Number(input.lng) : 85.3240;
  if (lat < -90 || lat > 90) throw new Error("invalid_latitude");
  if (lng < -180 || lng > 180) throw new Error("invalid_longitude");

  // A date-only Panchanga query is canonically anchored at local sunrise.
  // This keeps the computed daily Tithi consistent with the civil calendar
  // assignment used by the existing Patro archive. NPT noon is only a
  // polar/astronomical fallback if sunrise cannot be resolved.
  const srNow = sunriseUtc(input.date, lat, lng);
  const at = srNow ?? nptNoon(input.date);
  const phase = phaseAt(at);
  const next = nextTithiTransition(at, phase.tithi_index);
  const prevDate = addDate(input.date, -1);
  const nextDate = addDate(input.date, 1);
  const srPrev = sunriseUtc(prevDate, lat, lng);
  const srNext = sunriseUtc(nextDate, lat, lng);

  let anomaly: any = {
    adhika_tithi: false,
    kshaya_tithi: false,
    skipped_tithi_indices: [],
    method: "sunrise-to-sunrise classification"
  };

  if (srPrev && srNow && srNext) {
    const p = phaseAt(srPrev).tithi_index;
    const n = phaseAt(srNow).tithi_index;
    const x = phaseAt(srNext).tithi_index;
    const incoming = advance(p,n);
    const outgoing = advance(n,x);
    const skipped = Array.from(new Set([...skippedBetween(p,n), ...skippedBetween(n,x)]));
    anomaly = {
      adhika_tithi: incoming === 0 || outgoing === 0,
      kshaya_tithi: incoming > 1 || outgoing > 1,
      skipped_tithi_indices: skipped,
      sunrise_tithi: { previous: p, current: n, next: x },
      sunrise_utc: { previous: srPrev.toISOString(), current: srNow.toISOString(), next: srNext.toISOString() },
      method: "sunrise-to-sunrise classification using NOAA-style sunrise approximation"
    };
  }

  return {
    date: input.date,
    evaluated_at_utc: at.toISOString(),
    location: { lat, lng, reference_timezone: "Asia/Kathmandu" },
    ...phase,
    next_tithi_at_utc: next?.toISOString() ?? null,
    time_to_next_tithi_minutes: next ? Math.max(0, Math.round((next.getTime() - at.getTime()) / 60000)) : null,
    calendar_anomaly: anomaly,
    bs_formatted: input.bsFormatted ?? null,
    ns_formatted: input.nsFormatted ?? null,
    methodology: {
      longitude_engine: "Astronomy Engine 2.1.19 geocentric ecliptic longitudes",
      illumination_model: "I=(1-cos(Δθ))/2",
      date_anchor: srNow ? "local sunrise (NOAA-style approximation)" : "12:00 Asia/Kathmandu fallback",
      precision_note: "Astronomy Engine uses analytic planetary/lunar models and is not a NASA JPL DE binary ephemeris. It is appropriate for interactive calendar computation; near-boundary ceremonial times should be cross-validated against an authoritative Panchanga or JPL-DE-based ephemeris."
    }
  };
}
