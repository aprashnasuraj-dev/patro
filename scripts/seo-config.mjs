export const SITE = (process.env.PUBLIC_SITE_URL || "https://aafnaipatro.com").trim().replace(/\/+$/, "");
if (!/^https:\/\//.test(SITE)) throw new Error("PUBLIC_SITE_URL must be an absolute https URL");

const kathmanduParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kathmandu", year: "numeric", month: "numeric", day: "numeric"
}).formatToParts(new Date()).filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)]));
const afterApproxNewYear = kathmanduParts.month > 4 || (kathmanduParts.month === 4 && kathmanduParts.day >= 14);
const inferredBsYear = kathmanduParts.year + (afterApproxNewYear ? 57 : 56);
export const CURRENT_BS_YEAR = Number(process.env.SEO_BS_YEAR || inferredBsYear);

export const BS_MONTHS = [
  { n: 1, ne: "बैशाख", en: "Baisakh", aliases: "Baisakh Baishakh" },
  { n: 2, ne: "जेठ", en: "Jestha", aliases: "Jestha Jeth" },
  { n: 3, ne: "असार", en: "Ashadh", aliases: "Ashadh Asar" },
  { n: 4, ne: "साउन", en: "Shrawan", aliases: "Shrawan Sawan Saun" },
  { n: 5, ne: "भदौ", en: "Bhadra", aliases: "Bhadra Bhadau" },
  { n: 6, ne: "असोज", en: "Ashwin", aliases: "Ashwin Ashoj Asoj" },
  { n: 7, ne: "कार्तिक", en: "Kartik", aliases: "Kartik Kattik" },
  { n: 8, ne: "मंसिर", en: "Mangsir", aliases: "Mangsir Margashirsha" },
  { n: 9, ne: "पुष", en: "Poush", aliases: "Poush Push Paush" },
  { n: 10, ne: "माघ", en: "Magh", aliases: "Magh" },
  { n: 11, ne: "फागुन", en: "Falgun", aliases: "Falgun Phagun" },
  { n: 12, ne: "चैत", en: "Chaitra", aliases: "Chaitra Chait" }
];

export const TOOL_ROUTES = [
  "/tools/astro", "/tools/nepali-typing", "/tools/preeti-converter", "/tools/bstoad", "/tools/adtobs",
  "/tools/calc", "/tools/age", "/tools/clock", "/tools/forex", "/tools/gold", "/tools/emi", "/tools/vat",
  "/tools/units", "/tools/words", "/tools/incometax", "/tools/landconverter", "/tools/nepaliqr", "/tools/fuelprice",
  "/tools/tithi-reminder", "/tools/sait", "/tools/baby-names", "/tools/janmadin-akhbar", "/tools/future-letter",
  "/tools/spell-check", "/tools/voice-typing", "/tools/ocr", "/tools/name-check", "/tools/read-aloud", "/tools/patro-bot"
];
if (TOOL_ROUTES.length !== 29) throw new Error(`Canonical tool inventory must remain exactly 29; received ${TOOL_ROUTES.length}`);

export const CITY_SLUGS = [
  "kathmandu", "pokhara", "biratnagar", "butwal", "new-york", "toronto", "london", "sydney", "melbourne",
  "tokyo", "seoul", "doha", "dubai", "riyadh", "kuala-lumpur", "kuwait-city"
];
export const DIASPORA_TODAY_ROUTES = CITY_SLUGS.map((slug) => `/today/${slug}`);

export const CORE_INDEX_ROUTES = [
  "/", "/today", "/methodology", "/corrections", "/samudaya", "/tools", "/convert", "/rashifal", "/time-machine", "/on-this-day", "/fm", "/tv",
  "/jyotish/china", "/jyotish/matchmaking", "/about", "/sources", "/privacy", "/terms", "/contact",
  ...DIASPORA_TODAY_ROUTES
];

export const COMMUNITY_ROUTES = [
  "/nepal-sambat/mandala", "/samudaya/lhosar", "/samudaya/tharu", "/samudaya/mithila",
  "/samudaya/kirat", "/samudaya/hijri", "/samudaya/chakra"
];

export const NOINDEX_PUBLIC_ROUTES = [
  "/samachar", "/developers", "/tools/api", "/mcp", "/widget/today"
];
export const PRIVATE_PREFIXES = ["/api/", "/compat-api/", "/me/", "/admin/", "/auth/"];

export const INDEXED_CALENDAR_YEARS = [CURRENT_BS_YEAR - 2, CURRENT_BS_YEAR - 1, CURRENT_BS_YEAR, CURRENT_BS_YEAR + 1, CURRENT_BS_YEAR + 2];
export const PRERENDER_CALENDAR_YEARS = Array.from({ length: 21 }, (_, i) => 2070 + i);

export function calendarYearRoute(year) {
  return `/calendar/${year}`;
}
export function calendarYearRoutes(years = INDEXED_CALENDAR_YEARS) {
  return years.map((year) => calendarYearRoute(year));
}
export function calendarRoute(year, month) {
  return `/calendar/${year}/${String(month).padStart(2, "0")}`;
}
export function calendarRoutes(years = INDEXED_CALENDAR_YEARS) {
  return years.flatMap((year) => BS_MONTHS.map((month) => calendarRoute(year, month.n)));
}

export function unique(items) {
  return [...new Set(items)];
}
