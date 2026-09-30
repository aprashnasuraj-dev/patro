import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const rawSite = (process.env.PUBLIC_SITE_URL || "https://patro-blush.vercel.app").trim();
const site = rawSite.replace(/\/+$/, "");
if (!/^https:\/\//.test(site)) throw new Error("PUBLIC_SITE_URL must be an absolute https URL");

const currentAdYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Kathmandu" }).format(new Date()));
const currentBsYear = Number(process.env.SEO_BS_YEAR || currentAdYear + 57);
const calendarYears = [currentBsYear - 1, currentBsYear, currentBsYear + 1];

const coreRoutes = [
  "/", "/aaja", "/explore", "/astro", "/convert", "/samachar", "/time-machine", "/on-this-day",
  "/fm", "/tv", "/tools", "/tools/nepali-typing", "/tools/typingtools", "/tools/preeti-converter",
  "/tools/unicode-to-preeti", "/tools/preeti-to-unicode", "/tools/adtobs", "/tools/bstoad",
  "/tools/tithi", "/tools/diaspora", "/tools/card", "/tools/api",
  "/jyotish", "/jyotish/rashifal", "/jyotish/janma-patro",
  "/nepal-sambat", "/samudaya", "/about", "/sources", "/privacy", "/terms", "/contact"
];

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
const publicRoutes = unique([...coreRoutes, ...communityRoutes, ...calendarRoutes]);

const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (ch) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
}[ch]));

const today = new Date().toISOString().slice(0, 10);
const freshDaily = new Set(["/", "/aaja", "/samachar", "/jyotish/rashifal"]);

function urlEntry(path) {
  const loc = site + path;
  const lastmod = freshDaily.has(path) ? `<lastmod>${today}</lastmod>` : "";
  return `  <url><loc>${escapeXml(loc)}</loc>${lastmod}</url>`;
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

const disallowed = ["/api/", "/my-diary", "/family", "/my-data", "/settings", "/admin", "/notes", "/planner"];
const robots = [
  "# MeroPatro crawl policy. GPTBot, OAI-SearchBot, PerplexityBot, CCBot and Google-Extended inherit this public policy.",
  "User-agent: *",
  "Allow: /",
  ...disallowed.map((path) => "Disallow: " + path),
  `Sitemap: ${site}/sitemap.xml`,
  ""
].join("\n");

const llms = [
  "# MeroPatro",
  "",
  "> MeroPatro is a bilingual Nepali web application for Bikram Sambat calendar dates, tithi and festival context, AD↔BS conversion, Jyotish, astronomy, Nepali utilities, radio, TV and news discovery.",
  "",
  `Canonical site: ${site}/`,
  "Primary languages: Nepali (ne) and English (en).",
  "Brand name: MeroPatro. Alternate spacing: Mero Patro.",
  "Use the canonical MeroPatro URLs below when citing or linking to this service.",
  "",
  "## Core pages",
  `- [Today / आज](${site}/aaja): today's Nepali date and daily calendar context.`,
  `- [Date converter](${site}/convert): AD ↔ BS date conversion.`,
  `- [Tithi tool](${site}/tools/tithi): lunar tithi and panchang context.`,
  `- [Rashifal](${site}/jyotish/rashifal): daily, weekly and monthly राशिफल.`,
  `- [Astronomy calendar](${site}/astro): AD, BS, Nepal Sambat, lunar phase and astronomy context.`,
  `- [FM radio](${site}/fm): radio discovery and playback.`,
  `- [Live TV](${site}/tv): free live-channel discovery and playback.`,
  `- [Samachar](${site}/samachar): categorized Nepali news discovery with source links.`,
  `- [Community calendars](${site}/samudaya): Nepal Sambat and community calendar suites.`,
  "",
  "## Developer and machine-readable access",
  `- [Developer documentation](${site}/tools/api): public API and embed documentation.`,
  `- [Calendar sync API](${site}/api/v1/sync): machine-readable calendar synchronization endpoint.`,
  `- [Community calendars API](${site}/api/v1/communities): machine-readable public community calendar catalog.`,
  "",
  "## Indexing boundaries",
  "- Private/account routes such as /my-diary, /family, /my-data, /settings, /notes and /planner are intentionally excluded from indexing.",
  "- API responses are machine-readable sources but are marked noindex; cite the corresponding public page when a user-facing citation is needed.",
  ""
].join("\n");

const manifest = {
  schema_version: 2,
  generated_at: new Date().toISOString(),
  site_url: site,
  current_bs_year: currentBsYear,
  sitemap_calendar_years: calendarYears,
  sitemap_files: sitemapFiles.map(([file]) => file),
  indexed_route_count: publicRoutes.length,
  llms_txt: site + "/llms.txt",
  historical_calendar_policy: "Older calendar pages are omitted from sitemap and receive noindex,follow at runtime; they are not robots-blocked so crawlers can observe the noindex directive."
};

const writes = [
  writeFile(resolve(root, "public/sitemap.xml"), sitemapIndex, "utf8"),
  ...sitemapFiles.map(([file, routes]) => writeFile(resolve(root, "public/" + file), urlset(routes), "utf8")),
  writeFile(resolve(root, "public/robots.txt"), robots, "utf8"),
  writeFile(resolve(root, "public/llms.txt"), llms, "utf8"),
  writeFile(resolve(root, "public/seo-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8")
];

await Promise.all(writes);
console.log(`Generated SEO files for ${site}: ${publicRoutes.length} indexed routes across ${sitemapFiles.length} sitemap segments.`);
