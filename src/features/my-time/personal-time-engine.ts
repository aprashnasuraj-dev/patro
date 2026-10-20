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
  const confidence = !input.hasNatalChart && !personalizedSignals
    ? "general"
    : missing.length >= 3 ? "partially-personalized" : "personalized";
  const reasons = [...(input.panchangReasons || [])];
  const cautions = [...(input.panchangCautions || [])];
  for (const component of components.slice(1)) reasons.push(component.explanation);
  return {
    score, label: score >= 75 ? "supportive" : score >= 45 ? "mixed" : "caution",
    confidence, components, reasons, cautions, missing
  };
}
