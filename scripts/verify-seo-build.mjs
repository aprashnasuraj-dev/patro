import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  CURRENT_BS_YEAR, INDEXABLE_PAST_YEARS, INDEXABLE_FUTURE_YEARS,
  INDEXED_CALENDAR_YEARS, CITY_SLUGS, calendarRoute, SITE,
  SITEMAP_MIN_BS_YEAR, SITEMAP_MAX_BS_YEAR, isSitemapYear, approxBsYear,
  NOINDEX_EXACT_ROUTES, PRIVATE_PREFIXES, sitemapExclusionReason
} from "./seo-config.mjs";
import { parseSitemapIndex } from "./sitemap-utils.mjs";
import { loadCalendarSnapshot, tithiText } from "./calendar-snapshot.mjs";

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), "utf8");
const fail = (message) => { throw new Error(`SEO build verification failed: ${message}`); };
const expect = (condition, message) => { if (!condition) fail(message); };

const manifest = JSON.parse(await read("public/seo-manifest.json"));
const calendarManifest = JSON.parse(await read(".cloudflare/calendar-r2/manifest.json"));

expect(manifest.schema_version === 4, "manifest schema must be 4");
expect(manifest.site_url === SITE, "canonical host mismatch");
expect(calendarManifest.row_count === 77070, `calendar archive row count mismatch: ${calendarManifest.row_count}`);
expect(calendarManifest.ad_start === "1826-04-11" && calendarManifest.ad_end === "2037-04-13", "calendar archive coverage mismatch");
expect(Array.isArray(calendarManifest.bs_years) && calendarManifest.bs_years.length > 200, "full BS archive year inventory missing");
expect(INDEXABLE_PAST_YEARS === 35 && INDEXABLE_FUTURE_YEARS === 10, "expanded factual discovery window changed unexpectedly");
expect(SITEMAP_MIN_BS_YEAR === CURRENT_BS_YEAR - INDEXABLE_PAST_YEARS, "sitemap minimum year drifted");
expect(SITEMAP_MAX_BS_YEAR === CURRENT_BS_YEAR + INDEXABLE_FUTURE_YEARS, "sitemap maximum year drifted");
const windowYears = calendarManifest.bs_years.filter(isSitemapYear);
expect(windowYears.length >= 40 && windowYears.length <= 46, `unexpected indexable year count: ${windowYears.length}`);
expect(JSON.stringify(manifest.indexed_calendar_years) === JSON.stringify(windowYears), "manifest indexed years drifted from archive window");
expect(manifest.indexed_calendar_year_route_count === windowYears.length, "indexed year route count mismatch");
expect(Number(manifest.indexed_day_route_count || 0) > 15000, `too few factual day URLs: ${manifest.indexed_day_route_count}`);
expect(Number(manifest.indexed_history_event_route_count || 0) >= 3000, `too few source-backed history URLs: ${manifest.indexed_history_event_route_count}`);
expect(manifest.calendar_archive_source_version === calendarManifest.source_version, "archive source version mismatch");
expect(/^Cite as: Aafnai Patro \(aafnaipatro\.com\), accessed \d{4}-\d{2}-\d{2}$/.test(String(manifest.preferred_citation || "")), "preferred citation missing");

const rows = await loadCalendarSnapshot();
expect(rows.length === calendarManifest.row_count, "Git mirror/calendar manifest row count mismatch");
const sample = rows.find((row) => Number(row.bs?.year) === CURRENT_BS_YEAR && tithiText(row.panchang))
  || rows.find((row) => INDEXED_CALENDAR_YEARS.includes(Number(row.bs?.year)) && tithiText(row.panchang));
expect(sample, "no factual calendar sample with tithi found");

const rootHtml = await read("dist/index.html");
expect(rootHtml.includes('data-seo-prerender="true"'), "homepage lacks semantic prerender");
expect(rootHtml.includes("<h1>"), "homepage lacks H1");
expect(rootHtml.includes(`rel="canonical" href="${SITE}/"`), "homepage canonical missing");
expect(!rootHtml.includes("MeroPatro") && !rootHtml.includes("Mero Patro"), "retired brand leaked into homepage");

const monthPath = calendarRoute(Number(sample.bs.year), Number(sample.bs.month));
const monthHtml = await read(`dist${monthPath}/index.html`);
expect(monthHtml.includes('data-seo-prerender="true"'), "hot month page lacks semantic prerender");
expect(monthHtml.includes(`/date/${sample.ad}`), "hot month page does not link factual day page");
expect(monthHtml.includes(tithiText(sample.panchang)), "hot month page lacks tithi text");
const dayHtml = await read(`dist/date/${sample.ad}/index.html`);
expect(dayHtml.includes('data-seo-prerender="true"'), "hot day page lacks semantic prerender");
expect(dayHtml.includes(tithiText(sample.panchang)), "hot day page lacks tithi text");
expect(dayHtml.includes(`rel="canonical" href="${SITE}/date/${sample.ad}"`), "hot day canonical missing");
expect(dayHtml.includes('"@type":"BreadcrumbList"') || dayHtml.includes('"@type": "BreadcrumbList"'), "day breadcrumb schema missing");

const robots = await read("public/robots.txt");
const robotsSitemapLines = robots.split("\n").filter((line) => /^sitemap:/i.test(line.trim()));
expect(robotsSitemapLines.length === 1 && robotsSitemapLines[0].trim() === `Sitemap: ${SITE}/sitemap.xml`, "robots.txt must contain exactly one sitemap index line");
expect((await read("dist/robots.txt")) === robots, "dist/robots.txt differs from public/robots.txt");
for (const path of ["/api/", "/compat-api/", "/me/", "/admin/", "/auth/"]) expect(robots.includes(`Disallow: ${path}`), `robots missing private boundary ${path}`);

