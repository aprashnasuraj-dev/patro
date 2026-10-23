/**
 * Explainable personal-time ranking.
 *
 * This module only scores factors that are explicitly supplied by the existing
 * Panchang, Rashifal, Janma Patro and timing engines. Missing inputs are omitted
 * and remaining weights are normalized; missing birth data is never fabricated.
 */
import { dedupeDisplayStrings } from "./personal-time-utils";

export type PersonalTimeActivity = "general" | "work" | "study" | "travel" | "prayer" | "meditation" | "family";
export type RashifalSignal = { overall?: number; domains?: Record<string, number>; sections?: Array<{ domain?: string; score?: number; band?: string; text?: string }> };
export type PersonalChartPoint = { key?: string; name: string; signIndex?: number | null; sign?: string; house?: number | null };
export type PersonalChartSnapshot = { lagnaSignIndex?: number | null; lagna?: string; planets: PersonalChartPoint[] };
export type PersonalTimeWindowInput = {
  startUtc: string;
  endUtc: string;
  /** Panchang/Choghadiya/caution score before natal Tara and Chandra Bala are applied. */
  panchangScore: number;
  panchangReasons?: string[];
  panchangCautions?: string[];
  activity: PersonalTimeActivity;
  horaLord?: string | null;
  tatwa?: string | null;
  rashifal?: RashifalSignal | null;
  dashaLord?: string | null;
  hasNatalChart?: boolean;
  /** Legacy compatibility flag. A connected chart remains personalized when an optional comparison is absent. */
  natalFactorsApplied?: boolean;
  /** 0..8 index for the nine Tara Bala groups. */
  taraIndex?: number | null;
  /** Transit Moon house counted from natal Moon, 1..12. */
  chandraHouse?: number | null;
  natalChart?: SavedJanmaPatroContext | null;
  eventChart?: PersonalChartSnapshot | null;
};
export type PersonalTimeComponent = { key: string; score: number; weight: number; configuredWeight?: number; explanation: string; activityExplanations?: string[] };
export type PersonalTimeEvaluation = {
  score: number;
  label: "supportive" | "mixed" | "caution";
  confidence: "personalized" | "partially-personalized" | "general";
  components: PersonalTimeComponent[];
  reasons: string[];
  cautions: string[];
  missing: string[];
};
const ACTIVITY_DOMAIN: Partial<Record<PersonalTimeActivity, string>> = { work: "work", study: "learning", family: "relationships" };
const ACTIVITY_WEIGHTS: Record<PersonalTimeActivity, Record<string, number>> = {
  general: { panchang: 35, rashifal: 18, "dasha-hora": 12, "natal-bala": 15, "chart-lords": 15, gochara: 5 },
  work: { panchang: 31, rashifal: 15, "dasha-hora": 10, "natal-bala": 10, "chart-lords": 20, "activity-hora": 9, "activity-tatwa": 2, gochara: 3 },
  study: { panchang: 31, rashifal: 16, "dasha-hora": 8, "natal-bala": 13, "chart-lords": 15, "activity-hora": 9, "activity-tatwa": 4, gochara: 4 },
  travel: { panchang: 32, rashifal: 13, "dasha-hora": 8, "natal-bala": 10, "chart-lords": 14, "activity-hora": 10, "activity-tatwa": 6, gochara: 7 },
  prayer: { panchang: 30, rashifal: 13, "dasha-hora": 8, "natal-bala": 12, "chart-lords": 11, "activity-hora": 6, "activity-tatwa": 12, gochara: 8 },
  meditation: { panchang: 30, rashifal: 12, "dasha-hora": 8, "natal-bala": 12, "chart-lords": 10, "activity-hora": 6, "activity-tatwa": 13, gochara: 9 },
  family: { panchang: 32, rashifal: 15, "dasha-hora": 8, "natal-bala": 11, "chart-lords": 14, "activity-hora": 8, "activity-tatwa": 5, gochara: 7 }
};
const ACTIVITY_HOUSES: Record<PersonalTimeActivity, number[]> = {
  general: [1, 9, 10], work: [10, 11, 6], study: [4, 5, 9], travel: [3, 9, 12],
  prayer: [5, 9, 12], meditation: [8, 9, 12], family: [2, 4, 7]
};
const HORA_PREFERENCES: Record<PersonalTimeActivity, string[]> = {
  general: [], work: ["Mercury", "Jupiter", "Sun", "Saturn"], study: ["Mercury", "Jupiter", "Moon"],
  travel: ["Mercury", "Moon", "Venus"], prayer: ["Jupiter", "Sun", "Moon"],
  meditation: ["Moon", "Jupiter", "Saturn"], family: ["Venus", "Moon", "Jupiter"]
};
const TATWA_PREFERENCES: Record<PersonalTimeActivity, string[]> = {
  general: [], work: ["Prithvi", "Tejas / Agni", "Vayu"], study: ["Vayu", "Akash"],
  travel: ["Vayu", "Aap / Jala"], prayer: ["Akash", "Vayu"], meditation: ["Akash", "Aap / Jala"], family: ["Aap / Jala", "Prithvi"]
};
const PLANET_FRIENDS: Record<string, { friends: string[]; neutral: string[]; enemies: string[] }> = {
  Sun: { friends: ["Moon", "Mars", "Jupiter"], neutral: ["Mercury"], enemies: ["Venus", "Saturn"] },
  Moon: { friends: ["Sun", "Mercury"], neutral: ["Mars", "Jupiter", "Venus", "Saturn"], enemies: [] },
  Mars: { friends: ["Sun", "Moon", "Jupiter"], neutral: ["Venus", "Saturn"], enemies: ["Mercury"] },
  Mercury: { friends: ["Sun", "Venus"], neutral: ["Mars", "Jupiter", "Saturn"], enemies: ["Moon"] },
  Jupiter: { friends: ["Sun", "Moon", "Mars"], neutral: ["Saturn"], enemies: ["Mercury", "Venus"] },
  Venus: { friends: ["Mercury", "Saturn"], neutral: ["Mars", "Jupiter"], enemies: ["Sun", "Moon"] },
  Saturn: { friends: ["Mercury", "Venus"], neutral: ["Jupiter"], enemies: ["Sun", "Moon", "Mars"] }
};
const PLANET_OWN_SIGNS: Record<string, number[]> = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
const PLANET_EXALTED_SIGN: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const PLANET_DEBILITATED_SIGN: Record<string, number> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const SIGN_ALIASES: string[][] = [
  ["मेष", "मेषम्", "aries", "mesha"], ["वृष", "वृषभ", "taurus", "vrishabha"], ["मिथुन", "gemini", "mithuna"],
  ["कर्कट", "कर्क", "cancer", "karka"], ["सिंह", "leo", "simha"], ["कन्या", "virgo", "kanya"],
  ["तुला", "libra", "tula"], ["वृश्चिक", "scorpio", "vrischika"], ["धनु", "sagittarius", "dhanu"],
  ["मकर", "capricorn", "makara"], ["कुम्भ", "कुंभ", "aquarius", "kumbha"], ["मीन", "pisces", "meena"]
];
const PLANET_CANONICAL: Record<string, string> = {
  surya: "Sun", ravi: "Sun", sun: "Sun", chandra: "Moon", moon: "Moon", mangal: "Mars", mars: "Mars",
  budha: "Mercury", mercury: "Mercury", brihaspati: "Jupiter", guru: "Jupiter", jupiter: "Jupiter",
  shukra: "Venus", venus: "Venus", shani: "Saturn", saturn: "Saturn", rahu: "Rahu", ketu: "Ketu"
};
function canonicalPlanet(value: unknown): string {
  const text = String(value || "").trim().toLowerCase();
  return PLANET_CANONICAL[text] || (Object.values(PLANET_CANONICAL).find(name => name.toLowerCase() === text) || String(value || "").trim());
}
function validScore(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100; }
function clampScore(value: number): number { return Math.max(0, Math.min(100, value)); }
function domainScore(rashifal: RashifalSignal | null | undefined, domain: string): number | null {
  if (!rashifal) return null;
  const direct = rashifal.domains?.[domain];
  if (validScore(direct)) return direct;
  const section = rashifal.sections?.find(item => item.domain === domain && validScore(item.score));
  return section && validScore(section.score) ? section.score : null;
}
function signIndexOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 11) return value;
  const normalized = String(value || "").toLowerCase().trim();
  if (!normalized) return null;
  const index = SIGN_ALIASES.findIndex(aliases => aliases.some(alias => normalized.includes(alias.toLowerCase())));
  return index >= 0 ? index : null;
}
function chartPlanet(chart: PersonalChartSnapshot | SavedJanmaPatroContext | null | undefined, planetName: string): PersonalChartPoint | null {
  if (!chart || !Array.isArray(chart.planets)) return null;
  return chart.planets.find(point => canonicalPlanet(point.key || point.name) === planetName || canonicalPlanet(point.name) === planetName) || null;
}
function chartLagnaIndex(chart: PersonalChartSnapshot | SavedJanmaPatroContext | null | undefined): number | null {
  if (!chart) return null;
  const snapshot = chart as PersonalChartSnapshot;
  if (Number.isInteger(snapshot.lagnaSignIndex) && (snapshot.lagnaSignIndex as number) >= 0 && (snapshot.lagnaSignIndex as number) <= 11) return snapshot.lagnaSignIndex as number;
  return signIndexOf(chart.lagna);
}
function naturalRelationScore(dashaLord: string, horaLord: string): { score: number; relation: string } {
  const dasha = canonicalPlanet(dashaLord), hora = canonicalPlanet(horaLord);
  if (dasha === hora) return { score: 98, relation: "same" };
  const relationship = PLANET_FRIENDS[dasha];
  if (!relationship) return { score: 60, relation: "neutral" };
  if (relationship.friends.includes(hora)) return { score: 85, relation: "friend" };
  if (relationship.enemies.includes(hora)) return { score: 35, relation: "enemy" };
  return { score: 60, relation: "neutral" };
}
function dashaAfflictionPenalty(dashaLord: string, natal: SavedJanmaPatroContext | null | undefined): number {
  const lord = chartPlanet(natal, canonicalPlanet(dashaLord));
  if (!lord) return 0;
  let penalty = [6, 8, 12].includes(lord.house || 0) ? 10 : 0;
  const sign = signIndexOf(lord.sign);
  if (sign != null && PLANET_DEBILITATED_SIGN[canonicalPlanet(dashaLord)] === sign) penalty += 10;
  if (lord.house != null) {
    const conjunctions = natal?.planets.filter(p =>
      canonicalPlanet(p.name || p.key) !== canonicalPlanet(dashaLord) &&
      ["Mars", "Saturn", "Rahu", "Ketu"].includes(canonicalPlanet(p.name || p.key)) && p.house === lord.house
    ).length || 0;
    penalty += Math.min(10, conjunctions * 5);
  }
  return Math.min(25, penalty);
}
function natalBalaScore(taraIndex?: number | null, chandraHouse?: number | null): { score: number | null; explanation: string } {
  const values: number[] = [];
  const descriptions: string[] = [];
  const taraScores = [50, 62, 32, 58, 38, 68, 25, 62, 70];
  const taraNames = ["Janma", "Sampat", "Vipat", "Kshema", "Pratyari", "Sadhaka", "Naidhana", "Mitra", "Atimitra"];
  if (taraIndex != null) {
    if (!Number.isInteger(taraIndex) || taraIndex < 0 || taraIndex > 8) throw new Error("invalid_tara_index");
    values.push(taraScores[taraIndex]);
    descriptions.push(taraNames[taraIndex] + " Tara Bala");
  }
  if (chandraHouse != null) {
    if (!Number.isInteger(chandraHouse) || chandraHouse < 1 || chandraHouse > 12) throw new Error("invalid_chandra_house");
    values.push([1, 3, 6, 7, 10, 11].includes(chandraHouse) ? 85 : [4, 8, 12].includes(chandraHouse) ? 30 : 55);
    descriptions.push("Chandra Bala from natal Moon, house " + chandraHouse);
  }
  return values.length
    ? { score: Math.round(values.reduce((sum, score) => sum + score, 0) / values.length), explanation: descriptions.join(" + ") + "; traditional relative signals." }
    : { score: null, explanation: "No Tara/Chandra comparison was supplied for this candidate." };
}
function houseLord(signIndex: number): string {
  const sign = ((signIndex % 12) + 12) % 12;
  if ([0, 7].includes(sign)) return "Mars";
  if ([1, 6].includes(sign)) return "Venus";
  if ([2, 5].includes(sign)) return "Mercury";
  if (sign === 3) return "Moon";
  if (sign === 4) return "Sun";
  if ([8, 11].includes(sign)) return "Jupiter";
  return "Saturn";
}
function oneChartLordsScore(chart: PersonalChartSnapshot | SavedJanmaPatroContext | null | undefined, activity: PersonalTimeActivity): number | null {
  const lagna = chartLagnaIndex(chart);
  if (lagna == null || !chart) return null;
  const importantHouses = ACTIVITY_HOUSES[activity];
  const scores: number[] = [];
  for (const houseNo of importantHouses) {
    const lordName = houseLord((lagna + houseNo - 1) % 12);
    const planet = chartPlanet(chart, lordName);
    if (!planet) continue;
    let score = 58;
    if (planet.house != null && importantHouses.includes(planet.house)) score += 14;
    else if (planet.house != null && [1, 4, 5, 7, 9, 10, 11].includes(planet.house)) score += 6;
    else if (planet.house != null && [6, 8, 12].includes(planet.house)) score -= 8;
    const sign = signIndexOf(planet.sign) ?? (typeof planet.signIndex === "number" ? planet.signIndex : null);
    if (sign != null && (PLANET_OWN_SIGNS[lordName] || []).includes(sign)) score += 10;
    if (sign != null && PLANET_EXALTED_SIGN[lordName] === sign) score += 8;
    if (sign != null && PLANET_DEBILITATED_SIGN[lordName] === sign) score -= 12;
    scores.push(clampScore(score));
  }
  return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
}
function chartLordsScore(activity: PersonalTimeActivity, natal: SavedJanmaPatroContext | null | undefined, event: PersonalChartSnapshot | null | undefined): { score: number | null; explanation: string } {
  const available = [oneChartLordsScore(natal, activity), oneChartLordsScore(event, activity)].filter((v): v is number => v != null);
  return available.length
    ? { score: Math.round(available.reduce((sum, value) => sum + value, 0) / available.length),
        explanation: "Activity-relevant house lords (" + ACTIVITY_HOUSES[activity].join(", ") + ") are assessed from available natal and candidate-time chart placements, sign dignity and houses; a traditional heuristic." }
    : { score: null, explanation: "House-lord placements were unavailable for this candidate." };
}
function transitFitScore(event: PersonalChartSnapshot | null | undefined, natal: SavedJanmaPatroContext | null | undefined): { score: number | null; explanation: string } {
  const natalMoon = signIndexOf(natal?.rashi);
  const jupiter = chartPlanet(event, "Jupiter"), saturn = chartPlanet(event, "Saturn");
  if (natalMoon == null || !jupiter || !saturn) return { score: null, explanation: "Jupiter/Saturn transit-to-natal-Moon comparison unavailable." };
  const jupiterSign = signIndexOf(jupiter.sign) ?? (typeof jupiter.signIndex === "number" ? jupiter.signIndex : null);
  const saturnSign = signIndexOf(saturn.sign) ?? (typeof saturn.signIndex === "number" ? saturn.signIndex : null);
  if (jupiterSign == null || saturnSign == null) return { score: null, explanation: "Jupiter/Saturn transit signs were unavailable." };
  const relativeHouse = (sign: number) => ((sign - natalMoon + 12) % 12) + 1;
  const jHouse = relativeHouse(jupiterSign), sHouse = relativeHouse(saturnSign);
  const jScore = [2, 5, 7, 9, 11].includes(jHouse) ? 82 : [6, 8, 12].includes(jHouse) ? 38 : 60;
  const sScore = [3, 6, 11].includes(sHouse) ? 78 : [1, 2, 4, 5, 7, 8, 9, 10, 12].includes(sHouse) ? 42 : 58;
  return { score: Math.round((jScore + sScore) / 2),
    explanation: "Jupiter transits " + jHouse + "th and Saturn " + sHouse + "th from natal Moon; traditional Gochara heuristic, not a prediction." };
}
function activityHoraScore(activity: PersonalTimeActivity, hora: string): number {
  return HORA_PREFERENCES[activity].includes(canonicalPlanet(hora)) ? 95 : 55;
}
function activityTatwaScore(activity: PersonalTimeActivity, tatwa: string): number {
  return TATWA_PREFERENCES[activity].includes(tatwa) ? 95 : 55;
}
export function evaluatePersonalTime(input: PersonalTimeWindowInput): PersonalTimeEvaluation {
  const start = Date.parse(input.startUtc), end = Date.parse(input.endUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("invalid_window");
  if (!validScore(input.panchangScore)) throw new Error("invalid_panchang_score");
  const weights = ACTIVITY_WEIGHTS[input.activity] || ACTIVITY_WEIGHTS.general;
  const components: PersonalTimeComponent[] = [
    { key: "panchang", score: input.panchangScore, weight: weights.panchang, configuredWeight: weights.panchang,
      explanation: "Panchang, Choghadiya and caution timing. Strong traditional caution windows remain hard score caps." }
  ];
  const domain = ACTIVITY_DOMAIN[input.activity];
  const readingScore = domain ? domainScore(input.rashifal, domain) : null;
  if (readingScore !== null) components.push({
    key: "rashifal", score: readingScore, weight: weights.rashifal, configuredWeight: weights.rashifal,
    explanation: "Daily Rashifal's published " + domain + " domain score is applied to this matching activity."
  });
  if (input.dashaLord && input.horaLord) {
    const match = naturalRelationScore(input.dashaLord, input.horaLord);
    const penalty = dashaAfflictionPenalty(input.dashaLord, input.natalChart || null);
    const score = clampScore(match.score - penalty);
    const relationText = match.relation === "same" ? "same planet" : match.relation === "friend" ? "natural friend" : match.relation === "enemy" ? "natural enemy" : "neutral relationship";
    components.push({
      key: "dasha-hora", score, weight: weights["dasha-hora"], configuredWeight: weights["dasha-hora"],
      explanation: input.dashaLord + " Dasha with " + input.horaLord + " Hora: " + relationText + " graded at " + match.score +
        "/100" + (penalty ? ", reduced " + penalty + " for natal dignity/house/conjunction cautions" : "") + ". Traditional rule, not a scientific measure."
    });
  }
  const bala = natalBalaScore(input.taraIndex, input.chandraHouse);
  if (bala.score != null) components.push({ key: "natal-bala", score: bala.score, weight: weights["natal-bala"], configuredWeight: weights["natal-bala"], explanation: bala.explanation });
  const lords = chartLordsScore(input.activity, input.natalChart, input.eventChart);
  if (lords.score != null) components.push({ key: "chart-lords", score: lords.score, weight: weights["chart-lords"], configuredWeight: weights["chart-lords"], explanation: lords.explanation });
  const gochara = transitFitScore(input.eventChart, input.natalChart || null);
  if (gochara.score != null) components.push({ key: "gochara", score: gochara.score, weight: weights.gochara, configuredWeight: weights.gochara, explanation: gochara.explanation });
  if (input.activity !== "general" && input.horaLord) {
    const score = activityHoraScore(input.activity, input.horaLord);
    components.push({ key: "activity-hora", score, weight: weights["activity-hora"], configuredWeight: weights["activity-hora"],
      explanation: canonicalPlanet(input.horaLord) + " Hora is " + (HORA_PREFERENCES[input.activity].includes(canonicalPlanet(input.horaLord)) ? "a traditional preference" : "not the preferred Hora; treated as neutral, not harmful") + " for " + input.activity + "." });
  }
  if (input.activity !== "general" && input.tatwa) {
    const score = activityTatwaScore(input.activity, input.tatwa);
    components.push({ key: "activity-tatwa", score, weight: weights["activity-tatwa"], configuredWeight: weights["activity-tatwa"],
      explanation: input.tatwa + " Tatwa " + (TATWA_PREFERENCES[input.activity].includes(input.tatwa) ? "matches" : "does not match") + " the traditional preference for " + input.activity + "; this is a weak contextual signal." });
  }
  const weightTotal = components.reduce((sum, item) => sum + item.weight, 0);
  const weightedScore = Math.round(components.reduce((sum, item) => sum + item.score * item.weight, 0) / weightTotal);
  const cautionSet = new Set(input.panchangCautions || []);
  const score = cautionSet.has("rahu_kaal") ? Math.min(weightedScore, 44)
    : cautionSet.has("yamaganda") ? Math.min(weightedScore, 54)
    : cautionSet.has("gulika") ? Math.min(weightedScore, 59)
    : weightedScore;
  const missing: string[] = [];
  if (!input.hasNatalChart) missing.push("birth-chart");
  if (readingScore === null) missing.push("matching-rashifal-domain");
  if (!input.dashaLord) missing.push("active-dasha");
  if (!input.horaLord) missing.push("hora");
  if (!input.tatwa) missing.push("tantra-tatwa");
  if (bala.score == null) missing.push("natal-compatibility");
  if (lords.score == null) missing.push("chart-lords");
  if (gochara.score == null) missing.push("jupiter-saturn-gochara");
  const confidence = input.hasNatalChart ? "personalized" : components.some(item => item.key !== "panchang") ? "partially-personalized" : "general";
  const reasons = dedupeDisplayStrings([...(input.panchangReasons || []), ...components.filter(item => item.key !== "panchang").map(item => item.explanation)]);
  const cautions = dedupeDisplayStrings(input.panchangCautions || []);
  if (score !== weightedScore) cautions.push("traditional_caution_caps_overall_rank");
  const normalizedComponents = components.map(item => ({ ...item, weight: Math.round((item.weight / weightTotal) * 1000) / 10 }));
  return {
    score, label: score >= 75 ? "supportive" : score >= 45 ? "mixed" : "caution",
    confidence, components: normalizedComponents, reasons, cautions: dedupeDisplayStrings(cautions), missing
  };
}


export type SavedJanmaPatroContext = {
  rashi: string;
  lagna: string;
  nakshatra: string;
  pada: number | null;
  birth: { name: string; date: string; time: string; location: string; lat: number | null; lng: number | null; timezone?: string } | null;
  planets: Array<{ key: string; name: string; sign: string; house: number | null }>;
  dashas: Array<{ lord: string; start: string; end: string }>;
};

/**
 * Explainable traditional reference metric, not a prediction or a guarantee.
 * Birth date supplies the personal digit root; natal Nakshatra/Pada are calculated
 * by the existing birth-chart engine from birth time and birthplace; current Tithi
 * supplies the day-specific input. Missing natal inputs are not fabricated.
 */
export function calculatePersonalLuckyNumber(
  birthDate: string,
  tithiIndex: number,
  natalNakshatraIndex?: number | null,
  natalPada?: number | null
): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !Number.isInteger(tithiIndex) || tithiIndex < 1 || tithiIndex > 30) return null;
  const parsed = new Date(birthDate + "T00:00:00.000Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthDate) return null;
  if (natalNakshatraIndex != null && (!Number.isInteger(natalNakshatraIndex) || natalNakshatraIndex < 1 || natalNakshatraIndex > 27)) return null;
  if (natalPada != null && (!Number.isInteger(natalPada) || natalPada < 1 || natalPada > 4)) return null;
  const sum = birthDate.replace(/\D/g, "").split("").reduce((total, digit) => total + Number(digit), 0);
  const root = ((sum - 1) % 9) + 1;
  const natalContribution = natalNakshatraIndex == null ? 0 : natalNakshatraIndex + (natalPada ?? 1) - 1;
  return ((root + tithiIndex + natalContribution - 1) % 9) + 1;
}

