export const SITE = (process.env.PUBLIC_SITE_URL || "https://aafnaipatro.com").trim().replace(/\/+$/, "");
if (!/^https:\/\//.test(SITE)) throw new Error("PUBLIC_SITE_URL must be an absolute https URL");

// Approximate BS year for a moment in Asia/Kathmandu. worker/seo-window.ts replicates this exact
// formula (BS New Year treated as 14 April) so build-time sitemaps and runtime noindex agree.
export function approxBsYear(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu", year: "numeric", month: "numeric", day: "numeric"
  }).formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)]));
  const afterApproxNewYear = parts.month > 4 || (parts.month === 4 && parts.day >= 14);
  return parts.year + (afterApproxNewYear ? 57 : 56);
}
export const CURRENT_BS_YEAR = Number(process.env.SEO_BS_YEAR || approxBsYear());

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

const RAW_TOOL_ROUTES = [
  "/tools/astro", "/tools/nepali-typing", "/tools/preeti-converter", "/tools/bstoad", "/tools/adtobs",
  "/tools/calc", "/tools/age", "/tools/clock", "/tools/forex", "/tools/gold", "/tools/emi", "/tools/vat",
  "/tools/units", "/tools/words", "/tools/incometax", "/tools/landconverter", "/tools/nepaliqr", "/tools/fuelprice",
  "/tools/tithi-reminder", "/tools/sait", "/tools/baby-names", "/tools/janmadin-akhbar", "/tools/future-letter",
  "/tools/spell-check", "/tools/voice-typing", "/tools/ocr", "/tools/name-check", "/tools/read-aloud", "/tools/patro-bot"
];
if (RAW_TOOL_ROUTES.length !== 29) throw new Error(`Canonical tool inventory must remain exactly 29; received ${RAW_TOOL_ROUTES.length}`);

export const CITY_SLUGS = [
  "kathmandu", "pokhara", "biratnagar", "butwal", "new-york", "toronto", "london", "sydney", "melbourne",
  "tokyo", "seoul", "doha", "dubai", "riyadh", "kuala-lumpur", "kuwait-city"
];
export const DIASPORA_TODAY_ROUTES = CITY_SLUGS.map((slug) => `/today/${slug}`);

// Exact public routes the Worker answers with x-robots-tag noindex (connected-entry SEARCH_NOINDEX_EXACT,
// worker/index.ts secureResponse). They must never appear in a sitemap.
export const NOINDEX_EXACT_ROUTES = ["/samachar", "/developers", "/tools/api", "/widget/today", "/offline"];

// Must match worker/seo-window.ts historicalCalendarNoindex() cutoff exactly (BS year - 10).
export const SITEMAP_MIN_BS_YEAR = CURRENT_BS_YEAR - 10;
export const SITEMAP_MAX_BS_YEAR = CURRENT_BS_YEAR + 10;
export const isSitemapYear = (y) => Number(y) >= SITEMAP_MIN_BS_YEAR && Number(y) <= SITEMAP_MAX_BS_YEAR;

const RAW_CORE_INDEX_ROUTES = [
  "/", "/today", "/methodology", "/corrections", "/samudaya", "/tools", "/convert", "/rashifal", "/time-machine", "/on-this-day", "/fm", "/tv",
  "/jyotish/china", "/jyotish/matchmaking", "/about", "/sources", "/privacy", "/terms", "/contact",
  ...DIASPORA_TODAY_ROUTES
];

const RAW_COMMUNITY_ROUTES = [
  "/nepal-sambat/mandala", "/samudaya/lhosar", "/samudaya/tharu", "/samudaya/mithila",
  "/samudaya/kirat", "/samudaya/hijri", "/samudaya/chakra"
];

export const NOINDEX_PUBLIC_ROUTES = [
  "/samachar", "/developers", "/tools/api", "/mcp", "/widget/today"
];
export const PRIVATE_PREFIXES = ["/api/", "/compat-api/", "/me/", "/admin/", "/auth/"];

// Path prefixes the Worker marks noindex / private or redirects (connected-entry PRIVATE_SPA_PREFIXES,
// PRIVATE_TOOL_PATHS, LEGACY_REDIRECTS; worker/index.ts private routes).
const WORKER_NOINDEX_PREFIXES = ["/me", "/family", "/my-diary", "/notes", "/planner", "/settings", "/my-data", "/admin", "/offline", "/widget"];
const WORKER_NOINDEX_EXACT = new Set(["/mcp", "/tools/family", "/tools/my-data", "/tools/card", "/tools/tithi"]);
const WORKER_REDIRECT_EXACT = new Set([
  "/aaja", "/astro", "/tithi", "/card", "/diaspora", "/jyotish/rashifal", "/jyotish/china/rashi", "/jyotish/janma-patro",
  "/explore", "/search", "/feedback", "/data-trust", "/astrology", "/nepal-sambat", "/festivals"
]);

/**
 * Mirrors the Worker's runtime robots rules for a canonical path. Returns a reason string when the
 * path would be served noindex (or redirected / private), otherwise null. Used by every sitemap
 * writer and by verify-seo-build.mjs.
 */
export function sitemapExclusionReason(path) {
  const p = String(path || "");
  if (!p.startsWith("/")) return "not-a-root-relative-path";
  if (/[?#]/.test(p)) return "query-or-fragment";
  if (p !== "/" && p.endsWith("/")) return "trailing-slash-duplicate";
  if (NOINDEX_EXACT_ROUTES.includes(p) || NOINDEX_PUBLIC_ROUTES.includes(p)) return "noindex-exact-route";
  if (PRIVATE_PREFIXES.some((prefix) => p.startsWith(prefix) || p === prefix.replace(/\/$/, ""))) return "private-prefix";
  if (WORKER_NOINDEX_EXACT.has(p)) return "worker-noindex-exact";
  if (WORKER_NOINDEX_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + "/"))) return "worker-noindex-prefix";
  if (WORKER_REDIRECT_EXACT.has(p)) return "legacy-redirect";
  if (/^\/on-this-day\/\d{2}-\d{2}$/.test(p)) return "history-day-noindex";
  const calendar = p.match(/^\/calendar\/(\d{4})(?:\/|$)/);
  if (calendar && !isSitemapYear(calendar[1])) return "calendar-year-outside-window";
  return null;
}
export const isIndexableRoute = (path) => sitemapExclusionReason(path) === null;

export const CORE_INDEX_ROUTES = RAW_CORE_INDEX_ROUTES.filter(isIndexableRoute);
export const TOOL_ROUTES = RAW_TOOL_ROUTES.filter(isIndexableRoute);
export const COMMUNITY_ROUTES = RAW_COMMUNITY_ROUTES.filter(isIndexableRoute);
if (TOOL_ROUTES.length !== 29) throw new Error(`Canonical tool sitemap must remain exactly 29; received ${TOOL_ROUTES.length}`);

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