const historyIndex = JSON.parse(await read("dist/data/history-events-index.json"));
expect(Number(historyIndex?.schema) === 1, "history event index schema mismatch");
expect(Number(historyIndex?.count) >= 3000, `history event compact index too small: ${historyIndex?.count}`);
expect(Object.keys(historyIndex?.events || {}).length === Number(historyIndex.count), "history event index count mismatch");

const distDir = resolve(root, "dist");
const distSitemaps = (await readdir(distDir)).filter((file) => /^sitemap[\w-]*\.xml$/.test(file)).sort();
expect(distSitemaps.includes("sitemap.xml"), "dist/sitemap.xml missing");
const indexXml = await read("dist/sitemap.xml");
const indexEntries = parseSitemapIndex(indexXml);
expect(indexEntries.length >= 90 && indexEntries.length <= 140, `sitemap child count out of range: ${indexEntries.length}`);
const indexFiles = new Set(indexEntries.map((entry) => entry.file));
expect(indexFiles.has("sitemap-history-events.xml"), "history event sitemap missing from sitemap index");
expect(JSON.stringify([...indexFiles].sort()) === JSON.stringify([...(manifest.sitemap_files || [])].sort()), "manifest sitemap_files drifted from sitemap index");
for (const year of windowYears) {
  expect(indexFiles.has(`sitemap-calendar-${year}.xml`), `missing calendar sitemap for ${year}`);
  expect(indexFiles.has(`sitemap-days-${year}.xml`), `missing day sitemap for ${year}`);
}
for (const city of CITY_SLUGS) expect((await read("dist/sitemap-pages.xml")).includes(`${SITE}/today/${city}`), `diaspora route missing from sitemap: ${city}`);

const bsYearByAd = new Map(rows.map((row) => [row.ad, Number(row.bs?.year)]));
const robotsDisallows = [...robots.matchAll(/^Disallow:\s*(\S+)\s*$/gm)].map((m) => m[1]);
const seen = new Set();
let totalLocs = 0;
let historyLocs = 0;
for (const file of indexFiles) {
  const path = resolve(distDir, file);
  expect(existsSync(path), `sitemap index references missing ${file}`);
  expect((await stat(path)).size <= 50 * 1024 * 1024, `${file} exceeds 50MB`);
  const xml = await readFile(path, "utf8");
  expect(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), `${file} is not a urlset`);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  expect(locs.length > 0 && locs.length <= 50000, `${file} URL count invalid: ${locs.length}`);
  totalLocs += locs.length;
  for (const loc of locs) {
    expect(loc.startsWith(SITE + "/"), `${file}: off-site URL ${loc}`);
    expect(!seen.has(loc), `duplicate sitemap URL ${loc}`);
    seen.add(loc);
    const route = loc.slice(SITE.length).replace(/&amp;/g, "&");
    const reason = sitemapExclusionReason(route);
    expect(!reason, `${file}: non-indexable sitemap URL (${reason}) ${route}`);
    expect(!NOINDEX_EXACT_ROUTES.includes(route), `${file}: exact noindex route ${route}`);
    expect(!PRIVATE_PREFIXES.some((prefix) => route.startsWith(prefix)), `${file}: private route ${route}`);
    expect(!robotsDisallows.some((prefix) => route.startsWith(prefix)), `${file}: robots-disallowed route ${route}`);
    const date = route.match(/^\/date\/(\d{4}-\d{2}-\d{2})$/);
    if (route.startsWith("/date/")) {
      expect(Boolean(date) && bsYearByAd.has(date[1]), `${file}: invalid factual date route ${route}`);
      expect(isSitemapYear(bsYearByAd.get(date[1])), `${file}: date outside expanded factual window ${route}`);
    }
    if (route.startsWith("/onthisday/")) historyLocs++;
  }
}
expect(historyLocs >= 3000, `too few Time Machine/history sitemap URLs: ${historyLocs}`);
expect(totalLocs >= 21000, `expanded sitemap corpus must be >=21,000 unique URLs; got ${totalLocs}`);

const seoWindow = await read("worker/seo-window.ts");
expect(seoWindow.includes("INDEXABLE_PAST_YEARS = 35") && seoWindow.includes("INDEXABLE_FUTURE_YEARS = 10"), "runtime SEO window does not match build window");
expect(seoWindow.includes("approxBsYear(date) - INDEXABLE_PAST_YEARS"), "runtime minimum year formula drifted");
expect(approxBsYear(new Date("2026-04-13T12:00:00+05:45")) === 2082 && approxBsYear(new Date("2026-04-14T12:00:00+05:45")) === 2083, "BS new-year boundary changed");
const optimizedEntry = await read("worker/optimized-entry.ts");
expect(optimizedEntry.includes("historyEventPageResponse"), "production Worker does not wire dynamic history event renderer");
expect(optimizedEntry.indexOf("seoStaticResponse(request") < optimizedEntry.indexOf("historyEventPageResponse(request"), "SEO static routing must precede history dynamic routing");

console.log(`SEO build verified: ${totalLocs} unique indexable URLs, including ${historyLocs} source-backed Time Machine pages and ${manifest.indexed_day_route_count} factual date pages across BS ${SITEMAP_MIN_BS_YEAR}-${SITEMAP_MAX_BS_YEAR}.`);
