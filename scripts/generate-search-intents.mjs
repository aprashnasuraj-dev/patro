import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SITE, CURRENT_BS_YEAR, BS_MONTHS, TOOL_ROUTES, CORE_INDEX_ROUTES, COMMUNITY_ROUTES,
  CITY_SLUGS, INDEXED_CALENDAR_YEARS, calendarYearRoute, calendarYearRoutes, calendarRoute, calendarRoutes, unique
} from "./seo-config.mjs";

const root = process.cwd();
const catalog = JSON.parse(await readFile(resolve(root, "seo/search-intents.json"), "utf8"));
const pages = { ...(catalog.core || {}), ...(catalog.tools || {}) };
const devanagari = /[\u0900-\u097F]/u;
const normalize = (value) => String(value || "").trim().replace(/\s+/g, " ");
const nepaliDigits = (value) => String(value).replace(/\d/g, (digit) => "०१२३४५६७८९"[Number(digit)]);
const rows = new Map();
const byRoute = new Map();

function add(query, route, alias, family = "canonical", priority = 50) {
  const q = normalize(query);
  if (!q || q.length < 3 || q.length > 140) return;
  const key = q.toLocaleLowerCase("en-US");
  const existing = rows.get(key);
  if (existing && existing.priority <= priority) return;
  const row = { query: q, route, alias: normalize(alias || q), family, locale: devanagari.test(q) ? "ne" : "en", priority };
  rows.set(key, row);
  if (!byRoute.has(route)) byRoute.set(route, new Map());
  byRoute.get(route).set(key, row);
}

function expand(alias, route, family = "canonical") {
  const base = normalize(alias);
  if (!base) return;
  add(base, route, base, family, 5);
  if (devanagari.test(base)) {
    for (const query of [
      `${base} अनलाइन`, `अनलाइन ${base}`, `निःशुल्क ${base}`, `${base} नेपाल`, `${base} टुल`, `${base} वेबसाइट`, `${base} मोबाइल`,
      `${base} ${nepaliDigits(CURRENT_BS_YEAR)}`, `${base} ${CURRENT_BS_YEAR}`, `${base} 2026`, `${base} कसरी प्रयोग गर्ने`, `${base} छिटो`, `${base} सजिलो`,
      `${base} बिना लगइन`, `आफ्नै पात्रो ${base}`
    ]) add(query, route, base, family, 30);
  } else {
    for (const query of [
      `${base} online`, `free ${base}`, `${base} Nepal`, `Nepal ${base}`, `${base} Nepali`, `${base} tool`, `${base} website`, `${base} app`, `${base} mobile`,
      `${base} browser`, `${base} 2026`, `${base} ${CURRENT_BS_YEAR}`, `${base} ${CURRENT_BS_YEAR} BS`, `${base} online free`, `${base} without login`,
      `${base} no signup`, `how to use ${base}`, `how do I use ${base}`, `Aafnai Patro ${base}`, `${base} for Nepal`
    ]) add(query, route, base, family, 30);
  }
}

