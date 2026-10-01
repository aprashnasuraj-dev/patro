import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const rawSite = (process.env.PUBLIC_SITE_URL || "https://aafnaipatro.com").trim();
const site = rawSite.replace(/\/+$/, "");
if (!/^https:\/\//.test(site)) throw new Error("PUBLIC_SITE_URL must be an absolute https URL");

const currentAdYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Kathmandu" }).format(new Date()));
const currentBsYear = Number(process.env.SEO_BS_YEAR || currentAdYear + 57);
const calendarYears = [currentBsYear - 1, currentBsYear, currentBsYear + 1];

const coreRoutes = [
  "/",
  "/tools",
  "/convert",
  "/rashifal",
  "/samachar",
  "/time-machine",
  "/on-this-day",
  "/fm",
  "/tv",
  "/tools/api",
  "/jyotish/china",
  "/jyotish/matchmaking",
  "/samudaya",
  "/about",
  "/sources",
  "/privacy",
  "/terms",
  "/contact",
  "/developers"
];

// Exactly one canonical route per public tool. Aliases such as /tools/tax,
// /tools/land and /tools/qr remain functional but are intentionally omitted
// to avoid duplicate-content dilution.
const toolRoutes = [
  "/tools/astro",
  "/tools/nepali-typing",
  "/tools/preeti-converter",
  "/tools/bstoad",
  "/tools/adtobs",
  "/tools/calc",
  "/tools/age",
  "/tools/clock",
  "/tools/forex",
  "/tools/gold",
  "/tools/emi",
  "/tools/vat",
  "/tools/units",
  "/tools/words",
  "/tools/incometax",
  "/tools/landconverter",
  "/tools/nepaliqr",
  "/tools/fuelprice",
  "/tools/tithi-reminder",
  "/tools/sait",
  "/tools/baby-names",
  "/tools/janmadin-akhbar",
  "/tools/future-letter",
  "/tools/spell-check",
  "/tools/voice-typing",
  "/tools/ocr",
  "/tools/name-check",
  "/tools/read-aloud",
  "/tools/patro-bot"
];
if (toolRoutes.length !== 29) throw new Error(`SEO canonical tool inventory must remain exactly 29; received ${toolRoutes.length}`);

const communityRoutes = [
  "/nepal-sambat/mandala",
  "/samudaya/lhosar",
  "/samudaya/tharu",
  "/samudaya/mithila",
  "/samudaya/kirat",
  "/samudaya/hijri",
  "/samudaya/chakra"
];

const calendarRoutes = [];
for (const year of calendarYears) {
  for (let month = 1; month <= 12; month++) {
    calendarRoutes.push(`/calendar/${year}/${String(month).padStart(2, "0")}`);
  }
}

const unique = (items) => [...new Set(items)];
const indexedRoutes = unique([...coreRoutes, ...toolRoutes, ...communityRoutes, ...calendarRoutes]);
const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (ch) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
}[ch]));

const today = new Date().toISOString().slice(0, 10);
const freshDaily = new Set(["/", "/samachar", "/rashifal", "/fm", "/tv"]);

function urlEntry(path) {
  const lastmod = freshDaily.has(path) ? `<lastmod>${today}</lastmod>` : "";
  return `  <url><loc>${escapeXml(site + path)}</loc>${lastmod}</url>`;
}

function urlset(routes) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...unique(routes).map(urlEntry),
    "</urlset>",
    ""
  ].join("\n");
}

const sitemapFiles = [
  ["sitemap-pages.xml", coreRoutes],
  ["sitemap-tools.xml", toolRoutes],
  ["sitemap-community.xml", communityRoutes],
  ["sitemap-calendar.xml", calendarRoutes]
];

const sitemapIndex = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapFiles.map(([file]) => `  <sitemap><loc>${escapeXml(site + "/" + file)}</loc><lastmod>${today}</lastmod></sitemap>`),
  "</sitemapindex>",
  ""
].join("\n");

