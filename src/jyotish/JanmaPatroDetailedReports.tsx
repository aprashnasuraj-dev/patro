import type { ReactNode } from "react";
import { adToBs } from "../../packages/core/src/bsDate";
import { NAKSHATRAS as NAKSHATRA_META } from "../../packages/engine/src/constants.js";
import { KARANA_NAMES, NAKSHATRAS as NAKSHATRAS_NE, RASHIS as RASHIS_NE, BS_MONTHS, WEEKDAYS, YOGAS as YOGAS_NE, toNepaliDigits, tithiName } from "../patro-tools/core/names";
import { panchangAt } from "../patro-tools/core/astro";
import { nameSyllableFromNakshatra } from "../../packages/engine/src/name-guna.js";
import type { ChartResult, GunaItem, GunaResult, PlanetPosition } from "./jyotishEngine";
import "./janmapatro-detailed.css";

export type ReportLanguage = "ne" | "en";
export const BIRTH_REPORT_PAGE_COUNT = 12;
export const GUNA_REPORT_PAGE_COUNT = 12;

const TITHI_NAMES_EN = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"] as const;
const YOGA_NAMES_EN = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"] as const;
const KARANA_NAMES_EN = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti (Bhadra)", "Shakuni", "Chatushpada", "Naga", "Kimstughna"] as const;

export const BIRTH_REPORT_PAGE_TITLES_NE = [
  "श्रीगणेश वन्दना तथा जन्मपत्रिका",
  "जन्म विवरण तथा काल-निर्धारण",
  "जन्मकालीन पञ्चाङ्ग विवरण",
  "जन्म राशि, नक्षत्र तथा नामाक्षर",
  "लग्न कुण्डली तथा द्वादश भाव",
  "चन्द्र कुण्डली तथा मनोभाव",
  "नवग्रहको गणितीय स्थिति",
  "ग्रहस्थिति तथा परम्परागत अर्थ",
  "विंशोत्तरी महादशा",
  "मङ्गल दोष तथा विशेष विचार",
  "जन्मपत्रिकाको समग्र संश्लेषण",
  "गणना पद्धति तथा प्रतिवेदनको सीमा",
] as const;

export const GUNA_REPORT_PAGE_TITLES_NE = [
  "श्रीगणेश वन्दना तथा विवाह गुण मिलान",
  "दुवै व्यक्तिको जन्म विवरण",
  "पहिलो व्यक्तिको जन्म-सङ्केत",
  "दोस्रो व्यक्तिको जन्म-सङ्केत",
  "अष्टकूटको समग्र अङ्क",
  "वर्ण तथा वश्य कूट",
  "तारा तथा योनि कूट",
  "ग्रह मैत्री तथा गण कूट",
  "भकूट तथा नाडी कूट",
  "दुवै व्यक्तिको कुण्डली तुलना",
  "मङ्गल दोष तथा दशा-सन्दर्भ",
  "मिलानको निष्कर्ष तथा पद्धति",
] as const;

