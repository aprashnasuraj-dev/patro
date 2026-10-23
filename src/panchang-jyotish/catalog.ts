export type FeatureGroupId = "panchang" | "muhurat" | "jyotish" | "planets" | "nepal-calendar";
export type FeatureDisposition = "reuse" | "browser" | "source-review";

export type PatroFeature = {
  id: string;
  group: FeatureGroupId;
  titleNe: string;
  titleEn: string;
  descriptionNe: string;
  descriptionEn: string;
  href: string;
  disposition: FeatureDisposition;
};

export const FEATURE_GROUPS: Array<{
  id: FeatureGroupId;
  titleNe: string;
  titleEn: string;
  descriptionNe: string;
  descriptionEn: string;
  href: string;
  iconFeatureId: string;
}> = [
  {
    id: "panchang",
    titleNe: "दैनिक पञ्चाङ्ग",
    titleEn: "Daily Panchang",
    descriptionNe: "तिथि, नक्षत्र, योग, करण, सूर्योदय र दिनका परम्परागत समयखण्ड।",
    descriptionEn: "Tithi, Nakshatra, Yoga, Karana, sunrise and traditional daily windows.",
    href: "/panchang",
    iconFeatureId: "F001"
  },
  {
    id: "muhurat",
    titleNe: "शुभ साइत र मुहूर्त",
    titleEn: "Auspicious Timing",
    descriptionNe: "विवाह, गृह प्रवेश, व्रत, पर्व र शुभ समयका परम्परागत नियम।",
    descriptionEn: "Traditional timing for marriage, home entry, observances and auspicious windows.",
    href: "/muhurat",
    iconFeatureId: "F060"
  },
  {
    id: "jyotish",
    titleNe: "ज्योतिष गणक",
    titleEn: "Jyotish Calculators",
    descriptionNe: "जन्मपत्रो, राशि, नक्षत्र, लग्न र परम्परागत ज्योतिष गणना।",
    descriptionEn: "Birth chart, Rashi, Nakshatra, Lagna and traditional Jyotish calculations.",
    href: "/jyotish",
    iconFeatureId: "F036"
  },
  {
    id: "planets",
    titleNe: "ग्रह र खगोलीय घटना",
    titleEn: "Planets & Astronomy",
    descriptionNe: "ग्रहस्थिति, गोचर, चन्द्र अवस्था, ग्रहण र खगोलीय चक्र।",
    descriptionEn: "Planetary positions, transits, lunar phases, eclipses and astronomical cycles.",
    href: "/planets",
    iconFeatureId: "F044"
  },
  {
    id: "nepal-calendar",
    titleNe: "नेपाली संवत् र परम्परा",
    titleEn: "Nepal Calendars & Traditions",
    descriptionNe: "वि.सं., नेपाल संवत्, समुदाय पात्रो र क्षेत्रअनुसारका सांस्कृतिक परम्परा।",
    descriptionEn: "Bikram Sambat, Nepal Sambat, community calendars and regional traditions.",
    href: "/nepal-calendar",
    iconFeatureId: "F080"
  }
];

function feature(
  id: string,
  group: FeatureGroupId,
  titleNe: string,
  titleEn: string,
  descriptionNe: string,
  descriptionEn: string,
  href: string,
  disposition: FeatureDisposition = "browser"
): PatroFeature {
  return { id, group, titleNe, titleEn, descriptionNe, descriptionEn, href, disposition };
}

/**
 * One source of truth for the 91 feature entries. Existing canonical pages are reused;
 * fragment links jump to their feature section inside a hub and do not create duplicate
 * indexable URLs. "source-review" indicates a tradition-specific data table must be validated
 * before the tool may publish date-specific results.
 */