const robots = [
  "# Aafnai Patro public crawl policy. Private/account and API surfaces are excluded.",
  "User-agent: *",
  "Allow: /",
  "Disallow: /api/",
  "Disallow: /me/",
  "Disallow: /admin/",
  `Sitemap: ${site}/sitemap.xml`,
  ""
].join("\n");

const llms = [
  "# आफ्नै पात्रो · Aafnai Patro",
  "",
  "> A bilingual Nepali calendar and utility service for Bikram Sambat dates, tithi, festivals, AD↔BS conversion, Rashifal/Jyotish, astronomy, community calendars, history, FM radio, live TV and Nepali news discovery.",
  "",
  `Canonical site: ${site}/`,
  "Primary languages: Nepali (ne) and English (en).",
  "Brand: आफ्नै पात्रो (Aafnai Patro).",
  "Use canonical Aafnai Patro URLs below when citing or linking to this service.",
  "",
  "## Core pages",
  `- [Today / आज](${site}/): current Nepali date, tithi, festivals and daily calendar context.`,
  `- [Date converter](${site}/convert): AD ↔ BS conversion.`,
  `- [Rashifal](${site}/rashifal): राशिफल experience.`,
  `- [Time Machine](${site}/time-machine): browse historical moments by year.`,
  `- [On This Day](${site}/on-this-day): historical events for a selected calendar day.`,
  `- [Astronomy calendar](${site}/tools/astro): astronomy and calendar context.`,
  `- [FM radio](${site}/fm): radio discovery and playback.`,
  `- [Live TV](${site}/tv): live-channel discovery and playback.`,
  `- [Samachar](${site}/samachar): categorized Nepali news discovery with source links.`,
  `- [Community calendars](${site}/samudaya): Nepal Sambat and community calendar suites.`,
  "",
  "## Canonical public tools",
  ...toolRoutes.map((route) => `- [${route.split("/").at(-1)}](${site}${route})`),
  "",
  "## Developer and machine-readable access",
  `- [Developer documentation](${site}/developers): public API guidance.`,
  `- [Calendar sync API](${site}/api/v1/sync): machine-readable calendar synchronization endpoint.`,
  `- [Community catalog API](${site}/api/v1/communities): public community-calendar catalog.`,
  "",
  "## Indexing boundaries",
  "- /me/* and /admin/* are private/account surfaces and are intentionally excluded from crawling and indexing.",
  "- /api/* is machine-readable and intentionally excluded from search indexing; cite the corresponding public page for user-facing references.",
  "- Tool aliases remain usable but the 29 canonical tool URLs above are preferred for indexing and citations.",
  ""
].join("\n");

const manifest = {
  schema_version: 2,
  generated_at: new Date().toISOString(),
  site_url: site,
  brand: "आफ्नै पात्रो",
  alternate_brand: "Aafnai Patro",
  current_bs_year: currentBsYear,
  sitemap_calendar_years: calendarYears,
  sitemap_files: sitemapFiles.map(([file]) => file),
  canonical_tool_route_count: toolRoutes.length,
  indexed_route_count: indexedRoutes.length,
  llms_txt: site + "/llms.txt",
  historical_calendar_policy: "Older calendar pages are omitted from sitemap and may receive noindex,follow at runtime."
};

await Promise.all([
  writeFile(resolve(root, "public/sitemap.xml"), sitemapIndex, "utf8"),
  ...sitemapFiles.map(([file, routes]) => writeFile(resolve(root, "public/" + file), urlset(routes), "utf8")),
  writeFile(resolve(root, "public/robots.txt"), robots, "utf8"),
  writeFile(resolve(root, "public/llms.txt"), llms, "utf8"),
  writeFile(resolve(root, "public/seo-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8")
]);

console.log(`Generated SEO files for ${site}: ${indexedRoutes.length} indexed routes, ${toolRoutes.length} canonical tools, ${sitemapFiles.length} sitemap segments.`);
