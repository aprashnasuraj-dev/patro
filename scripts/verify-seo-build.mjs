import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CURRENT_BS_YEAR, INDEXED_CALENDAR_YEARS, calendarRoute } from "./seo-config.mjs";
import { loadCalendarSnapshot, tithiText } from "./calendar-snapshot.mjs";

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), "utf8");
const fail = (message) => { throw new Error(`SEO build verification failed: ${message}`); };
const expect = (condition, message) => { if (!condition) fail(message); };

const manifest = JSON.parse(await read("public/seo-manifest.json"));
expect(manifest.schema_version === 3, "manifest schema must be 3");
expect(manifest.site_url === "https://aafnaipatro.com", "canonical host mismatch");
expect(Array.isArray(manifest.indexed_calendar_years) && manifest.indexed_calendar_years.length === 5, "five-year focused index window missing");
expect(manifest.indexed_day_route_count >= 1700, `too few factual day routes: ${manifest.indexed_day_route_count}`);
expect(manifest.indexed_route_count >= 1800, `too few indexable routes: ${manifest.indexed_route_count}`);

const rootHtml = await read("dist/index.html");
expect(rootHtml.includes('data-seo-prerender="true"'), "homepage lacks server-visible semantic body");
expect(rootHtml.includes("<h1>"), "homepage lacks H1");
expect(rootHtml.includes('rel="canonical" href="https://aafnaipatro.com/"'), "homepage canonical missing");
expect(rootHtml.includes('"@type":"Organization"') || rootHtml.includes('"@type": "Organization"'), "Organization schema missing");
expect(!rootHtml.includes("patro-blush.vercel.app"), "retired Vercel hostname leaked into homepage");

const rows = await loadCalendarSnapshot();
const sample = rows.find((row) => Number(row.bs?.year) === CURRENT_BS_YEAR && tithiText(row.panchang))
  || rows.find((row) => INDEXED_CALENDAR_YEARS.includes(Number(row.bs?.year)) && tithiText(row.panchang));
expect(sample, "no indexed calendar sample with tithi found");

const monthPath = calendarRoute(Number(sample.bs.year), Number(sample.bs.month));
const monthHtml = await read(`dist${monthPath}/index.html`);
expect(monthHtml.includes('data-seo-prerender="true"'), "month page lacks semantic prerender");
expect(monthHtml.includes('class="seo-calendar-days"'), "month page lacks factual day-link section");
expect(monthHtml.includes(`/date/${sample.ad}`), "month page does not link factual day page");
expect(monthHtml.includes(tithiText(sample.panchang)), "month page does not expose sample tithi in raw HTML");
expect(!monthHtml.includes("patro-blush.vercel.app"), "retired Vercel hostname leaked into month page");

const dayHtml = await read(`dist/date/${sample.ad}/index.html`);
expect(dayHtml.includes('data-seo-prerender="true"'), "day page lacks semantic prerender");
expect(dayHtml.includes("यो मितिको सीधा उत्तर"), "day page lacks answer-first block");
expect(dayHtml.includes(tithiText(sample.panchang)), "day page lacks archive tithi");
expect(dayHtml.includes('"@type":"WebPage"') || dayHtml.includes('"@type": "WebPage"'), "day WebPage schema missing");
expect(dayHtml.includes('"@type":"BreadcrumbList"') || dayHtml.includes('"@type": "BreadcrumbList"'), "day breadcrumb schema missing");
expect(dayHtml.includes(`rel="canonical" href="https://aafnaipatro.com/date/${sample.ad}"`), "day canonical missing");
expect(!dayHtml.includes("patro-blush.vercel.app"), "retired Vercel hostname leaked into day page");

const robots = await read("public/robots.txt");
for (const agent of ["OAI-SearchBot", "Googlebot", "Bingbot", "Claude-SearchBot", "PerplexityBot"]) {
  expect(robots.includes(`User-agent: ${agent}`), `missing crawler group ${agent}`);
}
for (const path of ["/api/", "/compat-api/", "/me/", "/admin/", "/auth/"]) {
  expect(robots.includes(`Disallow: ${path}`), `private/machine path exposed: ${path}`);
}

const llms = await read("public/llms.txt");
expect(llms.includes("Aafnai Patro"), "llms brand missing");
expect(!llms.includes("/api/v1/"), "llms advertises API endpoint");
expect(!llms.includes("MeroPatro"), "retired brand leaked into llms");

console.log(`SEO build verified: ${manifest.indexed_route_count} indexable routes, ${manifest.indexed_day_route_count} factual day pages; sample ${sample.ad} / BS ${sample.bs.year}-${sample.bs.month}-${sample.bs.day}.`);