export const PATRO_FEATURES: PatroFeature[] = [
  // Group A — Daily Panchang (26)
  feature("F001", "panchang", "आजको विस्तृत पञ्चाङ्ग", "Daily Panchang Summary", "वि.सं., नेपाल संवत् र आजका प्रमुख पञ्चाङ्ग विवरण।", "BS, Nepal Sambat and today's key Panchang facts.", "/panchang#daily-summary"),
  feature("F002", "panchang", "तिथि र पक्ष", "Tithi & Paksha", "शुक्ल वा कृष्ण पक्षसहित तिथिको अवस्था।", "Tithi state with Shukla or Krishna Paksha.", "/panchang#tithi"),
  feature("F003", "panchang", "तिथि परिवर्तन समय", "Tithi Transition", "तिथि कहिले सुरु हुन्छ र कहिले समाप्त हुन्छ हेर्नुहोस्।", "See when the current Tithi starts and ends.", "/panchang#transitions"),
  feature("F004", "panchang", "नक्षत्र र पाद", "Nakshatra & Pada", "चन्द्र नक्षत्र, पाद र परिवर्तन समय।", "Moon Nakshatra, Pada and transition time.", "/panchang#nakshatra"),
  feature("F005", "panchang", "योग र परिवर्तन", "Yoga & Transition", "आजको नित्य योग र अर्को परिवर्तनको समय।", "Today's Nitya Yoga and next transition.", "/panchang#yoga"),
  feature("F006", "panchang", "करण र विष्टि", "Karana & Vishti", "करणको नाम, आधा-तिथि स्थिति र उपलब्ध समय।", "Karana name, half-Tithi state and available timing.", "/panchang#karana"),
  feature("F007", "panchang", "सूर्य राशि र चन्द्र राशि", "Sun & Moon Rashi", "गणनाको समय र पद्धतिसहित सूर्य तथा चन्द्र राशि।", "Sun and Moon signs with calculation time and method.", "/panchang#rashi"),
  feature("F008", "panchang", "अमान्त र पूर्णिमान्त महिना", "Amanta & Purnimanta", "चन्द्र महिनाको नामकरण प्रणालीको भिन्नता।", "Understand the difference between lunar-month naming systems.", "/panchang#month-system"),
  feature("F009", "panchang", "अधिक मास र क्षय मास", "Adhika & Kshaya Masa", "चन्द्र–सौर महिनाको विशेष अवस्था र व्याख्या।", "Special lunisolar month states and their meaning.", "/panchang#lunar-month"),
  feature("F011", "panchang", "पञ्चाङ्ग समयरेखा", "Panchang Timeline", "तिथि, नक्षत्र, योग र करणका परिवर्तन एउटै समयरेखामा।", "A single timeline for Tithi, Nakshatra, Yoga and Karana transitions.", "/panchang#timeline"),
  feature("F012", "panchang", "१२/२४ र २४+ घण्टा समय", "12/24/24+ Hour Display", "मध्यरातपछिका परम्परागत समयलाई स्पष्ट मिति सहित हेर्नुहोस्।", "Show post-midnight traditional times with an explicit date.", "/panchang#clock"),
  feature("F013", "panchang", "सूर्योदय र सूर्यास्त", "Sunrise & Sunset", "स्थानअनुसार सूर्योदय, सूर्यास्त र गणना विधि।", "Location-specific sunrise, sunset and calculation method.", "/panchang#sun"),
  feature("F014", "panchang", "चन्द्रोदय, चन्द्रास्त र प्रकाश", "Moonrise, Moonset & Illumination", "स्थानीय चन्द्रोदय तथा चन्द्रको प्रकाशित भाग।", "Local moonrise, moonset and illuminated fraction.", "/moon", "reuse"),
  feature("F015", "panchang", "राहुकाल", "Rahu Kalam", "स्थानीय सूर्योदयदेखि सूर्यास्तसम्मको परम्परागत समयखण्ड।", "Traditional daytime interval based on local sunrise and sunset.", "/panchang#rahu-kalam"),
  feature("F016", "panchang", "यमगण्ड", "Yamaganda", "स्थानीय दिनमान र वारअनुसारको समयखण्ड।", "Daytime interval derived from local day length and weekday.", "/panchang#yamaganda"),
  feature("F017", "panchang", "गुलिक काल", "Gulika Kalam", "स्थानीय वार र दिनमानका आधारमा गुलिक काल।", "Gulika interval from local weekday and daylight duration.", "/panchang#gulika"),
  feature("F018", "panchang", "अभिजित मुहूर्त", "Abhijit Muhurta", "दैनिक दिनमानबाट निकालिएको अभिजित मुहूर्त।", "Daily Abhijit Muhurta derived from local daylight.", "/panchang#abhijit-muhurta"),
  feature("F019", "panchang", "ब्रह्म मुहूर्त", "Brahma Muhurta", "रात र अर्को सूर्योदयका आधारमा ब्रह्म मुहूर्त।", "Brahma Muhurta derived from night length and next sunrise.", "/panchang#brahma-muhurta"),
  feature("F020", "panchang", "दिन/रात चौघडिया", "Day/Night Choghadiya", "वर्तमान व्यक्तिगत समय अनुभवमा उपलब्ध चौघडिया।", "Choghadiya available in the existing personal-time experience.", "/mytime", "reuse"),
  feature("F023", "panchang", "भद्रा / विष्टि", "Bhadra / Vishti", "विष्टि करणको समय र प्रचलित परम्परागत सावधानी।", "Vishti Karana timing and its traditional interpretation.", "/panchang#bhadra"),
  feature("F025", "panchang", "संक्रान्ति र सूर्य राशि प्रवेश", "Sankranti & Solar Ingress", "सूर्यको राशि परिवर्तन र उपलब्ध अभिलेख विवरण।", "Solar sign ingress and available archive details.", "/panchang#sankranti"),

  // Group B — Muhurat & auspicious timing (14)
  feature("F055", "muhurat", "विवाहको साइत", "Marriage Muhurat", "उपलब्ध आधिकारिक मिति र गणना गरिएको उम्मेदवार अलग-अलग।", "Keep published marriage dates distinct from calculated candidates.", "/tools/sait", "reuse"),
  feature("F056", "muhurat", "गृह प्रवेश", "Griha Pravesh", "गृह प्रवेशको मिति तथा नियमका लागि साइत उपकरण।", "Open the existing Sait tool for home-entry dates and rules.", "/tools/sait", "reuse"),
  feature("F057", "muhurat", "सवारी साधन खरिद", "Vehicle Purchase Muhurat", "सवारी साधन खरिदका लागि उपलब्ध साइत नियम।", "Existing Sait rules for vehicle purchases.", "/tools/sait", "reuse"),
  feature("F059", "muhurat", "व्रतबन्ध, नामकरण र व्यवसाय साइत", "Bratabandha, Namakaran & Business", "उपलब्ध संस्कार र व्यवसाय साइत एउटै उपकरणमा।", "Available lifecycle and business Muhurat categories in one tool.", "/tools/sait", "reuse"),
  feature("F067", "muhurat", "व्यक्तिगत शुभ समय", "Personal Auspicious Time", "विद्यमान व्यक्तिगत समय अनुभव खोल्नुहोस्।", "Open the existing personal-time experience.", "/mytime", "reuse"),

  // Group C — Jyotish calculators (19)
  feature("F027", "jyotish", "जन्मपत्रो", "Janma Kundali", "जन्म विवरणबाट जन्मपत्रिका बनाउन विद्यमान गणक खोल्नुहोस्।", "Use the existing birth-chart calculator.", "/janmapatro", "reuse"),
  feature("F028", "jyotish", "प्रश्न कुण्डली", "Prashna Kundali", "प्रश्नको समय र स्थानमा आधारित कुण्डली।", "Question-time chart based on the chosen time and location.", "/jyotish#prashna"),
  feature("F032", "jyotish", "कालसर्प योग गणक", "Kalasarpa Yoga Calculator", "जन्मपत्रिकाका ग्रहस्थितिबाट प्रचलित नियम जाँच्नुहोस्।", "Check the stated traditional rule against natal planetary positions.", "/jyotish#kalasarpa"),
  feature("F033", "jyotish", "शनि साढेसाती", "Shani Sadesati", "जन्म चन्द्र राशिको आधारमा शनि गोचर जाँच्नुहोस्।", "Check Saturn transit relative to the natal Moon sign.", "/jyotish#sadesati"),
  feature("F034", "jyotish", "जन्म राशि", "Janmarashi / Moon Sign", "विद्यमान जन्मपत्रोबाट चन्द्र राशि हेर्नुहोस्।", "Read the Moon sign from the existing birth-chart result.", "/jyotish#janmarashi"),
  feature("F035", "jyotish", "जन्म नक्षत्र र पाद", "Birthstar & Pada", "जन्म चन्द्रको नक्षत्र र पाद।", "Birth Moon Nakshatra and Pada.", "/jyotish#birthstar"),
  feature("F036", "jyotish", "जन्म लग्न", "Janma Lagna / Ascendant", "जन्मपत्रो गणकको लग्न र लग्न राशि।", "Ascendant and Lagna Rashi from the current chart engine.", "/jyotish#lagna"),
  feature("F037", "jyotish", "सूर्य राशि", "Surya Rashi / Sun Sign", "जन्म समयमा गणना गरिएको सूर्य राशि।", "Sun sign calculated for the birth instant.", "/jyotish#surya-rashi"),
  feature("F038", "jyotish", "मङ्गल दोष", "Mangal Dosha", "जन्मपत्रोमा उपलब्ध मङ्गल दोष विवरण।", "Mangal Dosha details already calculated by the birth-chart engine.", "/jyotish#mangal-dosha"),
  feature("F039", "jyotish", "गुण मिलान", "Kundali Milan", "विद्यमान गुण मिलान गणक प्रयोग गर्नुहोस्।", "Use the existing horoscope-matching calculator.", "/janmapatro/milan.html", "reuse"),
  feature("F040", "jyotish", "दैनिक राशिफल", "Daily Rashifal", "विद्यमान दैनिक वैदिक राशिफल खोल्नुहोस्।", "Open the existing daily Vedic Rashifal.", "/rashifal", "reuse"),
  feature("F041", "jyotish", "सहस्र पूर्णचन्द्रोदय", "1000 Full Moons", "चन्द्रचक्रमा आधारित एक हजार पूर्णिमाको समयरेखा।", "A timeline of one thousand full-moon instants.", "/jyotish#1000-moons"),
  feature("F042", "jyotish", "वैदिक समय गणक", "Vedic Time Calculator", "घटी र पला रूपान्तरणका लागि स्थानीय गणक।", "Local Ghati and Pala time conversion.", "/jyotish#vedic-time"),
  feature("F043", "jyotish", "नक्षत्र अनुसार बच्चाको नाम", "Nakshatra Baby Names", "विद्यमान नाम तथा नक्षत्र उपकरण खोल्नुहोस्।", "Open the existing baby-name and Nakshatra tool.", "/tools/baby-names", "reuse"),
  feature("F044", "jyotish", "जन्मपत्रो ग्रहस्थिति", "Natal Planetary Positions", "जन्मपत्रोबाट ग्रहको राशि, अंश र भाव।", "Planet signs, degrees and houses from the natal chart.", "/jyotish#natal-planets"),
  feature("F045", "jyotish", "विंशोत्तरी दशा", "Vimshottari Dasha", "विद्यमान जन्मपत्रो गणकका दशा अवधि।", "Dasha periods from the existing birth-chart engine.", "/jyotish#dasha"),

  // Group D — Planets & astronomy (20)
  feature("F046", "planets", "वर्तमान ग्रहस्थिति", "Current Sidereal Planetary Positions", "एकै गणना समयका ग्रह राशि र अंश।", "Planet signs and degrees at one declared evaluation instant.", "/planets#positions"),
  feature("F047", "planets", "ग्रह राशि प्रवेश", "Planetary Rashi Ingress", "निर्धारित ग्रहले राशि सीमा काटेको समय।", "Times when a selected planet crosses a sign boundary.", "/planets#rashi-ingress"),
  feature("F048", "planets", "ग्रह नक्षत्र प्रवेश", "Planetary Nakshatra Ingress", "ग्रहको नक्षत्र सीमा प्रवेश समय।", "Times when a planet crosses a Nakshatra boundary.", "/planets#nakshatra-ingress"),
  feature("F049", "planets", "ग्रह युति", "Planetary Conjunctions", "चयन गरिएको कोणीय दूरीमा ग्रहको युति।", "Planetary conjunctions at a selected angular separation.", "/planets#conjunctions"),
  feature("F050", "planets", "ग्रह दृष्टि र कोण", "Planetary Aspects", "चयन गरिएको कोण र सहनशीलताका आधारमा कोणीय घटना।", "Angular events using a selected aspect and tolerance.", "/planets#aspects"),
  feature("F051", "planets", "वक्री र मार्गी स्टेशन", "Retrograde / Direct Stations", "ग्रहको दीर्घांश गति उल्टिने वा फेरिने समय।", "Times when apparent longitudinal motion changes direction.", "/planets#stations"),
  feature("F053", "planets", "ग्रह गोचर", "Graha Gochara", "जन्म चन्द्र वा लग्नबाट वर्तमान ग्रहस्थिति हेर्नुहोस्।", "View transit positions relative to the natal Moon or Lagna.", "/planets#gochara"),
  feature("F054", "planets", "आगामी ग्रह घटना", "Upcoming Planetary Events", "चयन गरिएको समयसीमाका ग्रह घटना खोज्नुहोस्।", "Search planetary events within a chosen time window.", "/planets#upcoming"),
  feature("F069", "planets", "चन्द्र कला, पूर्णिमा र औंसी", "Moon Phases, Full & New Moon", "विद्यमान चन्द्र पृष्ठमा पूर्ण विवरण हेर्नुहोस्।", "See complete details on the existing Moon page.", "/moon", "reuse"),
  feature("F070", "planets", "सूर्य ग्रहण", "Solar Eclipse", "ग्रहण मिति र स्थानीय दृश्यता।", "Eclipse dates and local visibility.", "/eclipse", "reuse"),
  feature("F071", "planets", "चन्द्र ग्रहण", "Lunar Eclipse", "चन्द्र ग्रहण मिति र स्थानीय दृश्यता।", "Lunar eclipse dates and local visibility.", "/eclipse", "reuse"),
  feature("F072", "planets", "वसन्त विषुव", "Vernal Equinox", "सूर्यको खगोलीय निर्देशाङ्कबाट विषुवको समय।", "Equinox instant from solar coordinates.", "/planets#vernal-equinox"),
  feature("F073", "planets", "ग्रीष्म अयनान्त", "Summer Solstice", "उत्तरी गोलार्धको ग्रीष्म अयनान्त समय।", "Northern-hemisphere summer solstice instant.", "/planets#summer-solstice"),
  feature("F074", "planets", "शरद विषुव", "Autumnal Equinox", "सूर्यको खगोलीय निर्देशाङ्कबाट शरद विषुवको समय।", "Autumnal equinox instant from solar coordinates.", "/planets#autumnal-equinox"),
  feature("F075", "planets", "शीत अयनान्त", "Winter Solstice", "उत्तरी गोलार्धको शीत अयनान्त समय।", "Northern-hemisphere winter solstice instant.", "/planets#winter-solstice"),
  feature("F076", "planets", "ग्रहस्थिति तालिका", "Planet Position Table", "वर्तमान ग्रहका राशि, अंश र गणना समय।", "Current planet signs, degrees and evaluation time.", "/planets#position-table"),
  feature("F078", "planets", "वक्री / मार्गी पात्रो", "Retrograde / Direct Calendar", "ग्रहको गति परिवर्तनका घटनाको सूची।", "A listing of planetary direction-change events.", "/planets#retrograde-calendar"),

  // Group E — Nepal calendars, observances and regional calendars (12)
  feature("F080", "nepal-calendar", "बिक्रम संवत् पात्रो", "Bikram Sambat Calendar", "विद्यमान नेपाली पात्रो र मिति रूपान्तरण।", "Existing Nepali calendar and date-conversion experience.", "/", "reuse"),
  feature("F081", "nepal-calendar", "नेपाल संवत्", "Nepal Sambat", "विद्यमान नेपाल संवत् पात्रो र चाडपर्व।", "Existing Nepal Sambat calendar and observances.", "/nepal-sambat/mandala", "reuse"),
  feature("F090", "nepal-calendar", "समुदाय पात्रो", "Community Calendars", "ल्होसार, थारु, मिथिला, किरात र हिजरी पात्रो।", "Lhosar, Tharu, Mithila, Kirat and Hijri calendars.", "/samudaya", "reuse"),
];

