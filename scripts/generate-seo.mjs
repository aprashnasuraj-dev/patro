import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SITE, CURRENT_BS_YEAR, CORE_INDEX_ROUTES, TOOL_ROUTES, COMMUNITY_ROUTES,
  NOINDEX_PUBLIC_ROUTES, PRIVATE_PREFIXES, INDEXED_CALENDAR_YEARS,
  calendarRoutes, unique
} from "./seo-config.mjs";
import { loadCalendarSnapshot } from "./calendar-snapshot.mjs";

const root = process.cwd();
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const escapeXml = (value) => String(value).replace(/[<>&'\"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[ch]));
const freshDaily = new Set(["/", "/rashifal", "/fm", "/tv"]);

function entry(path) {
  const lastmod = freshDaily.has(path) ? `<lastmod>${today}</lastmod>` : "";
  return `  <url><loc>${escapeXml(SITE + (path === "/" ? "/" : path))}</loc>${lastmod}</url>`;
}
function urlset(routes) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...unique(routes).map(entry),
    "</urlset>", ""
  ].join("\n");
}

const calendarRows = await loadCalendarSnapshot();
const indexedYearSet = new Set(INDEXED_CALENDAR_YEARS);
const dayRoutesByBsYear = new Map(INDEXED_CALENDAR_YEARS.map((year) => [year, []]));
for (const row of calendarRows) {
  const year = Number(row.bs?.year);
  if (!indexedYearSet.has(year)) continue;
  dayRoutesByBsYear.get(year).push(`/date/${row.ad}`);
}
for (const year of INDEXED_CALENDAR_YEARS) {
  if (!(dayRoutesByBsYear.get(year)?.length >= 350)) throw new Error(`SEO day-page coverage is incomplete for BS ${year}`);
}

const sitemapFiles = [
  ["sitemap-pages.xml", CORE_INDEX_ROUTES],
  ["sitemap-tools.xml", TOOL_ROUTES],
  ["sitemap-community.xml", COMMUNITY_ROUTES],
  ...INDEXED_CALENDAR_YEARS.map((year) => [`sitemap-calendar-${year}.xml`, calendarRoutes([year])]),
  ...INDEXED_CALENDAR_YEARS.map((year) => [`sitemap-days-${year}.xml`, dayRoutesByBsYear.get(year)])
];
const indexedRoutes = unique(sitemapFiles.flatMap(([, routes]) => routes));
const sitemapIndex = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapFiles.map(([file]) => `  <sitemap><loc>${escapeXml(SITE + "/" + file)}</loc><lastmod>${today}</lastmod></sitemap>`),
  "</sitemapindex>", ""
].join("\n");

function crawlerGroup(agent) {
  return [`User-agent: ${agent}`, "Allow: /", ...PRIVATE_PREFIXES.map((path) => `Disallow: ${path}`), ""].join("\n");
}
const crawlerAgents = ["*", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "Googlebot", "Google-Extended", "Bingbot", "Claude-SearchBot", "Claude-User", "ClaudeBot", "PerplexityBot", "Perplexity-User"];
const robots = [
  "# Aafnai Patro crawl policy — public pages are discoverable; private/API surfaces are not.",
  ...crawlerAgents.map(crawlerGroup),
  `Sitemap: ${SITE}/sitemap.xml`, ""
].join("\n");

