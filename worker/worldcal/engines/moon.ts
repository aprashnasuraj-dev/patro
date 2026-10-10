/**
 * Traditional moon-calendar engine (gardening and haircut traditions in DE/AT/CH, ES, IT).
 *
 * Two zodiacs, on purpose (see docs/worldcal/RESEARCH.md):
 *  - "sign": tropical 30° signs from the true ecliptic of date — the Paungger/Poppe tradition, used for haircuts.
 *  - "constellation": the IAU constellation the Moon is actually in (unequal widths) — the biodynamic tradition,
 *    used for fruit/root/flower/leaf days. Ophiuchus counts as Scorpio. Equal-30° Lahiri sidereal signs do NOT match
 *    published biodynamic calendars, so the project's Hindu ayanamsa code must not be reused here.
 * Ascending/descending = trend of the Moon's geocentric declination (true equator of date), not the nodes.
 * Validated against published October 2026 calendars (icalendario.net, Gerbeaud, mondinfo.de).
 */
import * as A from "astronomy-engine";
import { zonedTimeToUtc } from "../dates";

export type Element = "fire" | "earth" | "air" | "water";
export type DayType = "fruit" | "root" | "flower" | "leaf";
export const ELEMENT_DAYTYPE: Record<Element, DayType> = { fire: "fruit", earth: "root", air: "flower", water: "leaf" };

export const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;
export type Sign = (typeof SIGNS)[number];
export const SIGN_ELEMENT: Record<Sign, Element> = {
  aries: "fire", taurus: "earth", gemini: "air", cancer: "water", leo: "fire", virgo: "earth",
  libra: "air", scorpio: "water", sagittarius: "fire", capricorn: "earth", aquarius: "air", pisces: "water",
};
const CONSTELLATION_SIGN: Record<string, Sign> = {
  Ari: "aries", Tau: "taurus", Gem: "gemini", Cnc: "cancer", Leo: "leo", Vir: "virgo", Lib: "libra",
  Sco: "scorpio", Oph: "scorpio", Sgr: "sagittarius", Cap: "capricorn", Aqr: "aquarius", Psc: "pisces",
};

const HOUR = 3600_000;

export function tropicalSign(at: Date): Sign {
  const lon = A.EclipticGeoMoon(A.MakeTime(at)).lon;
  return SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];
}

/** Constellation-based sign (biodynamic model). Non-zodiacal constellations (Sextans, Orion, Cetus…) fall back to the ecliptic point at the same longitude. */
export function constellationSign(at: Date): { sign: Sign; symbol: string } {
  const time = A.MakeTime(at);
  const vec = A.GeoMoon(time);
  const eq = A.EquatorFromVector(vec);
  const c = A.Constellation(eq.ra, eq.dec);
  if (CONSTELLATION_SIGN[c.symbol]) return { sign: CONSTELLATION_SIGN[c.symbol], symbol: c.symbol };
  const ecl = A.Ecliptic(vec);
  const onEcliptic = A.RotateVector(A.Rotation_ECL_EQJ(), A.VectorFromSphere(new A.Spherical(0, ecl.elon, 1), time));
  const eq0 = A.EquatorFromVector(onEcliptic);
  const c0 = A.Constellation(eq0.ra, eq0.dec);
  return { sign: CONSTELLATION_SIGN[c0.symbol] || tropicalSign(at), symbol: c.symbol };
}

/** Geocentric declination of the Moon, true equator of date (degrees). */
export function moonDeclination(at: Date): number {
  const time = A.MakeTime(at);
  const eqd = A.RotateVector(A.Rotation_EQJ_EQD(time), A.GeoMoon(time));
  return A.EquatorFromVector(eqd).dec;
}
export const isAscending = (at: Date) => moonDeclination(new Date(at.getTime() + HOUR)) > moonDeclination(new Date(at.getTime() - HOUR));

export type MoonEvent = { kind: "new-moon" | "first-quarter" | "full-moon" | "last-quarter" | "ascending-node" | "descending-node" | "perigee" | "apogee" | "turn-ascending" | "turn-descending"; at: Date; distanceKm?: number };
export type Span<T> = { value: T; from: Date; to: Date };

export type MoonDay = {
  date: string;
  tz: string;
  noon: Date;
  illumination: number; // 0..1 at local noon
  phaseAngle: number; // 0 new, 90 first quarter, 180 full, 270 last quarter
  waxing: boolean;
  ascending: boolean; // at local noon
  signs: Span<Sign>[]; // tropical spans within the local day
  constellations: Span<Sign>[]; // biodynamic spans within the local day
  dayTypes: Span<DayType>[];
  mainDayType: DayType;
  mainSign: Sign; // tropical sign at local noon
  events: MoonEvent[];
  unfavourable: boolean; // node or apsis during the local day
};