/**
 * An entry in the 91-row directory is not automatically a completed calculator.
 * This explicit availability registry avoids turning source-review/reference cards
 * into promises of a result that has not passed engineering and Nepal-rule review.
 */
const FUNCTIONAL_BROWSER_ENTRIES = new Set([
  "F001","F002","F003","F004","F005","F006","F007","F008","F009","F011","F012","F013",
  "F015","F016","F017","F018","F019","F023","F025",
  "F028","F032","F033","F034","F035","F036","F037","F038","F041","F042","F044","F045",
  "F046","F047","F048","F049","F050","F051","F053","F054","F072","F073","F074","F075","F076","F078"
]);
export type FeatureAvailability = "existing" | "browser-preview" | "reference";
// These two features can compute Nakshatra membership intervals, but their output
// remains explicitly a candidate until Nepal-specific source/observance review passes.
const CANDIDATE_ONLY_SOURCE_REVIEW_PREVIEWS = new Set(["F021", "F022"]);
export function getFeatureAvailability(feature: PatroFeature): FeatureAvailability {
  if (feature.disposition === "reuse") return "existing";
  if (CANDIDATE_ONLY_SOURCE_REVIEW_PREVIEWS.has(feature.id)) return "browser-preview";
  if (feature.disposition === "source-review" || !FUNCTIONAL_BROWSER_ENTRIES.has(feature.id)) return "reference";
  return "browser-preview";
}
export const FEATURE_COUNT = PATRO_FEATURES.length;
export const EXPECTED_FEATURE_COUNT = 62;

export function getFeaturesForGroup(group: FeatureGroupId) {
  return PATRO_FEATURES.filter((item) => item.group === group);
}

export function getFeatureById(id: string) {
  return PATRO_FEATURES.find((item) => item.id === id);
}

export function validateFeatureCatalog() {
  const ids = PATRO_FEATURES.map((item) => item.id);
  const unique = new Set(ids);
  const countByGroup = Object.fromEntries(
    FEATURE_GROUPS.map((group) => [group.id, PATRO_FEATURES.filter((item) => item.group === group.id).length])
  ) as Record<FeatureGroupId, number>;
  return {
    count: ids.length,
    uniqueIds: unique.size,
    countByGroup,
    valid: ids.length === EXPECTED_FEATURE_COUNT && unique.size === EXPECTED_FEATURE_COUNT &&
      Object.values(countByGroup).reduce((sum, count) => sum + count, 0) === EXPECTED_FEATURE_COUNT
  };
}