const NE = {
  planets: { sun: "सूर्य", moon: "चन्द्र", mars: "मङ्गल", mercury: "बुध", jupiter: "बृहस्पति", venus: "शुक्र", saturn: "शनि", rahu: "राहु", ketu: "केतु" } as Record<string, string>,
  short: { sun: "सू", moon: "चं", mars: "मं", mercury: "बु", jupiter: "गु", venus: "शु", saturn: "श", rahu: "रा", ketu: "के" } as Record<string, string>,
  gana: ["देव", "मनुष्य", "राक्षस"],
  nadi: ["आदि", "मध्य", "अन्त्य"],
  yoni: ["अश्व", "गज", "मेष", "सर्प", "श्वान", "मार्जार", "मूषक", "गौ", "महिष", "व्याघ्र", "मृग", "वानर", "नकुल", "सिंह"],
  element: ["अग्नि", "पृथ्वी", "वायु", "जल"],
  quality: ["चर", "स्थिर", "द्विस्वभाव"],
  house: [
    "तनु भाव — शरीर, व्यक्तित्व तथा आरम्भ",
    "धन भाव — वाणी, परिवार तथा सञ्चित साधन",
    "सहज भाव — साहस, प्रयास तथा सहोदर",
    "सुख भाव — गृह, मातृ-सन्दर्भ तथा आन्तरिक आधार",
    "पुत्र भाव — सिर्जना, विद्या तथा अभिव्यक्ति",
    "रिपु भाव — सेवा, अनुशासन तथा चुनौती",
    "कलत्र भाव — साझेदारी तथा वैवाहिक सम्बन्ध",
    "आयु भाव — रूपान्तरण, गोपनीयता तथा अनिश्चितता",
    "धर्म भाव — गुरु, उच्च अध्ययन तथा विश्वास",
    "कर्म भाव — कार्य, दायित्व तथा सार्वजनिक भूमिका",
    "लाभ भाव — समुदाय, उपलब्धि तथा आकाङ्क्षा",
    "व्यय भाव — विश्राम, एकान्त तथा त्याग",
  ],
  houseShort: ["तनु", "धन", "सहज", "सुख", "पुत्र", "रिपु", "कलत्र", "आयु", "धर्म", "कर्म", "लाभ", "व्यय"],
  traits: {
    sun: "आत्मबल, नेतृत्व, प्रतिष्ठा तथा उत्तरदायित्व",
    moon: "मन, संवेदना, स्मरण तथा दैनिक अनुभूति",
    mars: "साहस, ऊर्जा, प्रतिस्पर्धा तथा कार्यगत पहल",
    mercury: "बुद्धि, भाषा, लेखन, व्यापार तथा विश्लेषण",
    jupiter: "ज्ञान, गुरु, नीति, विस्तार तथा मार्गदर्शन",
    venus: "कला, सौन्दर्य, सम्बन्ध, सुविधा तथा रुचि",
    saturn: "अनुशासन, धैर्य, श्रम, सीमा तथा दीर्घकालीन प्रयास",
    rahu: "असामान्य आकाङ्क्षा, नवीनता तथा तीव्र चाहना",
    ketu: "वैराग्य, अन्तर्मुखता, पृथकीकरण तथा आध्यात्मिक खोज",
  } as Record<string, string>,
  signNature: [
    "आरम्भशील र अग्रसर", "स्थिरता र निरन्तरतासँग सम्बन्धित", "अनुकूलन र द्वैध दृष्टिसँग सम्बन्धित",
    "संरक्षण र संवेदनशीलतासँग सम्बन्धित", "आत्म-अभिव्यक्ति र प्रतिष्ठासँग सम्बन्धित", "विश्लेषण र व्यवस्थित प्रयाससँग सम्बन्धित",
    "सन्तुलन र साझेदारीसँग सम्बन्धित", "गहिराइ र रूपान्तरणसँग सम्बन्धित", "विस्तार र अन्वेषणसँग सम्बन्धित",
    "व्यवस्था र दीर्घकालीन लक्ष्यसँग सम्बन्धित", "विचार र समूहगत दृष्टिसँग सम्बन्धित", "कल्पना र करुणासँग सम्बन्धित",
  ],
};
const EN = {
  planets: { sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter", venus: "Venus", saturn: "Saturn", rahu: "Rahu", ketu: "Ketu" } as Record<string, string>,
  short: { sun: "Su", moon: "Mo", mars: "Ma", mercury: "Me", jupiter: "Ju", venus: "Ve", saturn: "Sa", rahu: "Ra", ketu: "Ke" } as Record<string, string>,
  gana: ["Deva", "Manushya", "Rakshasa"],
  nadi: ["Adi", "Madhya", "Antya"],
  yoni: ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"],
  element: ["Fire", "Earth", "Air", "Water"],
  quality: ["Movable", "Fixed", "Dual"],
  house: [
    "First house — body, temperament and beginnings",
    "Second house — speech, family and accumulated resources",
    "Third house — courage, effort and siblings",
    "Fourth house — home, mother and inner foundations",
    "Fifth house — creativity, learning and expression",
    "Sixth house — service, discipline and challenges",
    "Seventh house — partnership and marriage",
    "Eighth house — transformation, privacy and uncertainty",
    "Ninth house — teachers, higher learning and beliefs",
    "Tenth house — work, duty and public role",
    "Eleventh house — community, gains and aspirations",
    "Twelfth house — rest, solitude and letting go",
  ],
  houseShort: ["Self", "Wealth", "Effort", "Home", "Creativity", "Service", "Partnership", "Change", "Wisdom", "Career", "Gains", "Solitude"],
  traits: {
    sun: "Identity, leadership, recognition and responsibility",
    moon: "Mind, sensitivity, memory and daily experience",
    mars: "Courage, energy, competition and initiative",
    mercury: "Reasoning, language, writing, trade and analysis",
    jupiter: "Learning, teachers, ethics, growth and guidance",
    venus: "Art, beauty, relationships, comfort and preference",
    saturn: "Discipline, patience, work, boundaries and sustained effort",
    rahu: "Unusual ambitions, novelty and intense desire",
    ketu: "Detachment, introspection, separation and spiritual inquiry",
  } as Record<string, string>,
  signNature: [
    "associated with initiative and beginnings", "associated with stability and continuity", "associated with adaptation and dual perspective",
    "associated with protection and sensitivity", "associated with expression and recognition", "associated with analysis and method",
    "associated with balance and partnership", "associated with depth and transformation", "associated with expansion and exploration",
    "associated with structure and long-term goals", "associated with ideas and group perspective", "associated with imagination and compassion",
  ],
};

function tx(language: ReportLanguage, ne: string, en: string): string {
  return language === "ne" ? ne : en;
}
function digits(value: string | number, language: ReportLanguage): string {
  return language === "ne" ? toNepaliDigits(value) : String(value);
}
function dateInputFromInstant(date: Date): string {
  return new Date(date.getTime() + 345 * 60000).toISOString().slice(0, 10);
}
function bsDateText(value: string | Date, language: ReportLanguage): string {
  try {
    const date = adToBs(value instanceof Date ? dateInputFromInstant(value) : value);
    const month = BS_MONTHS[date.month - 1];
    return language === "ne"
      ? "वि.सं. " + digits(date.year, language) + " " + month + " " + digits(date.day, language) + " गते"
      : "BS " + date.year + "-" + String(date.month).padStart(2, "0") + "-" + String(date.day).padStart(2, "0");
  } catch {
    return tx(language, "वि.सं. मिति उपलब्ध छैन", "BS date unavailable for this supported range");
  }
}
function adDateText(value: string | Date, language: ReportLanguage): string {
  const iso = value instanceof Date ? dateInputFromInstant(value) : value;
  if (language === "en") return iso;
  return "ई.सं. " + toNepaliDigits(iso);
}
function displayDegree(longitude: number, language: ReportLanguage): string {
  const within = ((longitude % 30) + 30) % 30;
  const degree = Math.floor(within);
  const minutes = Math.floor((within - degree) * 60);
  return digits(degree, language) + "° " + digits(minutes, language) + "′";
}
function grahaName(key: string, language: ReportLanguage): string {
  return (language === "ne" ? NE.planets : EN.planets)[key] || key;
}
function signName(index: number, language: ReportLanguage): string {
  return language === "ne" ? (RASHIS_NE[index] || "—") : (["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"][index] || "—");
}
function nakshatraName(index: number, language: ReportLanguage): string {
  return language === "ne" ? (NAKSHATRAS_NE[index] || "—") : (NAKSHATRA_META[index]?.en || "—");
}
function grahaKey(planet: PlanetPosition): string {
  return planet.key || planet.name.toLowerCase();
}
function planetarySignification(planet: PlanetPosition, language: ReportLanguage): string {
  const traits = (language === "ne" ? NE.traits : EN.traits)[grahaKey(planet)] || tx(language, "परम्परागत ग्रह-सन्दर्भ", "traditional planetary associations");
  const sign = signName(planet.signIndex, language);
  const house = (language === "ne" ? NE.house : EN.house)[Math.max(0, Math.min(11, planet.house - 1))];
  const nature = (language === "ne" ? NE.signNature : EN.signNature)[planet.signIndex] || "";
  return language === "ne"
    ? grahaName(planet.key, language) + " लाई परम्परागत ज्योतिषमा " + traits + " सँग जोडिन्छ। यस जन्मपत्रिकामा यसको स्थिति " + sign + " राशिको " + displayDegree(planet.longitude, language) + " अंश र " + digits(planet.house, language) + " (" + NE.houseShort[planet.house - 1] + ") भावमा देखाइएको छ। " + sign + " राशि " + nature + "। यो व्याख्या परम्परागत प्रतीकात्मक अर्थ हो, व्यक्तिको स्वभाव वा भविष्यबारे निश्चित दाबी होइन।"
    : grahaName(planet.key, language) + " is traditionally associated with " + traits + ". In this chart it is placed in " + sign + " at " + displayDegree(planet.longitude, language) + " within the sign and the " + planet.house + " (" + EN.houseShort[planet.house - 1] + ") house. This sign is " + nature + ". These are traditional symbolic associations, not certain claims about a person's character or future.";
}
function reportPageNumber(n: number, language: ReportLanguage, total: number): string {
  return digits(n, language) + " / " + digits(total, language);
}
function Page({ number, total, title, language, children, cover = false, eyebrow }: {
  number: number; total: number; title: string; language: ReportLanguage; children: ReactNode; cover?: boolean; eyebrow: string;
}) {
  return <section className={"jpr-page" + (cover ? " jpr-page--cover" : "")} data-jpr-page={number} data-jpr-total={total} data-jpr-jpg-summary={cover ? "true" : undefined}>
    <header className="jpr-page-head">
      <span className="jpr-eyebrow">{eyebrow}</span>
      <span className="jpr-page-index">{reportPageNumber(number, language, total)}</span>
    </header>
    <div className="jpr-page-body">
      {cover ? <div className="jpr-cover-mark" aria-hidden="true">॥ श्री ॥</div> : null}
      <h2>{title}</h2>
      <div className="jpr-rule" />
      {children}
    </div>
    <footer className="jpr-page-foot">
      <span>{tx(language, "आफ्नै पात्रो · परम्परागत ज्योतिषीय प्रतिवेदन", "Aafnai Patro · Traditional astrology report")}</span>
      <span>{reportPageNumber(number, language, total)}</span>
    </footer>
  </section>;
}
function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={"jpr-panel " + className}><h3>{title}</h3>{children}</section>;
}
function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <article className="jpr-metric"><span>{label}</span><strong>{value}</strong>{note ? <small>{note}</small> : null}</article>;
}
function Bullet({ title, children }: { title: string; children: ReactNode }) {
  return <article className="jpr-bullet"><h4>{title}</h4><p>{children}</p></article>;
}
function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return <div className="jpr-kv"><dt>{label}</dt><dd>{value}</dd></div>;
}
function KootaCard({ item, language }: { item: GunaItem; language: ReportLanguage }) {
  const definitions: Record<string, [string, string, string, string]> = {
    varna: ["वर्ण कूट", "चन्द्र राशिबाट परम्परागत वर्ण-वर्गीकरणले स्वभावगत प्राथमिकता र पारस्परिक सम्मानबारे प्रतीकात्मक सन्दर्भ दिन्छ।", "Varna Koota", "Traditional classification from the Moon signs provides a symbolic reference about temperament and mutual respect."],
    vashya: ["वश्य कूट", "राशिगत समूहको परम्परागत वर्गीकरणमा आधारित यो कूटले पारस्परिक प्रभाव तथा अनुकूलताको प्रतीकात्मक पक्ष हेर्छ।", "Vashya Koota", "This sign-group classification considers symbolic themes of mutual influence and adaptability."],
    tara: ["तारा कूट", "दुवै जन्म नक्षत्रबीचको दूरीलाई नवतारा चक्रमा तुलना गरिन्छ। यस प्रतिवेदनले हालको गणनाबाट आएको अङ्क मात्र देखाउँछ।", "Tara Koota", "The distance between the birth Nakshatras is compared within the ninefold Tara cycle. This report displays the current engine's score."],
    yoni: ["योनि कूट", "नक्षत्रसँग जोडिएको परम्परागत प्रतीकात्मक योनि वर्गका आधारमा मिलान गरिन्छ। यसलाई वास्तविक व्यक्तिको चरित्र वा सम्बन्धको निश्चित प्रमाण मान्नु हुँदैन।", "Yoni Koota", "This is based on the traditional symbolic animal category associated with Nakshatras, not proof of a person's character or relationship outcome."],
    maitri: ["ग्रह मैत्री कूट", "चन्द्र राशिका स्वामी ग्रहबीचको परम्परागत मैत्रीलाई तुलना गरिन्छ। अङ्क हालको ग्रह-मैत्री तालिका र मिलान नियमबाट लिइएको हो।", "Graha Maitri Koota", "This compares traditional friendship between the lords of the Moon signs. The score comes from the existing friendship table and rules."],
    gana: ["गण कूट", "नक्षत्रको देव, मनुष्य वा राक्षस समूहको परम्परागत वर्गीकरणबाट गुण-मिलानको एउटा पक्ष प्रस्तुत हुन्छ; नामलाई नैतिक निर्णयका रूपमा प्रयोग गर्नु हुँदैन।", "Gana Koota", "This compares the traditional Deva, Manushya or Rakshasa Nakshatra grouping; the labels are not moral judgments."],
    bhakoot: ["भकूट कूट", "दुवै चन्द्र राशिबीचको दूरीका आधारमा परम्परागत भकूट सम्बन्ध हेरिन्छ। विभिन्न परम्परा र पद्धतिमा अपवाद तथा शमनका व्याख्या फरक हुन सक्छन्।", "Bhakoot Koota", "This examines the traditional relationship between the two Moon signs. Traditions can differ about exceptions and cancellation rules."],
    nadi: ["नाडी कूट", "जन्म नक्षत्रबाट प्राप्त नाडी समूह तुलना गरिन्छ। प्रस्तुत अङ्क हालको कार्यान्वयनको नाडी तालिकाबाट आएको हो; यसलाई स्वास्थ्यसम्बन्धी निदान मान्नु हुँदैन।", "Nadi Koota", "This compares the Nadi groups assigned to the birth Nakshatras. It is not a medical assessment."],
  };
  const d = definitions[item.key] || [item.label, item.detail, item.label, item.detail];
  const label = language === "ne" ? d[0] : d[2];
  const meaning = language === "ne" ? d[1] : d[3];
  const scoreValue = Number(item.score.toFixed(2));
  const maxValue = item.max;
  const percent = maxValue > 0 ? Math.max(0, Math.min(100, scoreValue / maxValue * 100)) : 0;
  const status = scoreValue >= maxValue ? tx(language, "पूर्ण अङ्क", "Full points") : scoreValue <= 0 ? tx(language, "यस कूटमा अङ्क प्राप्त भएन", "No points in this koota") : tx(language, "आंशिक अङ्क", "Partial points");
  return <article className="jpr-koota">
    <header><div><span>{label}</span><small>{tx(language, "परम्परागत अष्टकूट", "Traditional Ashtakoota")}</small></div><strong>{digits(scoreValue, language)} / {digits(maxValue, language)}</strong></header>
    <div className="jpr-score-track" aria-label={label + ": " + scoreValue + " of " + maxValue}><span style={{ width: percent + "%" }} /></div>
    <p>{meaning}</p>
    <p className="jpr-score-status"><strong>{status}.</strong> {language === "ne"
      ? "यो कूटको परिणाम समग्र परम्परागत मिलानको एउटा अंश हो; एकल अङ्कबाट विवाह वा सम्बन्धको सफलता निश्चित हुँदैन।"
      : "This is one part of a traditional matching framework; one score cannot determine the success of a marriage or relationship."}</p>
  </article>;
}
function KundaliDiagram({ chart, anchorSign, moonChart, language, title }: {
  chart: ChartResult; anchorSign: number; moonChart: boolean; language: ReportLanguage; title: string;
}) {
  const labels: [number, number][] = [[150,75],[75,32],[32,75],[75,150],[32,225],[75,268],[150,225],[225,268],[268,225],[225,150],[268,75],[225,32]];
  const houses = Array.from({ length: 12 }, (_, i) => {
    const signIndex = (anchorSign + i) % 12;
    const planets = chart.planets.filter(p => p.signIndex === signIndex).map(p => (language === "ne" ? NE.short : EN.short)[grahaKey(p)] || p.name.slice(0, 2)).join(" ");
    return { number: i + 1, signIndex, planets };
  });
  return <figure className="jpr-kundali">
    <svg viewBox="0 0 300 300" role="img" aria-label={title}>
      <rect x="8" y="8" width="284" height="284" />
      <path d="M8 8L292 292M292 8L8 292M150 8L292 150L150 292L8 150Z" />
      {labels.map(([x, y], i) => <g key={i}>
        <text x={x} y={y - 13} className="jpr-house-no">{language === "ne" ? "भाव " + digits(i + 1, language) : "H" + (i + 1)}</text>
        <text x={x} y={y + 1} className="jpr-graha-label">{houses[i].planets || "·"}</text>
        <text x={x} y={y + 13} className="jpr-sign-label">{signName(houses[i].signIndex, language)}</text>
      </g>)}
      <text x="150" y="143" className="jpr-center-label">{moonChart ? tx(language, "चन्द्र", "Moon") : tx(language, "लग्न", "Ascendant")}</text>
      <text x="150" y="160" className="jpr-center-sign">{signName(anchorSign, language)}</text>
    </svg>
    <figcaption>{title}</figcaption>
  </figure>;
}
function BirthIdentity({ chart, language, showCoordinates = true }: { chart: ChartResult; language: ReportLanguage; showCoordinates?: boolean }) {
  const birth = chart.input as ChartResult["input"] & { father?: string };
  return <dl className="jpr-kv-list">
    <KeyValue label={tx(language, "नाम", "Name")} value={birth.name || "—"} />
    {birth.father ? <KeyValue label={tx(language, "पिता / अभिभावक", "Father / guardian")} value={birth.father} /> : null}
    <KeyValue label={tx(language, "वि.सं. जन्ममिति", "BS birth date")} value={bsDateText(birth.date, language)} />
    <KeyValue label={tx(language, "ई.सं. जन्ममिति", "Gregorian date")} value={adDateText(birth.date, language)} />
    <KeyValue label={tx(language, "स्थानीय जन्मसमय", "Local birth time")} value={birth.time + tx(language, " (नेपाल समय)", " (Nepal time, UTC+05:45)")} />
    <KeyValue label={tx(language, "जन्मस्थान", "Birthplace")} value={birth.location || "—"} />
    {showCoordinates ? <KeyValue label={tx(language, "निर्देशाङ्क", "Coordinates")} value={digits(birth.lat.toFixed(4), language) + "°, " + digits(birth.lng.toFixed(4), language) + "°"} /> : null}
  </dl>;
}