const HIGH_VALUE = {
  "/": [
    "nepali calendar", "nepal calendar", "nepali patro", "नेपाली पात्रो", "nepali calendar 2083", "nepali calendar 2026",
    "bikram sambat calendar", "BS calendar Nepal", "Nepal patro", "आफ्नै पात्रो", "aafnai patro",
    "nepali calendar app", "नेपाली क्यालेन्डर एप", "patro", "पात्रो", "nepali patro online", "nepali calendar with tithi"
  ],
  "/today": [
    "aaja kati gate", "aaj kati gate", "aja kati gate", "aaja kati gate ho", "आज कति गते", "आज कति गते हो", "आजको नेपाली मिति",
    "nepali date today", "today nepali date", "nepal date today", "current nepali date", "today date in nepal", "aaj ko miti", "aaja ko miti",
    "nepal ma aaja kati gate", "today bikram sambat date", "what is nepali date today", "what is today's date in nepal",
    "nepali miti today", "nepali date today in bs", "today tithi nepali", "आजको तिथि", "aajako panchang", "आजको पञ्चाङ्ग", "nepali date widget"
  ],
  "/convert": [
    "nepali date converter", "nepali miti converter", "BS to AD converter", "AD to BS converter", "bs ad converter nepal", "bikram sambat converter",
    "nepali date to english date", "english date to nepali date", "convert nepali date to english", "convert english date to nepali",
    "nepali date of birth converter", "passport nepali date converter", "visa nepali date converter", "citizenship date converter nepal",
    "eng to nepali date converter", "अङ्ग्रेजीबाट नेपाली मिति"
  ],
  "/tools/nepali-typing": [
    "nepali typing", "nepali typing online", "english to nepali typing", "roman to nepali typing", "nepali unicode typing", "type in nepali",
    "nepali keyboard online", "online nepali keyboard", "nepali word suggestion typing", "roman nepali to unicode", "नेपाली टाइपिङ", "नेपाली युनिकोड टाइपिङ",
    "how to type nepali online", "how to type in nepali with english keyboard"
  ],
  "/tools/preeti-converter": ["preeti to unicode", "unicode to preeti", "preeti converter", "preeti unicode converter", "preeti font converter", "प्रीति युनिकोड रूपान्तरण"],
  "/rashifal": ["aaja ko rashifal", "today rashifal nepali", "nepali rashifal", "आजको राशिफल", "daily horoscope nepal", "nepali horoscope today"],
  "/tools/astro": ["nepali astronomical calendar", "astronomical calendar nepal", "nepali panchang", "moon phase nepal", "sunrise sunset nepal", "nepali tithi calendar", "खगोलीय पात्रो"],
  "/time-machine": ["nepal history timeline", "nepal time machine", "nepali history by date", "नेपाल इतिहास समयरेखा"],
  "/on-this-day": ["on this day nepal", "today in nepal history", "आज इतिहासमा", "nepal historical events today"],
  "/fm": ["nepali fm online", "nepal radio online", "live nepali radio", "nepali fm radio", "नेपाल एफएम रेडियो"],
  "/tv": ["nepal live tv", "nepali tv online", "live tv nepal", "free nepali live tv", "नेपाल लाइभ टिभी"],
  "/jyotish/china": ["nepali kundali", "janma kundali nepal", "nepali birth chart", "janma patro", "जन्मपत्रिका", "चिना बनाउने"],
  "/jyotish/matchmaking": ["kundali matching nepal", "guna milan nepali", "nepali marriage matching", "कुण्डली मिलान", "गुण मिलान"],
  "/festivals": [
    "nepali public holidays", "सार्वजनिक बिदा", "nepali festival calendar", "नेपाली चाडपर्व", "dashain tihar date",
    "दशैं तिहार मिति", "nepali calendar dashain date", "nepali festival list", "holiday list nepal", "festival dates nepal"
  ],
  "/tools/sait": [
    "subha sait", "शुभ साइत", "bibaha sait", "विवाह साइत", "today choghadiya nepali", "nepali choghadiya today",
    "auspicious time nepal", "marriage sait nepal"
  ]
};
for (const [route, queries] of Object.entries(HIGH_VALUE)) for (const query of queries) add(query, route, query, "high-value", 1);

for (const [route, meta] of Object.entries(pages)) {
  if (!Array.isArray(meta.aliases) || meta.aliases.length < 5) throw new Error(`SEO aliases too weak for ${route}`);
  const bases = unique([
    ...meta.aliases,
    meta.title?.replace(/·.*$/u, "").trim(),
    route.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ")
  ].filter(Boolean));
  for (const alias of bases) expand(alias, route);
}

