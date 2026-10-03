import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const sw = read("public/sw.js");
const pwa = read("src/pwa.ts");
const converter = read("src/ConvertPage.tsx");
const wrangler = read("wrangler.jsonc");
const vite = read("vite.config.ts");
const connectedWorker = read("worker/connected-entry.ts");
const home = read("src/ReferenceHomePage.tsx");
const router = read("src/PatroRouter.tsx");
const richCalendar = read("src/rich-calendar.css");
const homepageGuards = read("src/homepage-regressions.css");
const main = read("src/main.tsx");
const prerenderPolish = read("scripts/polish-home-prerender.mjs");
const prerenderPipeline = read("scripts/enhance-prerender-intents.mjs");

test("offline cache is bounded and does not become a database mirror", () => {
  assert.match(sw, /MAX_CALENDAR_ENTRIES\s*=\s*10/);
  assert.match(sw, /MAX_PUBLIC_DATA_ENTRIES\s*=\s*18/);
  assert.match(sw, /MAX_CALENDAR_RANGE_DAYS\s*=\s*45/);
  assert.match(sw, /trimCache\(cacheName, maxEntries\)/);
  assert.match(sw, /PUBLIC_DATA_TTL_MS/);
  assert.doesNotMatch(sw, /cloudflare\/d1|schema-migrations|database\.sqlite|astronomy_calendar_map|calendar_rows/i);
  assert.doesNotMatch(sw, /77[,_]?070|200\+\s*year|full calendar/i);
});

test("private routes and unknown APIs are never persisted by the service worker", () => {
  assert.match(sw, /PRIVATE_ROUTE_PREFIXES/);
  assert.match(sw, /"\/me"/);
  assert.match(sw, /!isPrivatePath\(new URL\(request\.url\)\.pathname\)/);
  assert.match(sw, /cache-control/);
  assert.match(sw, /no-store/);
  assert.match(sw, /private/);
  assert.match(sw, /event\.request\.headers\.has\("authorization"\)/);
  const apiGate = sw.split("\n").find((line) => line.includes('url.pathname.startsWith("/api/")')) || "";
  assert.match(apiGate, /return;/);
  assert.doesNotMatch(apiGate, /respondWith/);
});

test("only narrow public calendar requests qualify for offline data caching", () => {
  assert.match(sw, /isSafeCalendarRequest/);
  assert.match(sw, /span\s*>=\s*0\s*&&\s*span\s*<\s*MAX_CALENDAR_RANGE_DAYS/);
  assert.match(sw, /\/api\/v1\/calendar/);
  assert.match(sw, /\/api\/v1\/sync/);
  assert.match(sw, /hasOnlyParams/);
});

test("offline module prewarming loads code only, not private records", () => {
  assert.match(pwa, /OFFLINE_MODULE_LOADERS/);
  assert.match(pwa, /UtilitySuite/);
  assert.match(pwa, /NepaliTools/);
  assert.match(pwa, /PatroToolsShell/);
  assert.match(pwa, /MyDiary/);
  assert.doesNotMatch(pwa, /fetch\(|localStorage|getItem\(|indexedDB|\/api\//);
});

test("BS AD conversion remains local-first with optional online enrichment", () => {
  assert.match(converter, /adToBs/);
  assert.match(converter, /bsToAd/);
  assert.match(converter, /isValidBsDate/);
  assert.match(converter, /setResult\(next\)/);
  assert.match(converter, /enrichPanchang/);
  assert.doesNotMatch(converter, /fetch\(`\/api\/v1\/convert/);
});

test("homepage core calendar is local-first and does not collapse into an API error state", () => {
  assert.match(home, /function localToday/);
  assert.match(home, /adToBs\(date\)/);
  assert.match(home, /function localMonthDays/);
  assert.match(home, /daysInBsMonth\(year,month\)/);
  assert.match(home, /bsToAd\(\{year,month,day\}\)/);
  assert.match(home, /catch\{return fallback\}/);
  assert.doesNotMatch(home, /आजको पात्रो लोड हुन सकेन/);
  assert.doesNotMatch(home, /आजको पात्रो तयार हुँदैछ/);
});

test("homepage and astronomy remain separate routes", () => {
  assert.match(router, /if\(path==="\/"\|\|path==="\/today"\)return <ReferenceHomePage\/>/);
  assert.match(router, /if\(path==="\/tools\/astro"\)return <AstroPage\/>/);
  const homeRoute = router.indexOf('path==="/"||path==="/today"');
  const astroRoute = router.indexOf('path==="/tools/astro"');
  assert.ok(homeRoute >= 0 && astroRoute > homeRoute);
});

test("homepage rich calendar cells expose real enrichment fields without mobile overflow placeholders", () => {
  for (const token of ["rh-ad-date", "rh-ns-date", "rh-weather", "rh-weekday", "rh-day-badges", "is-festival-badge", "is-holiday-badge"])
    assert.ok(home.includes(token), `missing rich day-cell field: ${token}`);
  assert.match(richCalendar, /grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(richCalendar, /@media\(max-width:390px\)/);
  assert.match(homepageGuards, /\.rh-cell em\.is-pending\{visibility:hidden\}/);
  assert.match(homepageGuards, /\.rh-ns-date\[title="नेपाल संवत् विवरण उपलब्ध हुँदा देखिन्छ"\]\{visibility:hidden\}/);
  assert.match(homepageGuards, /grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.ok(main.indexOf('import "./homepage-regressions.css";') > main.indexOf('import "./rich-calendar.css";'));
});

test("homepage prerender first paint is branded and calendar-first rather than a raw SEO wall", () => {
  assert.match(prerenderPipeline, /import\("\.\/polish-home-prerender\.mjs"\)/);
  assert.match(prerenderPolish, /ap-prerender-header/);
  assert.match(prerenderPolish, /ap-prerender-hero/);
  assert.match(prerenderPolish, /ap-prerender-calendar/);
  assert.match(prerenderPolish, /ap-prerender-copy/);
  assert.ok(prerenderPolish.indexOf("ap-prerender-calendar") < prerenderPolish.indexOf("ap-prerender-copy"));
  assert.match(prerenderPolish, /@media\(max-width:680px\)/);
});

test("production build does not publish source maps or obsolete service bindings", () => {
  assert.match(vite, /sourcemap:\s*false/);
  assert.match(wrangler, /"main"\s*:\s*"worker\/connected-entry\.ts"/);
  assert.match(wrangler, /"binding"\s*:\s*"DB"/);
  assert.doesNotMatch(wrangler, /PATRO_API|pages_build_output_dir/i);
  assert.doesNotMatch(connectedWorker, /PATRO_API/);
});

test("selective compatibility proxy remains limited to media and news roots", () => {
  assert.match(connectedWorker, /new Set\(\["tv",\s*"fm",\s*"samachar"\]\)/);
  assert.doesNotMatch(connectedWorker, /new Set\(\[[^\]]*calendar[^\]]*\]\)/s);
  assert.doesNotMatch(connectedWorker, /new Set\(\[[^\]]*jyotish[^\]]*\]\)/s);
});
