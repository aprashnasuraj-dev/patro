import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const rawSite = (process.env.PUBLIC_SITE_URL || "https://aafnaipatro.com").trim();
const site = rawSite.replace(/\/+$/, "");
if (!/^https:\/\//.test(site)) throw new Error("PUBLIC_SITE_URL must be an absolute https URL");

const currentAdYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Kathmandu" }).format(new Date()));
const currentBsYear = Number(process.env.SEO_BS_YEAR || currentAdYear + 57);
const calendarYears = [currentBsYear - 1, currentBsYear, currentBsYear + 1];

const publicRoutes = [
  "/", "/explore", "/astro", "/convert", "/samachar", "/time-machine", "/on-this-day",
  "/fm", "/tv", "/tools", "/tools/nepali-typing", "/tools/preeti-converter",
  "/jyotish/rashifal", "/jyotish/china", "/nepal-sambat", "/nepal-sambat/mandala",
  "/samudaya", "/about", "/sources", "/privacy", "/terms", "/contact"
];

for (const year of calendarYears) {
  for (let month = 1; month <= 12; month++) publicRoutes.push(`/calendar/${year}/${String(month).padStart(2, "0")}`);
}

const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (ch) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
}[ch]));

const today = new Date().toISOString().slice(0, 10);
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...publicRoutes.map((path) => {
    const loc = site + path;
    const changefreq = path === "/" ? "daily" : path.startsWith("/calendar/") ? "monthly" : "weekly";
    const priority = path === "/" ? "1.0" : path.startsWith("/calendar/") ? "0.7" : "0.8";
    return `  <url><loc>${escapeXml(loc)}</loc><lastmod>${today}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</url>`;
  }),
  "</urlset>",
  ""
].join("\n");

const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /api/",
  "Disallow: /my-diary",
  "Disallow: /family",
  "Disallow: /my-data",
  "Disallow: /settings",
  "Disallow: /admin",
  "Disallow: /notes",
  "Disallow: /planner",
  `Sitemap: ${site}/sitemap.xml`,
  ""
].join("\n");

const manifest = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  site_url: site,
  current_bs_year: currentBsYear,
  sitemap_calendar_years: calendarYears,
  indexed_route_count: publicRoutes.length,
  historical_calendar_policy: "Older calendar pages are omitted from sitemap and receive noindex,follow at runtime; they are not robots-blocked so crawlers can observe the noindex directive."
};

await Promise.all([
  writeFile(resolve(root, "public/sitemap.xml"), sitemap, "utf8"),
  writeFile(resolve(root, "public/robots.txt"), robots, "utf8"),
  writeFile(resolve(root, "public/seo-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8")
]);

console.log(`Generated SEO files for ${site}: ${publicRoutes.length} indexed routes.`);