const CORE_SEEDS = {
  "/tools": ["nepali online tools", "nepal tools", "free nepali tools", "नेपाली अनलाइन टुल्स", "daily tools nepal"],
  "/samudaya": ["nepal community calendar", "community patro nepal", "समुदाय पात्रो", "nepal cultural calendar"],
  "/methodology": ["nepali calendar accuracy", "how nepali calendar works", "bikram sambat methodology"],
  "/sources": ["nepali calendar sources", "bikram sambat source", "nepali patro source"],
  "/corrections": ["nepali calendar correction", "report nepali calendar error"],
  "/about": ["aafnai patro", "about aafnai patro", "आफ्नै पात्रो बारे"]
};
for (const [route, seeds] of Object.entries(CORE_SEEDS)) for (const seed of seeds) expand(seed, route, "core");

const COMMUNITY_SEEDS = {
  "/nepal-sambat/mandala": ["nepal sambat calendar", "newar calendar", "नेपाल संवत् पात्रो", "nepal sambat today"],
  "/samudaya/lhosar": ["lhosar calendar", "tamang lhosar calendar", "gurung lhosar calendar", "ल्होसार पात्रो"],
  "/samudaya/tharu": ["tharu calendar", "tharu patro", "थारु पात्रो"],
  "/samudaya/mithila": ["mithila calendar", "maithili calendar", "मिथिला पात्रो", "मैथिली पात्रो"],
  "/samudaya/kirat": ["kirat calendar", "rai limbu calendar", "किरात पात्रो"],
  "/samudaya/hijri": ["hijri calendar nepal", "islamic calendar nepal", "हिजरी पात्रो नेपाल"],
  "/samudaya/chakra": ["nepal festival cycle", "community festival calendar nepal", "समुदाय चक्र"]
};
for (const route of COMMUNITY_ROUTES) for (const seed of COMMUNITY_SEEDS[route] || []) expand(seed, route, "community");

for (const year of INDEXED_CALENDAR_YEARS) {
  const yearRoute = calendarYearRoute(year);
  for (const query of [
    `Nepali calendar ${year}`, `Nepal calendar ${year}`, `Nepali patro ${year}`, `Bikram Sambat calendar ${year}`, `BS calendar ${year}`,
    `नेपाली पात्रो ${year}`, `${year} नेपाली पात्रो`, `${nepaliDigits(year)} नेपाली पात्रो`, `calendar ${year} Nepal`, `Nepali calendar ${year} festivals`,
    `Nepali calendar ${year} holidays`, `Nepali calendar ${year} months`
  ]) add(query, yearRoute, `calendar ${year}`, "calendar-year", 8);

  for (const month of BS_MONTHS) {
    const route = calendarRoute(year, month.n);
    const roman = unique([month.en, ...month.aliases.split(/\s+/)]);
    const phrases = [
      `${month.ne} ${nepaliDigits(year)} पात्रो`, `${month.ne} ${year} पात्रो`, `${month.ne} ${year} calendar`, `नेपाली पात्रो ${month.ne} ${year}`,
      `nepali calendar ${year} ${month.en}`, `${month.en} ${year} nepali calendar`, `${year} ${month.en} calendar`, `${month.en} ${year} patro`,
      `bikram sambat ${year} ${month.en}`, `${month.en} month nepali calendar ${year}`
    ];
    for (const name of roman) phrases.push(`${name} ${year} calendar`, `nepali calendar ${name} ${year}`, `${name} ${year} nepali patro`);
    for (const query of phrases) add(query, route, `${month.en} ${year}`, "calendar-month", 10);
  }
}

const CITY_NAMES = {
  kathmandu:"Kathmandu", pokhara:"Pokhara", biratnagar:"Biratnagar", butwal:"Butwal", "new-york":"New York", toronto:"Toronto", london:"London",
  sydney:"Sydney", melbourne:"Melbourne", tokyo:"Tokyo", seoul:"Seoul", doha:"Doha", dubai:"Dubai", riyadh:"Riyadh", "kuala-lumpur":"Kuala Lumpur", "kuwait-city":"Kuwait City"
};
for (const slug of CITY_SLUGS) {
  const city = CITY_NAMES[slug] || slug.replace(/-/g, " ");
  const route = `/today/${slug}`;
  for (const query of [
    `nepali date today in ${city}`, `today nepali date ${city}`, `nepali calendar ${city}`, `nepal date in ${city}`, `aaja kati gate ${city}`,
    `${city} nepali date`, `${city} nepali calendar today`, `bikram sambat date ${city}`, `nepali miti ${city}`, `today date nepal from ${city}`,
    `what is nepali date today in ${city}`, `current nepali date in ${city}`
  ]) add(query, route, city, "diaspora", 12);
}

