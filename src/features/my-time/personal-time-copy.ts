import type { PersonalTimeComponent, PersonalTimeEvaluation } from "./personal-time-engine";
import { dedupeDisplayStrings } from "./personal-time-utils";

type BilingualCopy = readonly [ne: string, en: string];

const ACTIVITY_LABELS: Record<string, BilingualCopy> = {
  general: ["सामान्य", "General"],
  work: ["काम / व्यवसाय", "Work / business"],
  study: ["अध्ययन", "Study"],
  travel: ["यात्रा", "Travel"],
  prayer: ["पूजा / आध्यात्मिक अभ्यास", "Prayer / spiritual practice"],
  meditation: ["ध्यान", "Meditation"],
  family: ["परिवार / व्यक्तिगत काम", "Family / personal plans"]
};

const COMPONENT_LABELS: Record<string, BilingualCopy> = {
  panchang: ["पञ्चाङ्ग र शुभ समय", "Panchang & timing"],
  rashifal: ["सम्बन्धित राशिफल", "Matching Rashifal"],
  "dasha-hora": ["दशा–होरा अनुकूलता", "Dasha–Hora compatibility"],
  "natal-bala": ["तारा बल र चन्द्र बल", "Tara Bala & Chandra Bala"],
  "chart-lords": ["लग्न तथा कार्य-सम्बन्धित भावका स्वामी", "Lagna & activity-house lords"],
  gochara: ["बृहस्पति–शनि गोचर", "Jupiter–Saturn Gochara"],
  "activity-hora": ["कार्यअनुसार होरा", "Activity–Hora fit"],
  "activity-tatwa": ["कार्यअनुसार तत्त्व", "Activity–Tatwa fit"]
};

const KNOWN_COMPONENTS = new Set(Object.keys(COMPONENT_LABELS));

export function personalActivityLabel(activity: string, language: string): string {
  const values = ACTIVITY_LABELS[activity];
  if (!values) return language === "ne" ? `अज्ञात गतिविधि (${activity})` : `Unknown activity (${activity})`;
  return values[language === "ne" ? 0 : 1];
}

export function personalComponentLabel(key: string, language: string): string {
  const values = COMPONENT_LABELS[key];
  if (!values) return language === "ne" ? `अपरिचित मूल्याङ्कन घटक (${key})` : `Unrecognized scoring component (${key})`;
  return values[language === "ne" ? 0 : 1];
}

function planetLabel(value: string): string {
  const planets: Record<string, string> = {
    Sun: "सूर्य", Moon: "चन्द्र", Mars: "मङ्गल", Mercury: "बुध",
    Jupiter: "बृहस्पति", Venus: "शुक्र", Saturn: "शनि"
  };
  return planets[value] || value;
}

function tatwaLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("prithvi")) return "पृथ्वी";
  if (normalized.includes("tejas") || normalized.includes("agni")) return "तेज / अग्नि";
  if (normalized.includes("vayu")) return "वायु";
  if (normalized.includes("akash")) return "आकाश";
  if (normalized.includes("aap") || normalized.includes("jala")) return "जल";
  return value;
}

function translateHoraExplanation(source: string): string | null {
  const match = source.match(/^(.+?) Hora is (a traditional preference|not the preferred Hora; treated as neutral, not harmful) for ([a-z]+)\.$/);
  if (!match) return null;
  const planet = planetLabel(match[1]);
  const activity = personalActivityLabel(match[3], "ne");
  const fit = match[2] === "a traditional preference"
    ? "परम्परागत प्राथमिकता होरा हो"
    : "प्राथमिकता होरा होइन; तटस्थ मानिन्छ, हानिकारक होइन";
  return `${activity} का लागि ${planet} होरा ${fit}।`;
}