export function DetailedBirthChartReport({ chart, language }: { chart: ChartResult; language: ReportLanguage }) {
  const moon = chart.planets.find(p => p.key === "moon");
  const sun = chart.planets.find(p => p.key === "sun");
  const nak = NAKSHATRA_META[chart.moonNakshatraIndex];
  const syllable = nameSyllableFromNakshatra(chart.moonNakshatraIndex, chart.moonPada);
  const panchang = panchangAt(chart.instant);
  const tithi = panchang.tithi === 15 ? "पूर्णिमा" : panchang.tithi === 30 ? "औंसी (अमावस्या)" : tithiName(panchang.tithi);
  const yogaNe = YOGAS_NE[panchang.yoga] || "—";
  const yogaEn = YOGA_NAMES_EN[panchang.yoga] || "—";
  const karanaEn = KARANA_NAMES_EN[panchang.karana] || "—";
  const tithiEn = panchang.tithi === 15 ? "Purnima" : panchang.tithi === 30 ? "Amavasya" : (TITHI_NAMES_EN[(panchang.tithi - 1) % 15] || "Tithi " + panchang.tithi);
  const weekday = WEEKDAYS[new Date(chart.input.date + "T00:00:00Z").getUTCDay()];
  const currentDasha = chart.dashas.find(d => new Date().getTime() >= d.start.getTime() && new Date().getTime() < d.end.getTime());
  const methodsNe = [
    "ग्रहको निरयण स्थिति खगोल गणनाबाट प्राप्त ग्रह-दीर्घांशमा लाहिरी-शैलीको अयनांश घटाएर निकालिएको हो।",
    "अयनांश लाहिरी-शैलीको रेखीय अनुमान हो; यो प्रमाणित पञ्चाङ्ग वा उच्च-सटीकता ज्योतिषीय इफेमेरिसको विकल्प होइन।",
    "भाव निर्धारणमा लग्नबाट सम्पूर्ण राशि-आधारित (whole-sign) भाव पद्धति प्रयोग गरिएको छ।",
    "राहुका लागि औसत चन्द्र-नोड र केतुका लागि त्यसको ठीक १८०° विपरीत बिन्दु प्रयोग गरिएको छ।",
    "दशा, गुण मिलान र मङ्गल-दोष परम्परागत व्याख्यात्मक नियम हुन्, प्रत्यक्ष खगोलीय मापन होइनन्।",
  ];
  const grahas = chart.planets;
  const elements = [0, 0, 0, 0];
  const qualities = [0, 0, 0];
  chart.planets.forEach(p => { elements[p.signIndex % 4] += 1; qualities[p.signIndex % 3] += 1; });
  const chartName = chart.input.name || tx(language, "जन्मपत्रिका", "Birth chart");
  const page = (n: number, content: ReactNode, cover = false) => <Page key={n} number={n} total={BIRTH_REPORT_PAGE_COUNT} title={language === "ne" ? BIRTH_REPORT_PAGE_TITLES_NE[n - 1] : [
    "Birth chart and invocation", "Birth details and time convention", "Panchanga at birth", "Birth sign, Nakshatra and naming syllable",
    "Ascendant chart and twelve houses", "Moon chart and lunar reference", "Calculated positions of nine grahas",
    "Planetary placements and traditional meanings", "Vimshottari Mahadasha", "Manglik assessment and special notes",
    "Integrated birth-chart summary", "Calculation method and limitations",
  ][n - 1]} language={language} cover={cover} eyebrow={tx(language, "आफ्नै ज्योतिष · विस्तृत चिना", "Aafnai Jyotish · Detailed chart")}>{content}</Page>;
  return <div className="jpr-report jpr-birth-report" data-jpr-report="birth">
    {page(1, <>
      <p className="jpr-mantra">आदित्याद्या ग्रहाः सर्वे नक्षत्राणि च राशयः ।<br />जन्मपत्रिकया ज्ञायेत् कालगणितं फलप्रदर्शकम् ॥</p>
      <p className="jpr-cover-kicker">{tx(language, "परम्परागत शैलीमा विस्तृत जन्मकुण्डली", "A detailed birth chart in a traditional format")}</p>
      <h1>{tx(language, "जन्मपत्रिका", "Birth chart")}</h1>
      <p className="jpr-cover-name">{chartName}</p>
      <div className="jpr-metric-grid">
        <Metric label={tx(language, "लग्न", "Ascendant")} value={signName(chart.ascSignIndex, language)} note={displayDegree(chart.ascendant, language)} />
        <Metric label={tx(language, "चन्द्र राशि", "Moon sign")} value={moon ? signName(moon.signIndex, language) : "—"} />
        <Metric label={tx(language, "जन्म नक्षत्र", "Birth Nakshatra")} value={nakshatraName(chart.moonNakshatraIndex, language)} note={tx(language, "चरण ", "Pada ") + digits(chart.moonPada, language)} />
      </div>
      <BirthIdentity chart={chart} language={language} showCoordinates={false} />
      <p className="jpr-note">{tx(language, "यो विस्तृत प्रतिवेदन उपलब्ध जन्म विवरण र हालको आफ्नै ज्योतिष गणना-इन्जिनबाट प्राप्त परिणाममा आधारित छ।", "This detailed report is based on the supplied birth details and the existing Aafnai Jyotish calculation engine.")}</p>
    </>, true)}
    {page(2, <>
      <p>{tx(language, "कुण्डलीको व्याख्या सही जन्म मिति, स्थानीय समय र स्थानमा निर्भर हुन्छ। यस पृष्ठमा प्रयोग गरिएको इनपुटलाई पुनः जाँच गर्न सकिन्छ।", "A chart depends on the recorded local date, time and birthplace. Review the exact inputs used here before interpreting it.")}</p>
      <BirthIdentity chart={chart} language={language} />
      <Panel title={tx(language, "गणनामा प्रयोग भएको काल-निर्धारण", "Time convention used")}>
        <Bullet title={tx(language, "स्थानीय समय", "Local time")}>{tx(language, "दिइएको घडीको समयलाई नेपाल मानक समय (UTC+५:४५) मानी खगोलीय क्षणमा रूपान्तरण गरिएको छ।", "The entered clock time is interpreted as Nepal Standard Time (UTC+05:45) and converted to the calculation instant.")}</Bullet>
        <Bullet title={tx(language, "वि.सं. र ई.सं.", "BS and Gregorian dates")}>{tx(language, "वि.सं. मिति उपलब्ध पात्रो रूपान्तरण तालिकाबाट देखाइएको हो। रूपान्तरण आफैँले तिथि वा नक्षत्र गणना गर्दैन।", "The BS date is displayed using the existing calendar conversion table; date conversion itself does not calculate a tithi or Nakshatra.")}</Bullet>
        <Bullet title={tx(language, "स्थानको भूमिका", "Why birthplace matters")}>{tx(language, "जन्मस्थानका अक्षांश र देशान्तर विशेषगरी लग्न र भाव गणनामा प्रयोग हुन्छन्।", "Latitude and longitude are used particularly for ascendant and house calculations.")}</Bullet>
      </Panel>
      <p className="jpr-note">{tx(language, "जन्मसमय अनुमानित हो भने लग्न र भावको व्याख्या पनि सावधानीपूर्वक पढ्नुहोस्।", "If the birth time is approximate, interpret the ascendant and house placements cautiously.")}</p>
    </>)}
    {page(3, <>
      <p>{tx(language, "तलका तिथि, पक्ष, योग र करण सहायक पञ्चाङ्ग गणनाबाट जन्म क्षणका लागि निकालिएका हुन्। चन्द्र राशि तथा जन्म नक्षत्र भने यस प्रतिवेदनको जन्मकुण्डली गणनाबाट देखाइएका छन्।", "Tithi, paksha, yoga and karana below are calculated for the birth instant by the existing supporting Panchanga function. The Moon sign and birth Nakshatra shown elsewhere come from the birth-chart engine.")}</p>
      <div className="jpr-metric-grid">
        <Metric label={tx(language, "वार", "Weekday")} value={language === "ne" ? weekday : new Date(chart.input.date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })} />
        <Metric label={tx(language, "तिथि", "Tithi")} value={language === "ne" ? tithi : tithiEn} note={tx(language, panchang.paksha === "shukla" ? "शुक्ल पक्ष" : "कृष्ण पक्ष", panchang.paksha === "shukla" ? "Waxing fortnight" : "Waning fortnight")} />
        <Metric label={tx(language, "योग", "Yoga")} value={language === "ne" ? yogaNe : yogaEn} />
        <Metric label={tx(language, "करण", "Karana")} value={language === "ne" ? (KARANA_NAMES[panchang.karana] || "—") : karanaEn} />
      </div>
      <Panel title={tx(language, "पञ्चाङ्गको परम्परागत उपयोग", "Traditional purpose of Panchanga elements")}>
        <Bullet title={tx(language, "तिथि र पक्ष", "Tithi and paksha")}>{tx(language, "चन्द्र-सूर्य कोणीय दूरीका आधारमा तिथि तथा शुक्ल/कृष्ण पक्ष छुट्याइन्छ।", "Tithi and the waxing/waning fortnight are determined from the angular separation of the Moon and Sun.")}</Bullet>
        <Bullet title={tx(language, "योग", "Yoga")}>{tx(language, "सूर्य र चन्द्रको निरयण दीर्घांशको योगलाई २७ भागमा विभाजन गरी योग निर्धारण गरिन्छ।", "Yoga is determined by dividing the sum of the Sun and Moon's sidereal longitudes into 27 segments.")}</Bullet>
        <Bullet title={tx(language, "करण", "Karana")}>{tx(language, "करण तिथिको आधा भागसँग सम्बन्धित पञ्चाङ्ग अङ्ग हो। यहाँ पात्रोको विद्यमान गणना प्रयोग गरिएको छ।", "Karana is a Panchanga element associated with half a tithi; the current Patro calculation is reused here.")}</Bullet>
      </Panel>
      <p className="jpr-note">{tx(language, "विभिन्न पञ्चाङ्ग परम्परा, अयनांश वा दिनको स्थानीय सूर्योदयका नियमका कारण केही नाम वा सीमा फरक हुन सक्छन्।", "Different Panchanga traditions, ayanamsa choices or local-sunrise conventions may produce different boundary labels.")}</p>
    </>)}
    {page(4, <>
      <div className="jpr-metric-grid">
        <Metric label={tx(language, "चन्द्र राशि", "Moon sign")} value={moon ? signName(moon.signIndex, language) : "—"} />
        <Metric label={tx(language, "जन्म नक्षत्र", "Birth Nakshatra")} value={nakshatraName(chart.moonNakshatraIndex, language)} />
        <Metric label={tx(language, "चरण", "Pada")} value={digits(chart.moonPada, language)} />
        <Metric label={tx(language, "नामाक्षर", "Naming syllable")} value={syllable || "—"} />
      </div>
      <Panel title={tx(language, "नक्षत्रका परम्परागत परिचायक", "Traditional Nakshatra references")}>
        <dl className="jpr-kv-list">
          <KeyValue label={tx(language, "नक्षत्र स्वामी", "Nakshatra lord")} value={grahaName((nak?.lord || "").toLowerCase(), language)} />
          <KeyValue label={tx(language, "नक्षत्र देवता", "Nakshatra deity")} value={language === "ne" ? (nak?.deity.ne || "—") : (nak?.deity.en || "—")} />
          <KeyValue label={tx(language, "गण", "Gana")} value={(language === "ne" ? NE.gana : EN.gana)[nak?.gana ?? 0]} />
          <KeyValue label={tx(language, "योनि वर्ग", "Yoni category")} value={(language === "ne" ? NE.yoni : EN.yoni)[nak?.yoni?.[0] ?? 0]} />
          <KeyValue label={tx(language, "नाडी", "Nadi")} value={(language === "ne" ? NE.nadi : EN.nadi)[nak?.nadi ?? 0]} />
        </dl>
      </Panel>
      <Panel title={tx(language, "नामकरणमा नामाक्षरको भूमिका", "How the naming syllable is used")}>
        <p>{language === "ne"
          ? "परम्परागत नामकरणमा जन्म नक्षत्रको चरणसँग सम्बन्धित अक्षर सिफारिस गरिन्छ। यहाँ " + nakshatraName(chart.moonNakshatraIndex, language) + " को " + digits(chart.moonPada, language) + " चरणका लागि " + (syllable || "—") + " नामाक्षर देखाइएको छ। परिवार, कुलपरम्परा वा पुरोहितको विधिले फरक नाम रोज्न सकिन्छ।"
          : "Traditional naming often associates a syllable with the birth Nakshatra pada. This chart maps " + nakshatraName(chart.moonNakshatraIndex, language) + ", pada " + chart.moonPada + " to “" + (syllable || "—") + "”. Family or priestly custom may choose another name."}</p>
      </Panel>
      <p className="jpr-note">{tx(language, "नामाक्षर परम्परागत संकेत हो; केवल नामको पहिलो अक्षरबाट जन्म समय, लग्न वा वास्तविक चन्द्र स्थिति प्रमाणित हुँदैन।", "A naming syllable is a traditional guide; a name alone cannot establish birth time, ascendant or the astronomical Moon position.")}</p>
    </>)}
    {page(5, <>
      <p>{tx(language, "लग्न कुण्डलीमा जन्म क्षणमा उदय भइरहेको राशि पहिलो भावको आधार मानिन्छ। यहाँ सम्पूर्ण राशि-आधारित भाव पद्धति प्रयोग भएको छ।", "The ascendant chart takes the rising sign at the birth instant as the first house. This report uses whole-sign houses.")}</p>
      <KundaliDiagram chart={chart} anchorSign={chart.ascSignIndex} moonChart={false} language={language} title={tx(language, "लग्न कुण्डली", "Ascendant chart")} />
      <Panel title={tx(language, "द्वादश भावको विषय-विस्तार", "The twelve houses")}>
        <div className="jpr-house-grid">{(language === "ne" ? NE.house : EN.house).map((h, i) => <article key={h}><strong>{tx(language, "भाव ", "House ") + digits(i + 1, language)} · {signName((chart.ascSignIndex + i) % 12, language)}</strong><span>{h}</span></article>)}</div>
      </Panel>
      <p className="jpr-note">{tx(language, "भावमा देखाइएको ग्रहस्थिति गणना-इन्जिनको परिणाम हो; भावका विषयहरू परम्परागत ज्योतिषीय सङ्केत हुन्।", "Planet placements in the houses are engine outputs; house themes are traditional astrological associations.")}</p>
    </>)}
    {page(6, <>
      <p>{tx(language, "चन्द्र कुण्डलीमा चन्द्र बसेको राशिलाई पहिलो सन्दर्भ मानेर अन्य राशिस्थित ग्रहहरू देखाइन्छन्। यसले लग्न कुण्डलीलाई प्रतिस्थापन गर्दैन; फरक सन्दर्भबाट ग्रहस्थितिलाई हेर्न मद्दत गर्छ।", "The Moon chart takes the Moon's sign as its first reference and displays the other sign placements relative to it. It complements rather than replaces the ascendant chart.")}</p>
      <KundaliDiagram chart={chart} anchorSign={moon?.signIndex ?? chart.ascSignIndex} moonChart={true} language={language} title={tx(language, "चन्द्र कुण्डली", "Moon chart")} />
      <Panel title={tx(language, "चन्द्रको परम्परागत सन्दर्भ", "Traditional Moon-chart reference")}>
        <Bullet title={tx(language, "चन्द्र राशि", "Moon sign")}>{tx(language, "चन्द्र राशिलाई वैदिक परम्परामा मन, ग्रहणशीलता र दैनिक अनुभूतिसँग जोडिन्छ।", "The Moon sign is traditionally associated with the mind, receptivity and daily experience.")}</Bullet>
        <Bullet title={tx(language, "लग्नसँगको भिन्नता", "Difference from the ascendant")}>{tx(language, "लग्न जन्मस्थान र समयमा निर्भर हुन्छ; चन्द्र राशि चन्द्रको निरयण दीर्घांशबाट निकालिन्छ। यी दुई विवरण फरक हुनु सामान्य हो।", "The ascendant depends on birthplace and time; the Moon sign is determined from the Moon's sidereal longitude. They are distinct chart references.")}</Bullet>
      </Panel>
    </>)}
    {page(7, <>
      <p>{tx(language, "तलको तालिकाले हालको जन्मकुण्डली इन्जिनबाट प्राप्त ग्रहस्थितिहरू जस्ताको तस्तै देखाउँछ। अंश ०° देखि ३०° सम्म सम्बन्धित राशिभित्रको स्थिति हो।", "The table below displays the positions returned by the existing chart engine. Degree-within-sign runs from 0° to 30°.")}</p>
      <div className="jpr-table-wrap"><table><thead><tr><th>{tx(language, "ग्रह", "Graha")}</th><th>{tx(language, "निरयण दीर्घांश", "Sidereal longitude")}</th><th>{tx(language, "राशि", "Sign")}</th><th>{tx(language, "राशिभित्रको अंश", "Degree in sign")}</th><th>{tx(language, "भाव", "House")}</th></tr></thead><tbody>{grahas.map(p => <tr key={p.key}><td>{grahaName(p.key, language)}</td><td>{digits(p.longitude.toFixed(3), language)}°</td><td>{signName(p.signIndex, language)}</td><td>{displayDegree(p.longitude, language)}</td><td>{digits(p.house, language)}</td></tr>)}</tbody></table></div>
      <Panel title={tx(language, "दीर्घांश कसरी पढ्ने?", "Reading a longitude")}>
        <Bullet title={tx(language, "राशि र अंश", "Sign and degree")}>{tx(language, "हरेक राशि ३०° को खण्ड हो। तालिकाको निरयण दीर्घांशबाट राशि सूचक र त्यस राशिभित्रको अंश दुवै प्रस्तुत गरिएका छन्।", "Each sign occupies a 30° segment. The sidereal longitude determines both the sign and its degree within that sign.")}</Bullet>
        <Bullet title={tx(language, "राहु र केतु", "Rahu and Ketu")}>{tx(language, "यस इन्जिनले राहुका लागि औसत चन्द्र-नोड र केतुका लागि ठीक विपरीत बिन्दु प्रयोग गर्छ।", "The current engine uses the mean lunar node for Rahu and the opposite point for Ketu.")}</Bullet>
      </Panel>
    </>)}
    {page(8, <>
      <p>{tx(language, "यो खण्डले ग्रहस्थितिलाई परम्परागत प्रतीकात्मक अर्थसँग जोडेर पढ्ने तरिका दिन्छ। प्रत्येक विवरणमा गणना गरिएको राशि, अंश र भाव दोहोर्‍याइएको छ ताकि व्याख्या वास्तविक स्थितिबाट अलग नहोस्।", "This section connects each calculated placement to traditional symbolic meanings. The calculated sign, degree and house are repeated to keep interpretation tied to the actual output.")}</p>
      <div className="jpr-planet-cards">{grahas.map(p => <article key={p.key} className="jpr-planet-card">
        <header><strong>{grahaName(p.key, language)}</strong><span>{signName(p.signIndex, language)} · {tx(language, "भाव ", "House ") + digits(p.house, language)}</span></header>
        <p>{planetarySignification(p, language)}</p>
        <small>{tx(language, "गणना गरिएको दीर्घांश: ", "Calculated longitude: ")}{digits(p.longitude.toFixed(3), language)}°</small>
      </article>)}</div>
      <p className="jpr-note">{tx(language, "यी अर्थ परम्परागत ज्योतिषीय व्याख्या हुन्; जन्मपत्रिकाले एक्लै कुनै घटना निश्चित गर्छ भन्ने दाबी होइन।", "These meanings are traditional interpretations, not a claim that a chart alone determines events.")}</p>
    </>)}
    {page(9, <>
      <p>{tx(language, "विंशोत्तरी महादशा क्रम जन्म नक्षत्रमा चन्द्रको स्थानअनुसार आरम्भ हुन्छ। तालिका हालको इन्जिनबाट प्राप्त दशा-अवधि र तिनका मितिमा आधारित छ।", "The Vimshottari Mahadasha sequence begins from the Moon's position within the birth Nakshatra. This table uses the periods and dates returned by the existing engine.")}</p>
      {currentDasha ? <Panel title={tx(language, "हालको गणना-अवधि", "Period containing the current date")} className="jpr-highlight-panel">
        <p>{tx(language, "हालको मितिलाई समेट्ने गणना-अवधि: ", "Calculated period containing the current date: ")}<strong>{grahaName(currentDasha.lord.toLowerCase(), language)}</strong></p>
        <p>{tx(language, "सुरु: ", "Start: ")}{bsDateText(currentDasha.start, language)} · {tx(language, "अन्त्य: ", "End: ")}{bsDateText(currentDasha.end, language)}</p>
      </Panel> : <p className="jpr-note">{tx(language, "हालको मिति उपलब्ध दशा तालिकाभित्र नपर्न सक्छ; तल इन्जिनले दिएको क्रम हेर्नुहोस्।", "The current date may fall outside the available period list; review the complete calculated sequence below.")}</p>}
      <div className="jpr-table-wrap"><table><thead><tr><th>{tx(language, "दशा स्वामी", "Period lord")}</th><th>{tx(language, "आरम्भ", "Start")}</th><th>{tx(language, "समाप्ति", "End")}</th><th>{tx(language, "वर्ष", "Years")}</th></tr></thead><tbody>{chart.dashas.map((d, i) => <tr key={i}><td>{grahaName(d.lord.toLowerCase(), language)}</td><td>{bsDateText(d.start, language)}</td><td>{bsDateText(d.end, language)}</td><td>{digits(d.years.toFixed(2), language)}</td></tr>)}</tbody></table></div>
      <Panel title={tx(language, "दशाको प्रयोग", "How to read a Mahadasha table")}>
        <p>{tx(language, "दशा अवधि परम्परागत व्याख्याको समय-सन्दर्भ हो। यहाँ अन्तर्दशा, प्रत्यन्तर्दशा वा भविष्यका घटना छुट्टै गणना गरिएको छैन; नदेखाइएको अवधि अनुमान गरेर थपिएको छैन।", "A Dasha period is a traditional interpretive timing reference. Antardasha and Pratyantardasha are not separately calculated here, and uncomputed periods are not invented.")}</p>
      </Panel>
    </>)}
    {page(10, <>
      <div className="jpr-metric-grid">
        <Metric label={tx(language, "मङ्गलको स्थिति", "Mars position")} value={signName(chart.planets.find(p => p.key === "mars")?.signIndex ?? 0, language)} />
        <Metric label={tx(language, "लग्नबाट भाव", "House from ascendant")} value={digits(chart.manglik.fromLagna, language)} />
        <Metric label={tx(language, "चन्द्रबाट भाव", "House from Moon")} value={digits(chart.manglik.fromMoon, language)} />
        <Metric label={tx(language, "इन्जिनको वर्गीकरण", "Engine classification")} value={language === "ne"
          ? ({ None: "नदेखिएको", Mild: "हल्का", Moderate: "मध्यम", Strong: "प्रबल" } as Record<string, string>)[chart.manglik.severity] || "उपलब्ध छैन"
          : chart.manglik.severity} />
      </div>
      <Panel title={tx(language, "मङ्गल दोष मूल्याङ्कनमा प्रयोग भएको नियम", "Rule used by the current Manglik assessment")}>
        <p>{tx(language, "हालको इन्जिनले लग्न र चन्द्रबाट मङ्गल कुन भावमा पर्छ हेर्छ। १, २, ४, ७, ८ वा १२ औँ भावमा पर्ने अवस्थालाई जाँच सूचीमा राखिएको छ।", "The current engine checks Mars relative to both the ascendant and Moon. Houses 1, 2, 4, 7, 8 and 12 are the tested positions.")}</p>
        <dl className="jpr-kv-list">
          <KeyValue label={tx(language, "लग्नबाट परेको भाव", "House from ascendant")} value={digits(chart.manglik.fromLagna, language)} />
          <KeyValue label={tx(language, "चन्द्रबाट परेको भाव", "House from Moon")} value={digits(chart.manglik.fromMoon, language)} />
          <KeyValue label={tx(language, "जाँचमा परेको भाव", "Affected tested houses")} value={chart.manglik.affectedHouses.length ? chart.manglik.affectedHouses.map(x => digits(x, language)).join(", ") : tx(language, "कुनै छैन", "None")} />
        </dl>
      </Panel>
      <Panel title={tx(language, "सावधानीपूर्वक बुझ्नुपर्ने कुरा", "Important limits")}>
        <p>{tx(language, "यो निष्कर्ष यस इन्जिनको सीमित नियमबाट आएको हो। विभिन्न परम्परामा अपवाद, शमन, दृष्टि र अन्य ग्रहस्थितिलाई थप विचार गरिन्छ; यी सबै यहाँ पूर्ण रूपमा गणना भएका छैनन्।", "This conclusion uses the engine's limited rule. Traditions may consider exceptions, cancellation, aspects and other placements not fully calculated here.")}</p>
        <p>{tx(language, "प्रतिवेदनमा नदेखाइएका योग, दृष्टि, वर्ग कुण्डली वा दोष स्वतः अनुपस्थित छन् भन्ने अर्थ नलागोस्।", "A yoga, aspect, divisional chart or dosha not shown here should not be assumed to have been evaluated.")}</p>
      </Panel>
    </>)}
    {page(11, <>
      <p>{tx(language, "समग्र सारांशले गणना गरिएका आधारभूत तथ्यलाई एकै ठाउँमा राख्छ। राशि-तत्व र गुणको गणना तल देखाइने ग्रहस्थितिमा आधारित वर्णनात्मक सार हो; यसलाई स्वतन्त्र भविष्यवाणी अङ्क मानिएको छैन।", "This synthesis brings calculated facts together. Element and modality counts are descriptive summaries of the listed placements, not independent prediction scores.")}</p>
      <div className="jpr-metric-grid">
        <Metric label={tx(language, "लग्न", "Ascendant")} value={signName(chart.ascSignIndex, language)} note={displayDegree(chart.ascendant, language)} />
        <Metric label={tx(language, "सूर्य राशि", "Sun sign")} value={sun ? signName(sun.signIndex, language) : "—"} />
        <Metric label={tx(language, "चन्द्र राशि", "Moon sign")} value={moon ? signName(moon.signIndex, language) : "—"} />
        <Metric label={tx(language, "नक्षत्र चरण", "Nakshatra pada")} value={nakshatraName(chart.moonNakshatraIndex, language) + " · " + digits(chart.moonPada, language)} />
      </div>
      <Panel title={tx(language, "ग्रहस्थितिमा देखिएका तत्व", "Element distribution of the placements")}>
        <div className="jpr-count-grid">{(language === "ne" ? NE.element : EN.element).map((label, i) => <Metric key={label} label={label} value={digits(elements[i], language)} note={tx(language, "ग्रह", "placements")} />)}</div>
        <p>{tx(language, "तत्वका गणना राशि-तत्व समूहअनुसार गरिएका हुन्। गणनामा सबै देखाइएका ग्रहबिन्दु समावेश छन्; राहु र केतुसमेत समावेश भएकाले यो वर्णनात्मक वितरण हो।", "Counts use the sign element grouping and include all displayed points, including Rahu and Ketu; this is a descriptive distribution.")}</p>
      </Panel>
      <Panel title={tx(language, "राशिको गति-स्वभाव", "Sign modality distribution")}>
        <div className="jpr-count-grid">{(language === "ne" ? NE.quality : EN.quality).map((label, i) => <Metric key={label} label={label} value={digits(qualities[i], language)} note={tx(language, "ग्रह", "placements")} />)}</div>
      </Panel>
      <p className="jpr-note">{tx(language, "व्यक्तिगत निर्णयमा जन्मपत्रिका मात्र नभई अनुभव, परिस्थिति, संवाद र प्रमाणित जानकारीलाई प्राथमिकता दिनुहोस्।", "For personal decisions, prioritize lived experience, circumstances, communication and reliable information rather than a birth chart alone.")}</p>
    </>)}
    {page(12, <>
      <Panel title={tx(language, "गणना-पद्धति", "Calculation method")}>
        <ul className="jpr-method-list">{chart.methodology.map((_, i) => <li key={i}>{language === "ne" ? methodsNe[i] : [
          "Planet positions use geocentric apparent vectors converted to ecliptic longitude of date, then the sidereal adjustment is applied.",
          "The ayanamsa is a Lahiri-style linear approximation; it is not a certified Panchanga or high-precision astrological ephemeris.",
          "Houses use the whole-sign house system from the calculated ascendant.",
          "The engine uses the mean lunar node for Rahu and the point exactly opposite it for Ketu.",
          "Dasha, Guna Milan and Manglik layers are traditional interpretive rules, not direct astronomical measurements.",
        ][i] || _}</li>)}</ul>
      </Panel>
      <Panel title={tx(language, "पारदर्शिता र सीमा", "Transparency and limitations")}>
        <ul>
          <li>{tx(language, "अयनांश: ", "Ayanamsa: ")}{digits(chart.ayanamsa.toFixed(5), language)}°</li>
          <li>{tx(language, "खगोलीय क्षण (UTC): ", "Astronomical instant (UTC): ")}{chart.instant.toISOString()}</li>
          <li>{tx(language, "भाव पद्धति: सम्पूर्ण राशि-आधारित", "House system: whole-sign")}</li>
          <li>{tx(language, "राहु / केतु: औसत चन्द्र-नोड", "Rahu / Ketu: mean lunar node")}</li>
        </ul>
        <p>{tx(language, "यो प्रतिवेदन परम्परागत ज्योतिषीय सन्दर्भका लागि हो। खगोलीय गणना र सांस्कृतिक व्याख्यालाई छुट्टाछुट्टै बुझ्नुहोस्; अङ्क वा व्याख्यालाई निश्चित भाग्य, स्वास्थ्य, आर्थिक वा सम्बन्धको निर्णयका रूपमा नलिनुहोस्।", "This report is a traditional astrology reference. Distinguish astronomical calculations from cultural interpretation; neither scores nor interpretations establish fate or determine health, financial or relationship decisions.")}</p>
      </Panel>
      <p className="jpr-final-blessing">{tx(language, "सर्वे भवन्तु सुखिनः ।", "May all beings be well.")}</p>
    </>)}
  </div>;
}