/** Selects a dedicated lucky-time recommendation only from valid, birth-personalized scored windows. */
export function selectPersonalLuckyTime<T extends {
  start_utc: string;
  end_utc: string;
  combinedScore: number;
  personalizationLevel: "personalized" | "partial" | "general";
  personalEvaluation: PersonalTimeEvaluation;
}>(windows: T[], hasBirthProfile: boolean, now: Date, selectedDateIsToday: boolean): T | null {
  if (!hasBirthProfile || !Number.isFinite(now.getTime())) return null;
  const candidates = windows.filter(window =>
    Number.isFinite(Date.parse(window.start_utc)) &&
    Number.isFinite(Date.parse(window.end_utc)) &&
    Date.parse(window.end_utc) > Date.parse(window.start_utc) &&
    Number.isFinite(window.combinedScore) &&
    window.personalizationLevel !== "general" &&
    (!selectedDateIsToday || Date.parse(window.end_utc) > now.getTime())
  );
  return candidates.sort((a, b) => b.combinedScore - a.combinedScore || Date.parse(a.start_utc) - Date.parse(b.start_utc))[0] ?? null;
}

/** Normalize the actual localStorage payload written by JanmaPatroSuite. */
export function normalizeJanmaPatroContext(value: unknown): SavedJanmaPatroContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, any>;
  const birth = raw.birth && typeof raw.birth === "object" && !Array.isArray(raw.birth)
    ? {
        name: String(raw.birth.name || ""),
        date: String(raw.birth.date || ""),
        time: String(raw.birth.time || ""),
        location: String(raw.birth.location || ""),
        lat: typeof raw.birth.lat === "number" && Number.isFinite(raw.birth.lat) && Math.abs(raw.birth.lat) <= 90 ? raw.birth.lat : null,
        lng: typeof raw.birth.lng === "number" && Number.isFinite(raw.birth.lng) && Math.abs(raw.birth.lng) <= 180 ? raw.birth.lng : null,
        ...(typeof raw.birth.timezone === "string" && raw.birth.timezone.trim() ? { timezone: raw.birth.timezone.trim() } : {})
      }
    : null;
  const planets = Array.isArray(raw.planets)
    ? raw.planets.filter((planet: unknown) => !!planet && typeof planet === "object" && !Array.isArray(planet))
      .map((planet: any) => ({
        key: String(planet.planet_en || planet.key || ""),
        name: String(planet.planet_en || planet.name || ""),
        sign: String(planet.rashi?.name || planet.sign || ""),
        house: Number.isInteger(planet.house) && planet.house >= 1 && planet.house <= 12 ? planet.house : null
      })).filter((planet: { name: string }) => planet.name.length > 0).slice(0, 10)
    : [];
  const dashas = Array.isArray(raw.dasha?.periods)
    ? raw.dasha.periods.filter((period: unknown) => {
        if (!period || typeof period !== "object" || Array.isArray(period)) return false;
        const item = period as Record<string, unknown>;
        return typeof item.lord === "string" && item.lord.length > 0
          && typeof item.start === "string" && Number.isFinite(Date.parse(item.start))
          && typeof item.end === "string" && Number.isFinite(Date.parse(item.end))
          && Date.parse(item.end) > Date.parse(item.start);
      }).map((period: any) => ({ lord: period.lord, start: period.start, end: period.end }))
    : [];
  const context: SavedJanmaPatroContext = {
    rashi: String(raw.rashi?.name || ""), lagna: String(raw.lagna?.name || ""),
    nakshatra: String(raw.nakshatra?.name || ""),
    pada: Number.isInteger(raw.nakshatra?.pada) && raw.nakshatra.pada >= 1 && raw.nakshatra.pada <= 4 ? raw.nakshatra.pada : null,
    birth, planets, dashas
  };
  return context.rashi || context.nakshatra ? context : null;
}