const expectedRoutes = new Set([
  ...CORE_INDEX_ROUTES, ...TOOL_ROUTES, ...COMMUNITY_ROUTES,
  ...calendarYearRoutes(INDEXED_CALENDAR_YEARS), ...calendarRoutes(INDEXED_CALENDAR_YEARS)
]);
for (const row of rows.values()) {
  if (!expectedRoutes.has(row.route)) throw new Error(`Search intent points to a non-indexed canonical route: ${row.query} -> ${row.route}`);
}

const intents = [...rows.values()].sort((a, b) => a.priority - b.priority || a.route.localeCompare(b.route) || a.query.localeCompare(b.query));
const routes = Object.fromEntries([...byRoute.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([route, values]) => [
  route,
  [...values.values()].sort((a,b) => a.priority-b.priority || a.query.localeCompare(b.query)).map(({priority, ...row}) => row)
]));
const toolCoverage = Object.fromEntries(TOOL_ROUTES.map((route) => [route, routes[route]?.length || 0]));
const minimumToolCoverage = Math.min(...Object.values(toolCoverage));
const TARGET = 3000;
if (intents.length < TARGET) throw new Error(`Search-intent coverage must stay >=${TARGET} unique queries; generated ${intents.length}`);
if (minimumToolCoverage < 50) throw new Error(`Canonical tool search coverage is too shallow; minimum tool coverage=${minimumToolCoverage}`);

const payload = {
  schema_version: 2,
  generated_at: new Date().toISOString(),
  canonical_site: SITE,
  strategy: "Intent-to-canonical-route mapping for search QA, AI retrieval and discovery. It deliberately maps thousands of queries to useful canonical pages instead of creating thin doorway pages.",
  target_minimum: TARGET,
  query_count: intents.length,
  canonical_page_count: Object.keys(routes).length,
  canonical_tool_count: TOOL_ROUTES.length,
  minimum_tool_intents: minimumToolCoverage,
  tool_coverage: toolCoverage,
  priority_queries: HIGH_VALUE,
  routes,
  intents: intents.map(({priority, ...row}) => row)
};
const text = [
  "# Aafnai Patro search and AI intent map",
  `# ${intents.length} real-world query variants mapped to useful canonical pages.`,
  "# This is a discovery map, not a collection of doorway pages.",
  "",
  ...intents.map((row) => `${row.query} -> ${SITE}${row.route === "/" ? "/" : row.route}`),
  ""
].join("\n");

await mkdir(resolve(root, "public/.well-known"), { recursive: true });
await Promise.all([
  writeFile(resolve(root, "public/search-intents.json"), JSON.stringify(payload, null, 2) + "\n", "utf8"),
  writeFile(resolve(root, "public/search-intents.txt"), text, "utf8"),
  writeFile(resolve(root, "public/.well-known/search-intents.json"), JSON.stringify({
    schema_version: payload.schema_version,
    canonical_site: SITE,
    query_count: payload.query_count,
    canonical_page_count: payload.canonical_page_count,
    canonical_tool_count: payload.canonical_tool_count,
    minimum_tool_intents: payload.minimum_tool_intents,
    search_map: `${SITE}/search-intents.json`,
    text_map: `${SITE}/search-intents.txt`
  }, null, 2) + "\n", "utf8")
]);

console.log(`Generated ${intents.length} unique search/AI intents across ${Object.keys(routes).length} canonical routes; minimum tool coverage ${minimumToolCoverage}.`);