function moonOf(chart: ChartResult): PlanetPosition | undefined {
  return chart.planets.find(p => p.key === "moon");
}
function nakNameForChart(chart: ChartResult, language: ReportLanguage): string {
  return nakshatraName(chart.moonNakshatraIndex, language);
}
function scoreVerdict(total: number, language: ReportLanguage): string {
  if (total >= 28) return tx(language, "उत्तम मिलान", "Excellent match");
  if (total >= 24) return tx(language, "राम्रो मिलान", "Good match");
  if (total >= 18) return tx(language, "मध्यम मिलान", "Moderate match");
  return tx(language, "कम मिलान", "Low match");
}
function currentPeriod(chart: ChartResult): ChartResult["dashas"][number] | null {
  const now = Date.now();
  return chart.dashas.find(d => now >= d.start.getTime() && now < d.end.getTime()) || null;
}
function personSummary(chart: ChartResult, language: ReportLanguage) {
  const moon = moonOf(chart);
  return <div className="jpr-person-summary">
    <h3>{chart.input.name || tx(language, "नाम उल्लेख छैन", "Name not supplied")}</h3>
    <p><strong>{tx(language, "चन्द्र राशि", "Moon sign")}:</strong> {moon ? signName(moon.signIndex, language) : "—"}</p>
    <p><strong>{tx(language, "जन्म नक्षत्र", "Birth Nakshatra")}:</strong> {nakNameForChart(chart, language)}</p>
    <p><strong>{tx(language, "चरण", "Pada")}:</strong> {digits(chart.moonPada, language)}</p>
    <p><strong>{tx(language, "लग्न", "Ascendant")}:</strong> {signName(chart.ascSignIndex, language)}</p>
    <p><strong>{tx(language, "जन्मसमय", "Birth time")}:</strong> {chart.input.time}</p>
  </div>;
}
function partnerIdentity(chart: ChartResult, language: ReportLanguage) {
  return <div className="jpr-partner-panel">
    <h3>{chart.input.name || tx(language, "नाम उल्लेख छैन", "Name not supplied")}</h3>
    <BirthIdentity chart={chart} language={language} showCoordinates={true} />
  </div>;
}

