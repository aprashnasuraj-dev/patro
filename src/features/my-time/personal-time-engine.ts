import { RASHIS } from "../../patro-tools/core/names";

/**
 * Explainable personal-time ranking.
 *
 * This module only scores factors that are explicitly supplied by the existing
 * Panchang, Rashifal, Janma Patro and timing engines. Missing inputs are omitted
 * and remaining weights are normalized; missing birth data is never fabricated.
 */
export type PersonalTimeActivity = "general" | "work" | "study" | "travel" | "prayer" | "meditation" | "family";
export type RashifalSignal = { overall?: number; domains?: Record<string, number>; sections?: Array<{ domain?: string; score?: number; band?: string; text?: string }> };
export type PersonalTimeChartSignal = {
  /** Sign names use the existing JanmaPatro Nepali Rashi labels where possible. */
  lagnaSign: string;
  planets: Array<{ key: string; name?: string; sign: string; house: number | null }>;
};
export type PersonalTimeWindowInput = {
  startUtc: string;
  endUtc: string;
  panchangScore: number;
  panchangReasons?: string[];
  panchangCautions?: string[];
  choghadiyaType?: string | null;
  activity: PersonalTimeActivity;
  horaLord?: string | null;
  tatwa?: string | null;
  rashifal?: RashifalSignal | null;
  dashaLord?: string | null;
  hasNatalChart?: boolean;
  /** Existing profile produced by JanmaPatroSuite; no parallel natal-chart model is created. */
  natalChart?: SavedJanmaPatroContext | null;
  /** Event-time chart calculated at this candidate window using the existing Jyotish engine. */
  muhurtaChart?: PersonalTimeChartSignal | null;
  /** True only when both natal Tara and Moon-sign comparisons were actually calculated. */
  natalFactorsApplied?: boolean;
};
export type PersonalTimeComponent = { key: string; score: number; weight: number; explanation: string; explanationNe?: string };
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
type PersonalTimeComponentKey = "panchang" | "rashifal" | "dasha-hora" | "chart-lords" | "activity-hora" | "activity-tatwa" | "gochara";
type ActivityWeights = Record<PersonalTimeComponentKey, number>;

/** Per-activity profiles; every complete profile totals 100 before missing-data normalization. */
const ACTIVITY_WEIGHTS: Record<PersonalTimeActivity, ActivityWeights> = {
  general:   { panchang: 35, rashifal: 18, "dasha-hora": 12, "chart-lords": 15, "activity-hora": 10, "activity-tatwa": 5, gochara: 5 },
  work:      { panchang: 32, rashifal: 16, "dasha-hora": 12, "chart-lords": 21, "activity-hora": 11, "activity-tatwa": 3, gochara: 5 },
  study:     { panchang: 34, rashifal: 18, "dasha-hora": 10, "chart-lords": 15, "activity-hora": 12, "activity-tatwa": 6, gochara: 5 },
  travel:    { panchang: 35, rashifal: 15, "dasha-hora": 10, "chart-lords": 15, "activity-hora": 13, "activity-tatwa": 7, gochara: 5 },
  prayer:    { panchang: 35, rashifal: 15, "dasha-hora": 10, "chart-lords": 12, "activity-hora": 8, "activity-tatwa": 12, gochara: 8 },
  meditation:{ panchang: 35, rashifal: 14, "dasha-hora": 10, "chart-lords": 12, "activity-hora": 8, "activity-tatwa": 13, gochara: 8 },
  family:    { panchang: 35, rashifal: 17, "dasha-hora": 10, "chart-lords": 15, "activity-hora": 10, "activity-tatwa": 6, gochara: 7 }
};

