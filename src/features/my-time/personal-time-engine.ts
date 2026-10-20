/**
 * Explainable personal-time ranking.
 *
 * This module only scores factors that are explicitly supplied by the existing
 * Panchang, Rashifal, Janma Patro and timing engines. Missing inputs are omitted
 * and remaining weights are normalized; missing birth data is never fabricated.
 */
export type PersonalTimeActivity = "general" | "work" | "study" | "travel" | "prayer" | "meditation" | "family";
export type RashifalSignal = { overall?: number; domains?: Record<string, number>; sections?: Array<{ domain?: string; score?: number; band?: string; text?: string }> };
export type PersonalTimeWindowInput = {
  startUtc: string;
  endUtc: string;
  panchangScore: number;
  panchangReasons?: string[];
  panchangCautions?: string[];
  activity: PersonalTimeActivity;
  horaLord?: string | null;
  tatwa?: string | null;
  rashifal?: RashifalSignal | null;
  dashaLord?: string | null;
  hasNatalChart?: boolean;
};
export type PersonalTimeComponent = { key: string; score: number; weight: number; explanation: string };
export type PersonalTimeEvaluation = {
  score: number;
  label: "supportive" | "mixed" | "caution";
  confidence: "personalized" | "partially-personalized" | "general";
  components: PersonalTimeComponent[];
  reasons: string[];
  cautions: string[];
  missing: string[];
};
const ACTIVITY_DOMAIN: Partial<Record<PersonalTimeActivity, string>> = {
  work: "work", study: "learning", family: "relationships"
};
const HORA_PREFERENCES: Record<PersonalTimeActivity, string[]> = {
  general: [], work: ["Mercury", "Jupiter", "Sun", "Saturn"],
  study: ["Mercury", "Jupiter", "Moon"], travel: ["Mercury", "Moon", "Venus"],
  prayer: ["Jupiter", "Sun", "Moon"], meditation: ["Moon", "Jupiter", "Saturn"],
  family: ["Venus", "Moon", "Jupiter"]
};
const TATWA_PREFERENCES: Record<PersonalTimeActivity, string[]> = {
  general: [], work: ["Prithvi", "Tejas / Agni", "Vayu"], study: ["Vayu", "Akash"],
  travel: ["Vayu", "Aap / Jala"], prayer: ["Akash", "Vayu"],
  meditation: ["Akash", "Aap / Jala"], family: ["Aap / Jala", "Prithvi"]
};
function validScore(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100; }
function domainScore(rashifal: RashifalSignal | null | undefined, domain: string): number | null {
  if (!rashifal) return null;
  const direct = rashifal.domains?.[domain];
  if (validScore(direct)) return direct;
  const section = rashifal.sections?.find(item => item.domain === domain && validScore(item.score));
  return section && validScore(section.score) ? section.score : null;
}
export function evaluatePersonalTime(input: PersonalTimeWindowInput): PersonalTimeEvaluation {
  const start = Date.parse(input.startUtc), end = Date.parse(input.endUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("invalid_window");
  if (!validScore(input.panchangScore)) throw new Error("invalid_panchang_score");
  const components: PersonalTimeComponent[] = [
    { key: "panchang", score: input.panchangScore, weight: 45, explanation: "Panchang timing score, including applicable Choghadiya, caution windows and available Tara/Chandra Bala." }
  ];
  const domain = ACTIVITY_DOMAIN[input.activity];
  const readingScore = domain ? domainScore(input.rashifal, domain) : null;
  if (readingScore !== null) components.push({
    key: "rashifal", score: readingScore, weight: 25,
    explanation: `Daily Rashifal's published ${domain} domain score is applied to this matching activity.`
  });
  if (input.dashaLord && input.horaLord) {
    const sameLord = input.dashaLord.trim().toLowerCase() === input.horaLord.trim().toLowerCase();
    components.push({
      key: "dasha-hora", score: sameLord ? 100 : 50, weight: 15,
      explanation: sameLord
        ? `The active Vimshottari Dasha lord (${input.dashaLord}) matches this Hora lord.`
        : `The active Vimshottari Dasha lord is ${input.dashaLord}; this Hora is ruled by ${input.horaLord}. No unsupported compatibility claim is assumed.`
    });
  }
  if (input.activity !== "general" && input.horaLord) {
    const preferred = HORA_PREFERENCES[input.activity];
    components.push({
      key: "activity-hora", score: preferred.includes(input.horaLord) ? 100 : 50, weight: 10,
      explanation: preferred.includes(input.horaLord)
        ? `${input.horaLord} Hora matches the selected ${input.activity} activity's traditional preference.`
        : `${input.horaLord} Hora is not in the selected ${input.activity} activity's preferred list; treated as neutral, not harmful.`
    });
  }
  if (input.activity !== "general" && input.tatwa) {
    const preferred = TATWA_PREFERENCES[input.activity];
    components.push({
      key: "activity-tatwa", score: preferred.includes(input.tatwa) ? 100 : 55, weight: 5,
      explanation: preferred.includes(input.tatwa)
        ? `${input.tatwa} Tatwa matches the selected ${input.activity} activity's traditional preference.`
        : `${input.tatwa} Tatwa does not match the preferred list for ${input.activity}; this is a weak fit, not a prohibition.`
    });
  }
  const weightTotal = components.reduce((sum, item) => sum + item.weight, 0);
  const score = Math.round(components.reduce((sum, item) => sum + item.score * item.weight, 0) / weightTotal);
  const missing: string[] = [];
  if (!input.hasNatalChart) missing.push("birth-chart");
  if (readingScore === null) missing.push("matching-rashifal-domain");
  if (!input.dashaLord) missing.push("active-dasha");
  if (!input.horaLord) missing.push("hora");
  if (!input.tatwa) missing.push("tantra-tatwa");
  const personalizedSignals = components.some(item => item.key === "rashifal" || item.key === "dasha-hora");
  const confidence = !input.hasNatalChart
    ? personalizedSignals ? "partially-personalized" : "general"
    : missing.length >= 3 ? "partially-personalized" : "personalized";
  const reasons = [...(input.panchangReasons || [])];
  const cautions = [...(input.panchangCautions || [])];
  for (const component of components.slice(1)) reasons.push(component.explanation);
  return {
    score, label: score >= 75 ? "supportive" : score >= 45 ? "mixed" : "caution",
    confidence, components, reasons, cautions, missing
  };
}


export type SavedJanmaPatroContext = {
  rashi: string;
  lagna: string;
  nakshatra: string;
  pada: number | null;
  birth: { name: string; date: string; time: string; location: string; lat: number | null; lng: number | null } | null;
  planets: Array<{ key: string; name: string; sign: string; house: number | null }>;
  dashas: Array<{ lord: string; start: string; end: string }>;
};

/** Traditional reference metric; it is not a prediction of real-world outcomes. */
export function calculatePersonalLuckyNumber(birthDate: string, tithiIndex: number): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !Number.isInteger(tithiIndex) || tithiIndex < 1 || tithiIndex > 30) return null;
  const parsed = new Date(birthDate + "T00:00:00.000Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthDate) return null;
  const sum = birthDate.replace(/\D/g, "").split("").reduce((total, digit) => total + Number(digit), 0);
  const root = ((sum - 1) % 9) + 1;
  return ((root + tithiIndex - 1) % 9) + 1;
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
        lng: typeof raw.birth.lng === "number" && Number.isFinite(raw.birth.lng) && Math.abs(raw.birth.lng) <= 180 ? raw.birth.lng : null
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