function spans<T>(start: Date, end: Date, f: (d: Date) => T): Span<T>[] {
  const out: Span<T>[] = [];
  let cur = f(start);
  let from = start;
  for (let t = start.getTime() + HOUR; ; t += HOUR) {
    const tt = Math.min(t, end.getTime());
    const v = f(new Date(tt));
    if (v !== cur) {
      // bisect the change to the minute
      let lo = tt - HOUR, hi = tt;
      while (hi - lo > 60_000) {
        const mid = Math.floor((lo + hi) / 2);
        if (f(new Date(mid)) === cur) lo = mid; else hi = mid;
      }
      out.push({ value: cur, from, to: new Date(hi) });
      cur = v;
      from = new Date(hi);
    }
    if (tt >= end.getTime()) break;
  }
  out.push({ value: cur, from, to: end });
  return out;
}

function eventsBetween(start: Date, end: Date): MoonEvent[] {
  const out: MoonEvent[] = [];
  const t0 = A.MakeTime(start);
  const quarterKinds = ["new-moon", "first-quarter", "full-moon", "last-quarter"] as const;
  for (let q = A.SearchMoonQuarter(t0); q.time.date < end; q = A.NextMoonQuarter(q)) {
    if (q.time.date >= start) out.push({ kind: quarterKinds[q.quarter], at: q.time.date });
  }
  for (let n = A.SearchMoonNode(t0); n.time.date < end; n = A.NextMoonNode(n)) {
    if (n.time.date >= start) out.push({ kind: n.kind === A.NodeEventKind.Ascending ? "ascending-node" : "descending-node", at: n.time.date });
  }
  for (let a = A.SearchLunarApsis(t0); a.time.date < end; a = A.NextLunarApsis(a)) {
    if (a.time.date >= start) out.push({ kind: a.kind === A.ApsisKind.Pericenter ? "perigee" : "apogee", at: a.time.date, distanceKm: Math.round(a.dist_km) });
  }
  // Declination extrema: sign change of the declination trend inside the day.
  const trend = (d: Date) => isAscending(d);
  for (const s of spans(start, end, trend).slice(1)) out.push({ kind: s.value ? "turn-ascending" : "turn-descending", at: s.from });
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function moonDay(date: string, tz: string): MoonDay {
  const [y, m, d] = date.split("-").map(Number);
  const start = zonedTimeToUtc(y, m, d, 0, 0, tz);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const end = zonedTimeToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, tz);
  const noon = zonedTimeToUtc(y, m, d, 12, 0, tz);
  const phaseAngle = A.MoonPhase(A.MakeTime(noon));
  const illumination = A.Illumination(A.Body.Moon, A.MakeTime(noon)).phase_fraction;
  const signs = spans(start, end, tropicalSign);
  const constellations = spans(start, end, (t) => constellationSign(t).sign);
  const typeSpans: Span<DayType>[] = [];
  for (const c of constellations) {
    const type = ELEMENT_DAYTYPE[SIGN_ELEMENT[c.value]];
    const last = typeSpans[typeSpans.length - 1];
    if (last && last.value === type) last.to = c.to; else typeSpans.push({ value: type, from: c.from, to: c.to });
  }
  const minutes = new Map<DayType, number>();
  for (const s of typeSpans) minutes.set(s.value, (minutes.get(s.value) || 0) + (s.to.getTime() - s.from.getTime()));
  const mainDayType = [...minutes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const events = eventsBetween(start, end);
  return {
    date, tz, noon, illumination, phaseAngle, waxing: phaseAngle < 180, ascending: isAscending(noon),
    signs, constellations, dayTypes: typeSpans, mainDayType, mainSign: tropicalSign(noon), events,
    unfavourable: events.some((e) => e.kind === "ascending-node" || e.kind === "descending-node" || e.kind === "perigee" || e.kind === "apogee"),
  };
}

/**
 * Haircut tradition (German mainstream rule set attributed to Paungger/Poppe; tropical signs):
 * Leo best, Virgo good; avoid Pisces and Cancer. Waxing moon → growth/volume; waning → short cuts that hold their shape.
 */
export type HaircutRating = "best" | "good" | "neutral" | "avoid";
export function haircutRating(day: Pick<MoonDay, "mainSign">): HaircutRating {
  if (day.mainSign === "leo") return "best";
  if (day.mainSign === "virgo") return "good";
  if (day.mainSign === "pisces" || day.mainSign === "cancer") return "avoid";
  return "neutral";
}
