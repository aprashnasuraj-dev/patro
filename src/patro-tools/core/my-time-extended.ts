/** Deterministic supplemental time scales and traditional timing helpers for My Time.
 * All Unix/JD conversions use UTC instants; no browser locale assumptions.
 * Abhijit is presented as a traditional daytime window, not a scientific prediction.
 */
export type InstantWindow = { start_utc: string; end_utc: string };

export function timeScaleCounters(instant: Date | number = new Date()) {
  const milliseconds = instant instanceof Date ? instant.getTime() : instant;
  if (!Number.isFinite(milliseconds)) throw new Error("invalid_instant");
  const julianDay = milliseconds / 86_400_000 + 2_440_587.5;
  return {
    unix_seconds: Math.floor(milliseconds / 1000),
    unix_milliseconds: Math.trunc(milliseconds),
    julian_day: julianDay,
    modified_julian_day: julianDay - 2_400_000.5,
    utc_iso: new Date(milliseconds).toISOString()
  };
}

/** The 8th of 15 daytime muhurtas, centered on the midpoint between sunrise and sunset. */
export function abhijitMuhurta(sunriseUtc: string | null, sunsetUtc: string | null): InstantWindow | null {
  if (!sunriseUtc || !sunsetUtc) return null;
  const sunrise = Date.parse(sunriseUtc), sunset = Date.parse(sunsetUtc);
  if (!Number.isFinite(sunrise) || !Number.isFinite(sunset) || sunset <= sunrise) return null;
  const halfWindow = (sunset - sunrise) / 30;
  const noon = sunrise + (sunset - sunrise) / 2;
  return { start_utc: new Date(noon - halfWindow).toISOString(), end_utc: new Date(noon + halfWindow).toISOString() };
}

export function nepalStandardTime(instant: Date | number = new Date()) {
  const milliseconds = instant instanceof Date ? instant.getTime() : instant;
  if (!Number.isFinite(milliseconds)) throw new Error("invalid_instant");
  const nepal = new Date(milliseconds + 345 * 60_000);
  return {
    date: nepal.toISOString().slice(0, 10),
    time: nepal.toISOString().slice(11, 19),
    offset: "+05:45",
    unix_milliseconds: Math.trunc(milliseconds)
  };
}

export type MuhurtaInputs = {
  startUtc: string;
  endUtc: string;
  favorableChoghadiya?: boolean;
  rahuKaal?: boolean;
  yamaganda?: boolean;
  gulika?: boolean;
  taraIndex?: number | null; // 0..8: Janma, Sampat, Vipat, Kshema, Pratyari, Sadhaka, Naidhana, Mitra, Parama Mitra
  chandraHouse?: number | null; // 1..12 from natal Moon sign
};

/** Explainable rule score; not a guarantee and not a substitute for a user's tradition. */
export function scorePersonalizedMuhurta(input: MuhurtaInputs) {
  const start = Date.parse(input.startUtc), end = Date.parse(input.endUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("invalid_window");
  let score = 50;
  const reasons: string[] = [];
  const cautions: string[] = [];
  if (input.favorableChoghadiya) { score += 15; reasons.push("favorable_choghadiya"); }
  if (input.rahuKaal) { score -= 30; cautions.push("rahu_kaal"); }
  if (input.yamaganda) { score -= 20; cautions.push("yamaganda"); }
  if (input.gulika) { score -= 15; cautions.push("gulika"); }
  if (input.taraIndex != null) {
    if (!Number.isInteger(input.taraIndex) || input.taraIndex < 0 || input.taraIndex > 8) throw new Error("invalid_tara_index");
    const taraScores = [0, 12, -18, 8, -12, 18, -25, 12, 20];
    score += taraScores[input.taraIndex];
    reasons.push("tara:" + input.taraIndex);
  }
  if (input.chandraHouse != null) {
    if (!Number.isInteger(input.chandraHouse) || input.chandraHouse < 1 || input.chandraHouse > 12) throw new Error("invalid_chandra_house");
    if ([1,3,6,7,10,11].includes(input.chandraHouse)) { score += 12; reasons.push("supportive_chandrabalam"); }
    else if ([4,8,12].includes(input.chandraHouse)) { score -= 15; cautions.push("traditional_chandrabalam_caution"); }
  }
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    label: score >= 75 ? "supportive" as const : score >= 45 ? "mixed" as const : "caution" as const,
    reasons,
    cautions,
    disclaimer: "Traditional rule-based guidance only; not a scientific guarantee."
  };
}