const SIGN_LORDS = ["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"] as const;
const SIGN_NAME_INDEX: Record<string, number> = {
  aries:0, mesha:0, taurus:1, vrishabha:1, mithuna:2, gemini:2, karka:3, cancer:3,
  simha:4, leo:4, kanya:5, virgo:5, tula:6, libra:6, vrischika:7, scorpio:7,
  dhanu:8, sagittarius:8, makara:9, capricorn:9, kumbha:10, aquarius:10, meena:11, pisces:11
};
function signIndexOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const text = value.trim().toLocaleLowerCase();
  const nativeIndex = (RASHIS as readonly string[]).indexOf(value.trim());
  if (nativeIndex >= 0) return nativeIndex;
  for (const [token, index] of Object.entries(SIGN_NAME_INDEX)) {
    if (new RegExp("(^|[^a-z])" + token + "([^a-z]|$)", "i").test(text)) return index;
  }
  const nepaliPrefix = ["मेष","वृष","मिथुन","कर्कट","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन"];
  const found = nepaliPrefix.findIndex(prefix => text.includes(prefix));
  return found >= 0 ? found : null;
}
function canonicalPlanet(value: string | undefined | null): string | null {
  const text = String(value || "").toLocaleLowerCase().replace(/[^a-z]/g, "");
  const aliases: Record<string, string[]> = {
    Sun:["sun","surya"], Moon:["moon","chandra"], Mars:["mars","mangal"], Mercury:["mercury","budh"],
    Jupiter:["jupiter","guru","brihaspati"], Venus:["venus","shukra"], Saturn:["saturn","shani"],
    Rahu:["rahu"], Ketu:["ketu"]
  };
  for (const [planet, names] of Object.entries(aliases)) if (names.includes(text)) return planet;
  return null;
}
function chartPlanet(chart: PersonalTimeChartSignal | null | undefined, name: string) {
  if (!chart) return null;
  return chart.planets.find(planet => canonicalPlanet(planet.key) === name || canonicalPlanet(planet.name) === name) || null;
}
const OWN_SIGNS: Record<string, number[]> = {
  Sun:[4], Moon:[3], Mars:[0,7], Mercury:[2,5], Jupiter:[8,11], Venus:[1,6], Saturn:[9,10]
};
const EXALTED_SIGN: Record<string, number> = { Sun:0, Moon:1, Mars:9, Mercury:5, Jupiter:3, Venus:11, Saturn:6 };
const DEBILITATED_SIGN: Record<string, number> = { Sun:6, Moon:7, Mars:3, Mercury:11, Jupiter:9, Venus:5, Saturn:0 };
const NATURAL_RELATIONS: Record<string, { friends: string[]; enemies: string[] }> = {
  Sun:{friends:["Moon","Mars","Jupiter"], enemies:["Venus","Saturn"]},
  Moon:{friends:["Sun","Mercury"], enemies:[]},
  Mars:{friends:["Sun","Moon","Jupiter"], enemies:["Mercury"]},
  Mercury:{friends:["Sun","Venus"], enemies:["Moon"]},
  Jupiter:{friends:["Sun","Moon","Mars"], enemies:["Mercury","Venus"]},
  Venus:{friends:["Mercury","Saturn"], enemies:["Sun","Moon"]},
  Saturn:{friends:["Mercury","Venus"], enemies:["Sun","Moon","Mars"]}
};
const CHOGHADIYA_ACTIVITY_BONUS: Record<PersonalTimeActivity, Record<string, number>> = {
  general:{},
  work:{Labh:8,Shubh:5,Amrit:4},
  study:{Amrit:6,Shubh:6,Labh:5},
  travel:{Char:8,Amrit:3,Shubh:3},
  prayer:{Amrit:8,Shubh:6},
  meditation:{Amrit:7,Shubh:4},
  family:{Amrit:5,Shubh:5,Char:2}
};
function choghadiyaKey(value: string | null | undefined): string | null {
  const text = String(value || "").toLocaleLowerCase();
  for (const [key, tokens] of Object.entries({
    Amrit:["amrit","अमृत"], Shubh:["shubh","शुभ"], Labh:["labh","लाभ"],
    Char:["char","चल"], Rog:["rog","रोग"], Kaal:["kaal","काल"], Udveg:["udveg","उद्वेग"]
  })) if (tokens.some(token => text.includes(token))) return key;
  return null;
}
function dignityBase(planetName: string, signIndex: number | null): number {
  if (signIndex === null) return 60;
  if (EXALTED_SIGN[planetName] === signIndex) return 95;
  if (DEBILITATED_SIGN[planetName] === signIndex) return 35;
  if (OWN_SIGNS[planetName]?.includes(signIndex)) return 85;
  return 60;
}
function planetConditionScore(planet: { key:string; name?:string; sign:string; house:number|null }, chart: PersonalTimeChartSignal): number {
  const name = canonicalPlanet(planet.key) || canonicalPlanet(planet.name);
  if (!name || !["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"].includes(name)) return 60;
  let score = dignityBase(name, signIndexOf(planet.sign));
  const house = planet.house;
  if (house != null) {
    const afflictions = chart.planets.filter(other => {
      const otherName = canonicalPlanet(other.key) || canonicalPlanet(other.name);
      return otherName !== name && ["Mars","Saturn","Rahu","Ketu"].includes(otherName || "") && other.house === house;
    }).length;
    const beneficConjunction = chart.planets.some(other => {
      const otherName = canonicalPlanet(other.key) || canonicalPlanet(other.name);
      return otherName !== name && ["Jupiter","Venus"].includes(otherName || "") && other.house === house;
    });
    score -= Math.min(18, afflictions * 8);
    if (beneficConjunction) score += 4;
  }
  return Math.max(0, Math.min(100, score));
}
/** A small, documented Lagna-dependent house-ownership heuristic, not a substitute for a full classical functional-lord analysis. */
function functionalLordRoleScore(planetName: string, lagnaIndex: number): number {
  // House numbers are counted from this chart's Lagna, not from Aries.
  const ownedHouses = Array.from({ length: 12 }, (_, index) => index + 1)
    .filter(house => SIGN_LORDS[(lagnaIndex + house - 1) % 12] === planetName);
  let score = 60;
  if (ownedHouses.includes(1)) score += 12;
  if (ownedHouses.includes(5)) score += 8;
  if (ownedHouses.includes(9)) score += 8;
  for (const house of [6,8,12]) if (ownedHouses.includes(house)) score -= 8;
  for (const house of [2,7]) if (ownedHouses.includes(house)) score -= 4;
  // Keep the role modifier bounded. It is a transparent ranking heuristic;
  // full functional lordship rules vary by Lagna and interpretive tradition.
  return Math.max(0, Math.min(100, score));
}
function scoreChartHouseLords(chart: PersonalTimeChartSignal | null, activity: PersonalTimeActivity): number | null {
  if (!chart || !chart.lagnaSign || !chart.planets.length) return null;
  const lagnaIndex = signIndexOf(chart.lagnaSign);
  if (lagnaIndex === null) return null;
  const houseWeights: Record<number, number> = ({
    general: {1:0.6,10:0.2,11:0.2},
    work: {1:0.2,10:0.4,11:0.4},
    study: {1:0.2,4:0.25,5:0.35,9:0.2},
    travel: {1:0.2,3:0.3,9:0.3,12:0.2},
    prayer: {1:0.15,5:0.3,9:0.35,12:0.2},
    meditation: {1:0.15,5:0.3,9:0.3,12:0.25},
    family: {1:0.2,4:0.3,7:0.25,11:0.25}
  } as Record<PersonalTimeActivity, Record<number, number>>)[activity] || {1:0.6,10:0.2,11:0.2};
  const factors = Object.entries(houseWeights).flatMap(([houseText, weight]) => {
    const house = Number(houseText);
    const sign = (lagnaIndex + house - 1) % 12;
    const lord = SIGN_LORDS[sign];
    const planet = chartPlanet(chart, lord);
    if (!planet) return [];
    const dignityAndCondition = planetConditionScore(planet, chart);
    const functionalRole = functionalLordRoleScore(lord, lagnaIndex);
    // Blend observable sign dignity/house affliction with simple functional
    // ownership; never label this as full Shadbala or yoga analysis.
    return [{ score: Math.round(dignityAndCondition * 0.75 + functionalRole * 0.25), weight }];
  });
  if (!factors.length) return null;
  const total = factors.reduce((sum, factor) => sum + factor.weight, 0);
  return Math.round(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0) / total);
}
function savedChartSignal(chart: SavedJanmaPatroContext | null | undefined): PersonalTimeChartSignal | null {
  if (!chart) return null;
  return { lagnaSign: chart.lagna, planets: chart.planets.map(planet => ({ key:planet.key, name:planet.name, sign:planet.sign, house:planet.house })) };
}
function chartLordsScore(input: PersonalTimeWindowInput): {score:number; explanation:string; explanationNe:string} | null {
  const natal = scoreChartHouseLords(savedChartSignal(input.natalChart), input.activity);
  if (natal === null) return null;
  const event = scoreChartHouseLords(input.muhurtaChart || null, input.activity);
  const score = event === null ? natal : Math.round(natal * 0.55 + event * 0.45);
  return {
    score,
    explanation: event === null
      ? "Natal Lagna, 10th-house and 11th-house lords are evaluated using the saved JanmaPatro chart; event-time chart signals were unavailable."
      : "Combines natal and candidate-time relevant house lords using sign dignity, same-house affliction signals and a simple Lagna-dependent functional house-ownership modifier. The saved JanmaPatro profile does not provide verified Ashtakavarga point totals, so they are not scored. This remains a transparent heuristic, not a full Shadbala or yoga calculation.",
    explanationNe: event === null
      ? "सुरक्षित जन्मपत्रोका लग्नेश तथा सम्बन्धित दशौँ/एघारौँ भावेशको राशि-गरिमा प्रयोग गरिएको छ; क्षणिक मुहूर्त कुण्डलीको सङ्केत उपलब्ध थिएन।"
      : "जन्मपत्रो र प्रस्तावित समयको गतिविधिसँग सम्बन्धित भावेशको राशि-गरिमा, समान भावमा रहेका पापग्रहका सङ्केत र लग्नअनुसारको सामान्य भाव-स्वामित्व भूमिका जोडिन्छ। सुरक्षित जन्मपत्रोमा प्रमाणित अष्टकवर्ग अङ्क उपलब्ध नभएकाले ती स्कोर गरिँदैनन्। यो पारदर्शी अनुमान हो, पूर्ण षड्बल वा योग गणना होइन।"
  };
}
function houseFromSign(reference: string | null | undefined, transit: string | null | undefined): number | null {
  const base = signIndexOf(reference), current = signIndexOf(transit);
  return base === null || current === null ? null : ((current - base + 12) % 12) + 1;
}
function gocharaScore(input: PersonalTimeWindowInput): {score:number; explanation:string; explanationNe:string} | null {
  const natal = input.natalChart, transit = input.muhurtaChart;
  if (!natal || !transit) return null;
  const references = [natal.rashi, natal.lagna].filter(sign => signIndexOf(sign) !== null);
  if (!references.length) return null;
  const values: number[] = [];
  const jupiter = chartPlanet(transit, "Jupiter");
  const saturn = chartPlanet(transit, "Saturn");
  if (jupiter) for (const reference of references) {
    const house = houseFromSign(reference, jupiter.sign);
    if (house !== null) values.push([2,5,7,9,11].includes(house) ? 82 : 42);
  }
  if (saturn) for (const reference of references) {
    const house = houseFromSign(reference, saturn.sign);
    if (house !== null) values.push([3,6,11].includes(house) ? 82 : 42);
  }
  if (!values.length) return null;
  return {
    score: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    explanation: "Jupiter and Saturn transit signs are compared with the natal Moon sign and Lagna using a documented traditional house heuristic; these slow-moving signals may be the same across multiple windows.",
    explanationNe: "गोचर गुरु र शनिको राशि जन्म चन्द्र राशि तथा लग्नबाट हेरी परम्परागत भाव-सङ्केत मूल्याङ्कन गरिएको छ। ढिलो चल्ने गोचरका कारण एउटै दिनका धेरै समय झ्यालमा यो अङ्क समान हुन सक्छ।"
  };
}
function dashaHoraScore(input: PersonalTimeWindowInput): {score:number; explanation:string; explanationNe:string} {
  const dasha = canonicalPlanet(input.dashaLord), hora = canonicalPlanet(input.horaLord);
  if (!dasha || !hora) return {score:60, explanation:"A Dasha–Hora compatibility signal is available but the lord name could not be normalized; a neutral score is used.", explanationNe:"दशा–होरा स्वामीको नाम पहिचान भएन; तटस्थ अङ्क प्रयोग गरिएको छ।"};
  let score: number;
  let relation: string;
  if (dasha === hora) { score = 98; relation = "same planet"; }
  else {
    const configured = NATURAL_RELATIONS[dasha];
    if (configured?.friends.includes(hora)) { score = 85; relation = "natural friends"; }
    else if (configured?.enemies.includes(hora)) { score = 35; relation = "natural enemies"; }
    else { score = 60; relation = "neutral or not configured"; }
  }
  const saved = savedChartSignal(input.natalChart);
  const natalDashaPlanet = chartPlanet(saved, dasha);
  if (saved && natalDashaPlanet) {
    const condition = planetConditionScore(natalDashaPlanet, saved);
    if (condition <= 40) score -= condition <= 25 ? 15 : 10;
  }
  score = Math.max(0, Math.min(100, score));
  const explanation = \`Dasha lord \${dasha} and Hora lord \${hora} use the \${relation} relationship score; a low natal dignity/affliction signal for the Dasha lord can reduce it.\`;
  const explanationNe = \`दशा स्वामी \${dasha} र होरा स्वामी \${hora} बीचको \${relation === "same planet" ? "एउटै ग्रह" : relation === "natural friends" ? "प्राकृतिक मित्र" : relation === "natural enemies" ? "प्राकृतिक शत्रु" : "तटस्थ/अपरिभाषित"} सम्बन्ध मूल्याङ्कन गरिएको छ; कमजोर जन्मकुण्डलीय गरिमा वा पीडित अवस्थाले दशा अङ्क घटाउन सक्छ।\`;
  return { score, explanation, explanationNe };
}
function activityChoghadiyaBonus(activity: PersonalTimeActivity, type: string | null | undefined): number {
  const key = choghadiyaKey(type);
  return key ? (CHOGHADIYA_ACTIVITY_BONUS[activity][key] || 0) : 0;
}

export function evaluatePersonalTime(input: PersonalTimeWindowInput): PersonalTimeEvaluation {
  const start = Date.parse(input.startUtc), end = Date.parse(input.endUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("invalid_window");
  if (!validScore(input.panchangScore)) throw new Error("invalid_panchang_score");
  const weights = ACTIVITY_WEIGHTS[input.activity] || ACTIVITY_WEIGHTS.general;
  const choghadiyaBonus = activityChoghadiyaBonus(input.activity, input.choghadiyaType);
  const adjustedPanchang = Math.max(0, Math.min(100, input.panchangScore + choghadiyaBonus));
  const components: PersonalTimeComponent[] = [{
    key: "panchang", score: adjustedPanchang, weight: weights.panchang,
    explanation: choghadiyaBonus
      ? \`Panchang score includes the base timing score and a \${choghadiyaBonus}-point \${input.activity}-specific Choghadiya preference adjustment.\`
      : "Panchang timing score, including applicable Choghadiya, caution windows and available Tara/Chandra Bala.",
    explanationNe: choghadiyaBonus
      ? \`मूल पञ्चाङ्ग स्कोरमा \${choghadiyaBonus} अङ्कको गतिविधि-अनुसार चौघडिया प्राथमिकता समायोजन जोडिएको छ।\`
      : "पञ्चाङ्ग स्कोरमा लागू चौघडिया, सावधानी समय र उपलब्ध ताराबल/चन्द्रबल समावेश छन्।"
  }];
  const domain = ACTIVITY_DOMAIN[input.activity];
  const readingScore = domain ? domainScore(input.rashifal, domain) : null;
  if (readingScore !== null) components.push({
    key: "rashifal", score: readingScore, weight: weights.rashifal,
    explanation: \`Daily Rashifal's published \${domain} domain score is applied to this matching activity.\`,
    explanationNe: "छानिएको गतिविधिसँग मिल्ने दैनिक राशिफल डोमेनको उपलब्ध स्कोर समावेश गरिएको छ।"
  });
  if (input.dashaLord && input.horaLord) {
    const result = dashaHoraScore(input);
    components.push({
      key: "dasha-hora", score: result.score, weight: weights["dasha-hora"],
      explanation: result.explanation, explanationNe: result.explanationNe
    });
  }
  const lords = chartLordsScore(input);
  if (lords) components.push({
    key: "chart-lords", score: lords.score, weight: weights["chart-lords"],
    explanation: lords.explanation, explanationNe: lords.explanationNe
  });
  if (input.activity !== "general" && input.horaLord) {
    const preferred = HORA_PREFERENCES[input.activity];
    components.push({
      key: "activity-hora", score: preferred.includes(input.horaLord) ? 100 : 50, weight: weights["activity-hora"],
      explanation: preferred.includes(input.horaLord)
        ? \`\${input.horaLord} Hora matches the selected \${input.activity} activity's traditional preference.\`
        : \`\${input.horaLord} Hora is not in the selected \${input.activity} activity's preferred list; treated as neutral, not harmful.\`,
      explanationNe: "छानिएको गतिविधिका लागि ग्रह-होरा परम्परागत रूपमा कति उपयुक्त छ भन्ने मूल्याङ्कन गरिएको छ; नमिलेकोलाई हानिकारक मानिएको छैन।"
    });
  }
  if (input.activity !== "general" && input.tatwa) {
    const preferred = TATWA_PREFERENCES[input.activity];
    components.push({
      key: "activity-tatwa", score: preferred.includes(input.tatwa) ? 100 : 55, weight: weights["activity-tatwa"],
      explanation: preferred.includes(input.tatwa)
        ? \`\${input.tatwa} Tatwa matches the selected \${input.activity} activity's traditional preference.\`
        : \`\${input.tatwa} Tatwa does not match the preferred list for \${input.activity}; this is a weak fit, not a prohibition.\`,
      explanationNe: "छानिएको गतिविधिसँग पञ्चतत्त्वको परम्परागत मेल मूल्याङ्कन गरिएको छ; नमिल्नु निषेधको संकेत होइन।"
    });
  }
  const gochara = gocharaScore(input);
  if (gochara) components.push({
    key: "gochara", score: gochara.score, weight: weights.gochara,
    explanation: gochara.explanation, explanationNe: gochara.explanationNe
  });
  const weightTotal = components.reduce((sum, item) => sum + item.weight, 0);
  const weightedScore = Math.round(components.reduce((sum, item) => sum + item.score * item.weight, 0) / weightTotal);
  // A strong traditional caution is a ranking constraint, not a small penalty
  // that unrelated Rashifal/Hora components may cancel out.
  const cautionSet = new Set(input.panchangCautions || []);
  const score = cautionSet.has("rahu_kaal") ? Math.min(weightedScore, 44)
    : cautionSet.has("yamaganda") ? Math.min(weightedScore, 54)
    : cautionSet.has("gulika") ? Math.min(weightedScore, 59)
    : weightedScore;
  const missing: string[] = [];
  if (!input.hasNatalChart) missing.push("birth-chart");
  else if (!input.natalFactorsApplied) missing.push("natal-compatibility");
  if (!lords) missing.push("chart-lords");
  if (!gochara) missing.push("gochara");
  if (readingScore === null) missing.push("matching-rashifal-domain");
  if (!input.dashaLord) missing.push("active-dasha");
  if (!input.horaLord) missing.push("hora");
  if (!input.tatwa) missing.push("tantra-tatwa");
  const normalizedComponents = components.map(item => ({
    ...item, weight: Math.round((item.weight / weightTotal) * 1000) / 10
  }));
  const personalizedSignals = normalizedComponents.some(item => ["rashifal","dasha-hora","chart-lords","gochara"].includes(item.key));
  // A connected JanmaPatro profile is itself a valid personal context. Missing
  // optional signals are reported in the breakdown instead of downgrading the
  // connected profile to a "limited signal" user state.
  const confidence = input.hasNatalChart
    ? "personalized"
    : personalizedSignals ? "partially-personalized" : "general";
  const reasons = [...(input.panchangReasons || [])];
  const cautions = [...(input.panchangCautions || [])];
  if (choghadiyaBonus) reasons.push("activity_specific_choghadiya_fit");
  if (score !== weightedScore) cautions.push("traditional_caution_caps_overall_rank");
  for (const component of normalizedComponents.slice(1)) reasons.push(component.explanation);
  return {
    score, label: score >= 75 ? "supportive" : score >= 45 ? "mixed" : "caution",
    confidence, components: normalizedComponents, reasons, cautions, missing
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