function translateTatwaExplanation(source: string): string | null {
  const match = source.match(/^(.+?) Tatwa (matches|does not match) the traditional preference for ([a-z]+); this is a weak contextual signal\.$/);
  if (!match) return null;
  const activity = personalActivityLabel(match[3], "ne");
  const fit = match[2] === "matches" ? "परम्परागत प्राथमिकतासँग मेल खान्छ" : "परम्परागत प्राथमिकतासँग मेल खाँदैन";
  return `${activity} का लागि ${tatwaLabel(match[1])} तत्त्व ${fit}। यो कमजोर सन्दर्भ सङ्केत मात्र हो, निषेध वा हानिको दाबी होइन।`;
}

function componentSources(component: PersonalTimeComponent): string[] {
  return dedupeDisplayStrings(component.activityExplanations?.length ? component.activityExplanations : [component.explanation]);
}

/** One bilingual definition for all MyTime surfaces; unknown keys never masquerade as Tantra. */
export function personalComponentExplanation(component: PersonalTimeComponent, language: string): string {
  const key = component.key;
  const original = component.explanation;
  if (!KNOWN_COMPONENTS.has(key)) {
    return language === "ne"
      ? `यस मूल्याङ्कन घटक (${key}) का लागि व्याख्या उपलब्ध छैन।`
      : `No explanation is configured for scoring component "${key}".`;
  }

  const sources = componentSources(component);
  if (language !== "ne") return sources.length > 1 ? sources.join(" ") : original;

  if (key === "panchang") return "पञ्चाङ्ग, चौघडिया र सावधानी समयको संयुक्त मूल्याङ्कन। राहुकाल, यमगण्ड र गुलिकाका परम्परागत सावधानीले अङ्कमा अधिकतम सीमा लगाउन सक्छन्।";
  if (key === "rashifal") return "उपलब्ध दैनिक राशिफलको सम्बन्धित क्षेत्रको अङ्क मात्र प्रयोग गरिएको छ; मिल्ने क्षेत्र नभए यो अंश भारमा समावेश हुँदैन।";
  if (key === "dasha-hora") {
    const match = original.match(/^(.+?) Dasha with (.+?) Hora: (.+?) graded at (\d+)\/100(.*)$/);
    if (!match) return "चलिरहेको विम्शोत्तरी दशा स्वामी र उम्मेदवार समयको होरा स्वामीलाई प्राकृतिक मित्रता, तटस्थता वा शत्रुताका आधारमा तुलना गरिएको छ।";
    const relation = match[3] === "same planet" ? "एउटै ग्रह" : match[3] === "natural friend" ? "प्राकृतिक मित्र" : match[3] === "natural enemy" ? "प्राकृतिक शत्रु" : "तटस्थ सम्बन्ध";
    const penalty = match[5].includes("reduced") ? " जन्मपत्रोका भाव, नीच राशि वा युति-सावधानीका कारण अतिरिक्त कटौती गरिएको छ।" : "";
    return `${planetLabel(match[1])} दशा र ${planetLabel(match[2])} होरा: ${relation} (${match[4]}/100)।${penalty} यो परम्परागत ज्योतिषीय नियम हो, वैज्ञानिक मापन होइन।`;
  }
  if (key === "natal-bala") {
    const parts: string[] = [];
    const tara = original.match(/(Janma|Sampat|Vipat|Kshema|Pratyari|Sadhaka|Naidhana|Mitra|Atimitra|Parama Mitra) Tara Bala/);
    const moon = original.match(/house (\d+)/);
    if (tara) parts.push(({ Janma: "जन्म", Sampat: "सम्पत्", Vipat: "विपत्", Kshema: "क्षेम", Pratyari: "प्रत्यरि", Sadhaka: "साधक", Naidhana: "नैधन", Mitra: "मित्र", Atimitra: "अतिमित्र", "Parama Mitra": "परम मित्र" } as Record<string, string>)[tara[1]] + " तारा बल");
    if (moon) parts.push(`जन्म चन्द्रबाट ${moon[1]}औँ भावको चन्द्र बल`);
    return parts.length ? parts.join(" र ") + " को परम्परागत सापेक्ष सङ्केत हो।" : "उपलब्ध तारा बल र चन्द्र बलको परम्परागत तुलना।";
  }
  if (key === "chart-lords") {
    const houseGroups = dedupeDisplayStrings(sources.map(source => source.match(/\(([\d, ]+)\)/)?.[1] || "").filter(Boolean));
    const match = original.match(/\(([\d, ]+)\)/);
    if (houseGroups.length > 1) {
      return `छानिएका गतिविधिहरूसँग सम्बन्धित कार्य-भावका स्वामीहरूको संयुक्त मूल्याङ्कन (सम्बन्धित भाव: ${houseGroups.map(houses => `भाव ${houses}`).join("; ")}). यो पारम्परिक ज्योतिषीय सूचक हो।`;
    }
    return "तपाईंको जन्म लग्न र यस उम्मेदवार समयको लग्नबाट सम्बन्धित कार्यका भाव स्वामी, तिनको भावस्थिति र राशि बल हेरिन्छ" +
      (match ? ` (भाव ${match[1].replace(/, /g, ", ")})` : "") + "। यो पारम्परिक नियममा आधारित सूचक हो।";
  }
  if (key === "gochara") {
    const match = original.match(/Jupiter transits (\d+)th and Saturn (\d+)th from natal Moon/);
    return match
      ? `जन्म चन्द्र राशिबाट बृहस्पति ${match[1]}औँ र शनि ${match[2]}औँ भावमा पर्ने गोचरको परम्परागत तुलना। यो निश्चित भविष्यवाणी होइन।`
      : "जन्म चन्द्र राशिबाट बृहस्पति र शनिको गोचरको परम्परागत तुलना; उपलब्ध तथ्य नभए यो अंश हटाइन्छ।";
  }
  if (key === "activity-hora") {
    const translated = dedupeDisplayStrings(sources.map(translateHoraExplanation).filter((value): value is string => Boolean(value)));
    return translated.length ? translated.join(" ") : "छानिएका गतिविधिका लागि होराको परम्परागत उपयुक्तता तुलना गरिएको छ; नमिल्दा पनि यसलाई निषेध वा हानि मानिँदैन।";
  }
  if (key === "activity-tatwa") {
    const translated = dedupeDisplayStrings(sources.map(translateTatwaExplanation).filter((value): value is string => Boolean(value)));
    return translated.length ? translated.join(" ") : "छानिएका गतिविधिका लागि पञ्चतत्त्वको परम्परागत मेल हेरिन्छ। यो कमजोर सन्दर्भ सङ्केत हो, निषेध वा हानि होइन।";
  }
  return original;
}

/** Aggregates a component across selected activities without discarding activity-specific evidence. */
export function aggregatePersonalTimeComponents(
  evaluations: readonly Pick<PersonalTimeEvaluation, "components">[]
): PersonalTimeComponent[] {
  if (!evaluations.length) return [];
  const componentKeys = [...new Set(evaluations.flatMap(item => item.components.map(component => component.key)))];
  return componentKeys.flatMap(key => {
    const present = evaluations
      .map(item => item.components.find(component => component.key === key))
      .filter((item): item is PersonalTimeComponent => Boolean(item));
    if (!present.length) return [];
    const totalWeight = present.reduce((sum, item) => sum + item.weight, 0);
    const activityExplanations = dedupeDisplayStrings(present.flatMap(item =>
      item.activityExplanations?.length ? item.activityExplanations : [item.explanation]
    ));
    return [{
      ...present[0],
      score: totalWeight
        ? Math.round(present.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight)
        : present[0].score,
      weight: Math.round((present.reduce((sum, item) => sum + item.weight, 0) / evaluations.length) * 10) / 10,
      activityExplanations
    }];
  });
}