const llms = [
  "# आफ्नै पात्रो · Aafnai Patro",
  "",
  "> A bilingual Nepali calendar and utility service for Bikram Sambat (BS), Nepal date, tithi, festivals, BS↔AD conversion, astronomy, history, Rashifal, community calendars, FM and live TV.",
  "",
  `Canonical site: ${SITE}/`,
  "Primary languages: Nepali (ne) and English (en content on canonical pages).",
  "Canonical brand: आफ्नै पात्रो / Aafnai Patro.",
  "",
  "## Best citation targets",
  `- [Today / आजको नेपाली मिति](${SITE}/): Nepal date today, tithi, festivals and current Nepali calendar.`,
  `- [BS ↔ AD converter](${SITE}/convert): Nepali date conversion.`,
  `- [BS to AD](${SITE}/tools/bstoad): Bikram Sambat to Gregorian conversion.`,
  `- [AD to BS](${SITE}/tools/adtobs): Gregorian to Bikram Sambat conversion.`,
  `- [Astronomical calendar](${SITE}/tools/astro): astronomy and calendar context.`,
  `- [Sait](${SITE}/tools/sait): auspicious-time references.`,
  `- [On This Day](${SITE}/on-this-day): sourced historical discovery.`,
  `- [Time Machine](${SITE}/time-machine): historical timeline.`,
  `- [Rashifal](${SITE}/rashifal): Nepali horoscope experience.`,
  `- [Tools](${SITE}/tools): canonical Nepali utility index.`,
  "",
  "## Calendar archive",
  ...INDEXED_CALENDAR_YEARS.map((year) => `- Nepali Calendar ${year}: ${SITE}/calendar/${year}/01 through ${SITE}/calendar/${year}/12; factual day pages are listed in sitemap-days-${year}.xml.`),
  "",
  "## Citation and indexing notes",
  "- Prefer the canonical public page over private, account, developer or machine endpoints.",
  "- /api/*, /compat-api/*, /me/*, /admin/* and /auth/* are intentionally excluded from discovery.",
  "- Aggregated Samachar is a user feature but is intentionally not a search-index target because source material belongs to publishers.",
  "- Calendar pages use Nepali plus common romanizations such as Ashwin/Ashoj/Asoj and Poush/Push so multilingual queries resolve to the same canonical page.",
  "- Per-day pages are generated only from the repository's validated local calendar archive; static SEO does not invent tithi or holiday facts.",
  ""
].join("\n");

const humans = [
  "Aafnai Patro (आफ्नै पात्रो)",
  `Site: ${SITE}`,
  "Purpose: Nepali calendar, date conversion and everyday Nepali utilities.",
  "Languages: Nepali and English.",
  "Accuracy: calendar/tithi facts are sourced from the same validated local archive used by the product; static SEO copy never guesses daily panchang facts.",
  ""
].join("\n");

const manifest = {
  schema_version: 3,
  generated_at: new Date().toISOString(),
  site_url: SITE,
  brand: "आफ्नै पात्रो",
  alternate_brand: "Aafnai Patro",
  current_bs_year: CURRENT_BS_YEAR,
  indexed_calendar_years: INDEXED_CALENDAR_YEARS,
  sitemap_files: sitemapFiles.map(([file]) => file),
  canonical_tool_route_count: TOOL_ROUTES.length,
  indexed_day_route_count: [...dayRoutesByBsYear.values()].reduce((n, routes) => n + routes.length, 0),
  indexed_route_count: indexedRoutes.length,
  noindex_public_routes: NOINDEX_PUBLIC_ROUTES,
  private_prefixes: PRIVATE_PREFIXES,
  llms_txt: SITE + "/llms.txt",
  rendering_policy: "Build-time semantic HTML for canonical public routes; React replaces the prerender after load without removing product functionality.",
  archive_policy: "Calendar months 2070-2090 are prerender-ready; factual day pages and only a focused five-year BS window are indexed initially to control scaled-content risk."
};

await Promise.all([
  writeFile(resolve(root, "public/sitemap.xml"), sitemapIndex, "utf8"),
  ...sitemapFiles.map(([file, routes]) => writeFile(resolve(root, "public/" + file), urlset(routes), "utf8")),
  writeFile(resolve(root, "public/robots.txt"), robots, "utf8"),
  writeFile(resolve(root, "public/llms.txt"), llms, "utf8"),
  writeFile(resolve(root, "public/humans.txt"), humans, "utf8"),
  writeFile(resolve(root, "public/seo-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8")
]);

console.log(`Generated SEO discovery for ${SITE}: ${indexedRoutes.length} indexable routes including ${manifest.indexed_day_route_count} factual day pages, ${TOOL_ROUTES.length} tools, ${sitemapFiles.length} sitemap segments.`);