export function DetailedGunaMilanReport({ result, language }: { result: GunaResult; language: ReportLanguage }) {
  const a = result.profileA;
  const b = result.profileB;
  const aMoon = moonOf(a);
  const bMoon = moonOf(b);
  const pair = result.items;
  const item = (key: string) => pair.find(x => x.key === key);
  const makePage = (n: number, children: ReactNode, cover = false) => <Page key={n} number={n} total={GUNA_REPORT_PAGE_COUNT}
    title={language === "ne" ? GUNA_REPORT_PAGE_TITLES_NE[n - 1] : [
      "Marriage matching and invocation", "Birth details of both people", "Profile A birth indicators", "Profile B birth indicators",
      "Overall Ashtakoota score", "Varna and Vashya Kootas", "Tara and Yoni Kootas", "Graha Maitri and Gana Kootas",
      "Bhakoot and Nadi Kootas", "Comparison of both charts", "Manglik and Dasha context", "Summary and methodology",
    ][n - 1]} language={language} cover={cover} eyebrow={tx(language, "आफ्नै ज्योतिष · ३६ गुण मिलान", "Aafnai Jyotish · 36-point matching")}>{children}</Page>;
  const twoKootas = (first: string, second: string) => <div className="jpr-koota-grid">
    {item(first) ? <KootaCard item={item(first)!} language={language} /> : null}
    {item(second) ? <KootaCard item={item(second)!} language={language} /> : null}
  </div>;
  return <div className="jpr-report jpr-guna-report" data-jpr-report="guna-milan">
    {makePage(1, <>
      <p className="jpr-mantra">मङ्गलं भगवान् विष्णुः मङ्गलं गरुडध्वजः ।<br />मङ्गलं पुण्डरीकाक्षः मङ्गलाय तनो हरिः ॥</p>
      <p className="jpr-cover-kicker">{tx(language, "परम्परागत अष्टकूटमा आधारित विस्तृत मिलान", "Detailed matching based on the traditional Ashtakoota framework")}</p>
      <h1>{tx(language, "३६ गुण मिलान", "36-point Guna Milan")}</h1>
      <div className="jpr-pair-cover"><div>{personSummary(a, language)}</div><span>×</span><div>{personSummary(b, language)}</div></div>
      <div className="jpr-score-hero"><strong>{digits(result.total, language)} <small>/ {digits(result.max, language)}</small></strong><span>{scoreVerdict(result.total, language)}</span></div>
      <p className="jpr-note">{tx(language, "यो परम्परागत मिलान गणना हो; यसले दुई व्यक्तिको सम्बन्धको वास्तविक गुणस्तर वा भविष्य निश्चित गर्दैन।", "This is a traditional matching calculation; it does not determine the real quality or future of a relationship.")}</p>
    </>, true)}
    {makePage(2, <>
      <p>{tx(language, "गुण मिलानको नतिजा बुझ्नुअघि दुवै जन्म विवरण सही छन् कि छैनन् हेर्नुहोस्। समय, मिति वा स्थान गलत भए जन्मकुण्डली र त्यसमा आधारित अष्टकूट अङ्क पनि बदलिन सक्छ।", "Review both birth profiles before interpreting the score. If a time, date or place is wrong, the natal charts and resulting koota scores may change.")}</p>
      <div className="jpr-two-columns">
        <div><h3>{tx(language, "पहिलो व्यक्ति", "Person A")}</h3>{partnerIdentity(a, language)}</div>
        <div><h3>{tx(language, "दोस्रो व्यक्ति", "Person B")}</h3>{partnerIdentity(b, language)}</div>
      </div>
      <Panel title={tx(language, "मिलानमा प्रयोग भएको आधार", "Basis used for matching")}>
        <p>{tx(language, "हालको गणनाले दुवै जन्मकुण्डलीबाट चन्द्र राशि र जन्म नक्षत्र लिएर अष्टकूटका आठ पक्षको अङ्क निकाल्छ।", "The current calculation uses the Moon sign and birth Nakshatra from each chart to generate scores for the eight Ashtakoota dimensions.")}</p>
        <p>{tx(language, "यस प्रतिवेदनले गणना-इन्जिनबाट आएको नतिजा र त्यसको परम्परागत अर्थलाई छुट्याएर देखाउँछ।", "This report separates the engine's result from the traditional interpretation of that result.")}</p>
      </Panel>
    </>)}
    {makePage(3, <>
      <h3>{tx(language, "पहिलो व्यक्तिको मुख्य जन्म-सङ्केत", "Person A: primary birth indicators")}</h3>
      {personSummary(a, language)}
      <KundaliDiagram chart={a} anchorSign={a.ascSignIndex} moonChart={false} language={language} title={tx(language, "पहिलो व्यक्तिको लग्न कुण्डली", "Person A ascendant chart")} />
      <Panel title={tx(language, "नक्षत्र र नामाक्षर", "Nakshatra and naming syllable")}>
        <p>{tx(language, "जन्म नक्षत्र: ", "Birth Nakshatra: ")}{nakNameForChart(a, language)} · {tx(language, "चरण: ", "Pada: ")}{digits(a.moonPada, language)} · {tx(language, "नामाक्षर: ", "Naming syllable: ")}{nameSyllableFromNakshatra(a.moonNakshatraIndex, a.moonPada)}</p>
      </Panel>
    </>)}
    {makePage(4, <>
      <h3>{tx(language, "दोस्रो व्यक्तिको मुख्य जन्म-सङ्केत", "Person B: primary birth indicators")}</h3>
      {personSummary(b, language)}
      <KundaliDiagram chart={b} anchorSign={b.ascSignIndex} moonChart={false} language={language} title={tx(language, "दोस्रो व्यक्तिको लग्न कुण्डली", "Person B ascendant chart")} />
      <Panel title={tx(language, "नक्षत्र र नामाक्षर", "Nakshatra and naming syllable")}>
        <p>{tx(language, "जन्म नक्षत्र: ", "Birth Nakshatra: ")}{nakNameForChart(b, language)} · {tx(language, "चरण: ", "Pada: ")}{digits(b.moonPada, language)} · {tx(language, "नामाक्षर: ", "Naming syllable: ")}{nameSyllableFromNakshatra(b.moonNakshatraIndex, b.moonPada)}</p>
      </Panel>
    </>)}
    {makePage(5, <>
      <div className="jpr-score-hero"><strong>{digits(result.total, language)} <small>/ {digits(result.max, language)}</small></strong><span>{scoreVerdict(result.total, language)}</span></div>
      <p>{tx(language, "समग्र अङ्क आठवटा कूटमा प्राप्त अङ्क जोडेर बनेको हो। तलको तालिकाले प्रत्येक कूटको वास्तविक गणना-नतिजा देखाउँछ।", "The total is the sum of the points awarded across eight kootas. The table below displays the calculated result for each dimension.")}</p>
      <div className="jpr-table-wrap"><table><thead><tr><th>{tx(language, "कूट", "Koota")}</th><th>{tx(language, "अधिकतम", "Maximum")}</th><th>{tx(language, "प्राप्त अङ्क", "Score")}</th><th>{tx(language, "स्थिति", "Status")}</th></tr></thead><tbody>{result.items.map(x => <tr key={x.key}><td>{language === "ne" ? ({
        varna: "वर्ण", vashya: "वश्य", tara: "तारा", yoni: "योनि", maitri: "ग्रह मैत्री", gana: "गण", bhakoot: "भकूट", nadi: "नाडी",
      } as Record<string, string>)[x.key] : ({
        varna: "Varna", vashya: "Vashya", tara: "Tara", yoni: "Yoni", maitri: "Graha Maitri", gana: "Gana", bhakoot: "Bhakoot", nadi: "Nadi",
      } as Record<string, string>)[x.key]}</td><td>{digits(x.max, language)}</td><td>{digits(Number(x.score.toFixed(2)), language)}</td><td>{x.score >= x.max ? tx(language, "पूर्ण", "Full") : x.score <= 0 ? tx(language, "शून्य", "Zero") : tx(language, "आंशिक", "Partial")}</td></tr>)}</tbody></table></div>
      <Panel title={tx(language, "अङ्कको सही अर्थ", "Interpreting the score")}>
        <p>{tx(language, "उच्च वा न्यून अङ्कलाई परम्परागत गणना ढाँचाभित्र मात्र बुझ्नुपर्छ। विवाह वा सम्बन्धको निर्णयमा सहमति, व्यवहार, संवाद, जीवनलक्ष्य र आपसी सम्मानलाई प्राथमिकता दिनु उपयुक्त हुन्छ।", "High or low points should be understood only within this traditional scoring framework. Consent, behaviour, communication, shared goals and respect matter in real relationship decisions.")}</p>
      </Panel>
    </>)}
    {makePage(6, <>
      <p>{tx(language, "वर्ण र वश्य कूट अष्टकूट गणनाका प्रारम्भिक दुई पक्ष हुन्। तलको विवरणले प्रत्येक कूटको परम्परागत प्रयोजन र हालको इन्जिनको अङ्क छुट्टाछुट्टै देखाउँछ।", "Varna and Vashya are the first two dimensions in the Ashtakoota system. Their traditional purpose and existing engine scores are shown separately.")}</p>
      {twoKootas("varna", "vashya")}
      <Panel title={tx(language, "यो खण्ड कसरी पढ्ने?", "How to read this section")}>
        <p>{tx(language, "अधिकतम अङ्क सम्बन्धित कूटको परम्परागत भार हो; प्राप्त अङ्क सोही कूटका हाल लागू नियमबाट आउँछ। एउटा कूटको नतिजा मात्र हेरेर समग्र मिलानको निष्कर्ष ननिकाल्नुहोस्।", "Maximum points represent the weight assigned to that dimension; awarded points come from its current implemented rules. Do not infer the whole match from one dimension.")}</p>
      </Panel>
    </>)}
    {makePage(7, <>
      <p>{tx(language, "तारा र योनि कूट जन्म नक्षत्रसँग सम्बन्धित दुई फरक परम्परागत वर्गीकरण हुन्। तिनको आधार र स्कोर एकअर्कामा मिसाइएको छैन।", "Tara and Yoni are two distinct traditional dimensions associated with birth Nakshatras. Their definitions and scores are kept separate.")}</p>
      {twoKootas("tara", "yoni")}
      <Panel title={tx(language, "जन्म नक्षत्रको आधार", "The birth Nakshatra basis")}>
        <div className="jpr-two-columns"><div><h4>{a.input.name || tx(language, "पहिलो व्यक्ति", "Person A")}</h4><p>{nakNameForChart(a, language)} · {tx(language, "चरण ", "Pada ")}{digits(a.moonPada, language)}</p></div><div><h4>{b.input.name || tx(language, "दोस्रो व्यक्ति", "Person B")}</h4><p>{nakNameForChart(b, language)} · {tx(language, "चरण ", "Pada ")}{digits(b.moonPada, language)}</p></div></div>
      </Panel>
    </>)}
    {makePage(8, <>
      <p>{tx(language, "ग्रह मैत्री कूटले चन्द्र राशिका स्वामी ग्रहबीचको सम्बन्धलाई तुलना गर्छ; गण कूटले नक्षत्रलाई परम्परागत तीन समूहमा राख्छ।", "Graha Maitri compares the lords of the Moon signs, while Gana compares the traditional three Nakshatra groupings.")}</p>
      {twoKootas("maitri", "gana")}
      <Panel title={tx(language, "वर्गीकरणलाई कसरी बुझ्ने?", "Understanding the classifications")}>
        <p>{tx(language, "गणका नाम पौराणिक वर्गीकरण हुन्, मानिसको नैतिक मूल्य वा राम्रो/नराम्रो चरित्रको परीक्षण होइनन्। ग्रह मैत्री पनि परम्परागत नियमको सङ्केत हो, वास्तविक संवादको विकल्प होइन।", "Gana labels are mythological classifications, not moral rankings of people. Graha Maitri is a traditional rule, not a substitute for real communication.")}</p>
      </Panel>
    </>)}
    {makePage(9, <>
      <p>{tx(language, "भकूट र नाडी कूटले आफ्नो-आफ्नो परम्परागत नियम प्रयोग गर्छन्। यस प्रतिवेदनले हाल गणना भएको अङ्क देखाउँछ तर गणना नगरिएका अपवाद वा शमनको दाबी गर्दैन।", "Bhakoot and Nadi use their own traditional rules. This report displays the calculated scores without claiming to have evaluated exceptions or cancellation rules that are not implemented.")}</p>
      {twoKootas("bhakoot", "nadi")}
      <Panel title={tx(language, "नाडी र स्वास्थ्यबारे", "Nadi and health")}>
        <p>{tx(language, "नाडी कूट वैवाहिक परम्पराको ज्योतिषीय वर्गीकरण हो; यसलाई स्वास्थ्य, प्रजनन क्षमता वा कुनै चिकित्सकीय परिणामको निदान मान्नु हुँदैन।", "Nadi Koota is an astrological classification in a matching tradition; it must not be treated as a diagnosis of health, fertility or medical outcome.")}</p>
      </Panel>
    </>)}
    {makePage(10, <>
      <p>{tx(language, "दुवै व्यक्तिका लग्न कुण्डलीलाई एउटै दृश्य क्षेत्रमा राखिएको छ। यो तुलना ग्रहहरूको स्थितिलाई बुझ्नका लागि हो; यहाँ छुट्टै नयाँ स्कोर गणना गरिएको छैन।", "Both ascendant charts are displayed side by side to aid inspection of the placements. No new compatibility score is calculated here.")}</p>
      <div className="jpr-two-charts">
        <KundaliDiagram chart={a} anchorSign={a.ascSignIndex} moonChart={false} language={language} title={(a.input.name || tx(language, "पहिलो व्यक्ति", "Person A")) + " · " + tx(language, "लग्न कुण्डली", "Ascendant chart")} />
        <KundaliDiagram chart={b} anchorSign={b.ascSignIndex} moonChart={false} language={language} title={(b.input.name || tx(language, "दोस्रो व्यक्ति", "Person B")) + " · " + tx(language, "लग्न कुण्डली", "Ascendant chart")} />
      </div>
      <div className="jpr-two-charts">
        <KundaliDiagram chart={a} anchorSign={aMoon?.signIndex ?? a.ascSignIndex} moonChart={true} language={language} title={tx(language, "पहिलो व्यक्तिको चन्द्र कुण्डली", "Person A Moon chart")} />
        <KundaliDiagram chart={b} anchorSign={bMoon?.signIndex ?? b.ascSignIndex} moonChart={true} language={language} title={tx(language, "दोस्रो व्यक्तिको चन्द्र कुण्डली", "Person B Moon chart")} />
      </div>
    </>)}
    {makePage(11, <>
      <p>{tx(language, "यस पृष्ठले जन्मकुण्डली इन्जिनबाट उपलब्ध मङ्गल मूल्याङ्कन र दशा तालिकालाई सन्दर्भका रूपमा देखाउँछ। यी सूचनालाई अष्टकूटको ३६ अङ्कमा थपिएको छैन।", "This page provides Manglik assessments and Dasha context from the existing charts. These are not added to the 36-point Ashtakoota total.")}</p>
      <div className="jpr-two-columns"><Panel title={tx(language, "पहिलो व्यक्तिको मङ्गल स्थिति", "Person A Manglik result")}>
        <p>{tx(language, "लग्नबाट भाव: ", "House from ascendant: ")}{digits(a.manglik.fromLagna, language)}</p>
        <p>{tx(language, "चन्द्रबाट भाव: ", "House from Moon: ")}{digits(a.manglik.fromMoon, language)}</p>
        <p>{tx(language, "इन्जिनको वर्गीकरण: ", "Engine classification: ")}{language === "ne" ? ({None:"नदेखिएको",Mild:"हल्का",Moderate:"मध्यम",Strong:"प्रबल"} as Record<string,string>)[a.manglik.severity] : a.manglik.severity}</p>
      </Panel><Panel title={tx(language, "दोस्रो व्यक्तिको मङ्गल स्थिति", "Person B Manglik result")}>
        <p>{tx(language, "लग्नबाट भाव: ", "House from ascendant: ")}{digits(b.manglik.fromLagna, language)}</p>
        <p>{tx(language, "चन्द्रबाट भाव: ", "House from Moon: ")}{digits(b.manglik.fromMoon, language)}</p>
        <p>{tx(language, "इन्जिनको वर्गीकरण: ", "Engine classification: ")}{language === "ne" ? ({None:"नदेखिएको",Mild:"हल्का",Moderate:"मध्यम",Strong:"प्रबल"} as Record<string,string>)[b.manglik.severity] : b.manglik.severity}</p>
      </Panel></div>
      <div className="jpr-two-columns"><Panel title={tx(language, "पहिलो व्यक्तिको हालको दशा-सन्दर्भ", "Person A current Dasha context")}>
        {currentPeriod(a) ? <p>{grahaName(currentPeriod(a)!.lord.toLowerCase(), language)} · {bsDateText(currentPeriod(a)!.start, language)} – {bsDateText(currentPeriod(a)!.end, language)}</p> : <p>{tx(language, "हालको मिति उपलब्ध दशा-अवधिभित्र नपर्न सक्छ।", "The current date may fall outside the available period list.")}</p>}
      </Panel><Panel title={tx(language, "दोस्रो व्यक्तिको हालको दशा-सन्दर्भ", "Person B current Dasha context")}>
        {currentPeriod(b) ? <p>{grahaName(currentPeriod(b)!.lord.toLowerCase(), language)} · {bsDateText(currentPeriod(b)!.start, language)} – {bsDateText(currentPeriod(b)!.end, language)}</p> : <p>{tx(language, "हालको मिति उपलब्ध दशा-अवधिभित्र नपर्न सक्छ।", "The current date may fall outside the available period list.")}</p>}
      </Panel></div>
      <p className="jpr-note">{tx(language, "परम्परागत विधिमा मङ्गल दोषका अपवाद र शमन फरक हुन सक्छन्। यहाँ नदेखाइएका नियम वा कुण्डलीहरूको गणना भएको मानिएको छैन।", "Traditions differ on Manglik exceptions and cancellation. Unshown rules or divisional charts are not assumed to have been calculated.")}</p>
    </>)}
    {makePage(12, <>
      <div className="jpr-score-hero"><strong>{digits(result.total, language)} <small>/ {digits(result.max, language)}</small></strong><span>{scoreVerdict(result.total, language)}</span></div>
      <Panel title={tx(language, "आठ कूटको सारांश", "Summary of the eight kootas")}>
        <div className="jpr-table-wrap"><table><thead><tr><th>{tx(language, "कूट", "Koota")}</th><th>{tx(language, "अधिकतम", "Maximum")}</th><th>{tx(language, "प्राप्त", "Score")}</th></tr></thead><tbody>{result.items.map(x => <tr key={x.key}><td>{language === "ne" ? ({
          varna: "वर्ण", vashya: "वश्य", tara: "तारा", yoni: "योनि", maitri: "ग्रह मैत्री", gana: "गण", bhakoot: "भकूट", nadi: "नाडी",
        } as Record<string,string>)[x.key] : ({
          varna: "Varna", vashya: "Vashya", tara: "Tara", yoni: "Yoni", maitri: "Graha Maitri", gana: "Gana", bhakoot: "Bhakoot", nadi: "Nadi",
        } as Record<string,string>)[x.key]}</td><td>{digits(x.max, language)}</td><td>{digits(Number(x.score.toFixed(2)), language)}</td></tr>)}</tbody></table></div>
      </Panel>
      <Panel title={tx(language, "पद्धति तथा सीमाहरू", "Method and limitations")}>
        <p>{tx(language, "यो प्रतिवेदन हालको अष्टकूट कार्यान्वयनले दिएको परिणाम हो। परम्परा, क्षेत्र र पञ्चाङ्गअनुसार नियम, अपवाद तथा व्याख्या फरक पर्न सक्छन्। अङ्क विवाह सफल/असफल हुने निश्चित भविष्यवाणी होइन।", "This report uses the existing Ashtakoota implementation. Rules, exceptions and interpretations vary across traditions, regions and Panchangas. The score does not predict whether a marriage will succeed or fail.")}</p>
        <p>{tx(language, "दुवै व्यक्तिको सहमति, व्यवहार, संवाद, सुरक्षा, साझा जीवनलक्ष्य र पारस्परिक सम्मानलाई वास्तविक सम्बन्धका आधारका रूपमा प्राथमिकता दिनुहोस्।", "Prioritize consent, behaviour, communication, safety, shared life goals and mutual respect in real relationships.")}</p>
      </Panel>
      <p className="jpr-final-blessing">{tx(language, "मङ्गलं भवतु।", "May there be auspiciousness.")}</p>
    </>)}
  </div>;
}
