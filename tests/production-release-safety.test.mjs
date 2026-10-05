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
const home = read("src/HomePageCurrent.tsx"); // homepage implementation (ReferenceHomePage.tsx re-exports it)
const router = read("src/PatroRouter.tsx");
const referenceHomeCss = read("src/reference-home.css");
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
  assert.match(sw, /function\s+isSafeCalendarRequest/);
  assert.match(sw, /span\s*>=\s*0\s*&&\s*span\s*<\s*MAX_CALENDAR_RANGE_DAYS/);
  assert.ok(sw.includes("/api/v1/sync"), "sync route must stay explicitly allowlisted");
  assert.ok(sw.includes("/api/v1/today"), "today route must stay explicitly allowlisted");
  assert.ok(sw.includes("calendar\\/\\d{4}"), "bounded monthly calendar route must stay explicitly allowlisted");
  assert.match(sw, /hasOnlyParams/);
});

test("offline module prewarming loads code only, not private records", () => {
  assert.match(pwa, /OFFLINE_MODULE_LOADERS/);
  assert.match(pwa, /UtilitySuite/);
  assert.match(pwa, /NepaliTools/);
  assert.match(pwa, /PatroToolsShell/);
  assert.match(pwa, /MyDiary/);
  const start = pwa.indexOf("async function prewarmOfflineModules()");
  const end = pwa.indexOf("async function clearStaleRuntimeCaches()");
  assert.ok(start >= 0 && end > start, "offline prewarm function must remain isolated from cache-recovery logic");
  const prewarm = pwa.slice(start, end);
  assert.doesNotMatch(prewarm, /fetch\(|localStorage|getItem\(|indexedDB|\/api\//);
  assert.match(pwa, /clearStaleRuntimeCaches/);
  assert.match(pwa, /registration\.update\(\)/);
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
  assert.match(home, /localToday/);
  assert.match(home, /adToBs\(\w+\)/);
  assert.match(home, /function localMonthDays/);
  assert.match(home, /daysInBsMonth\(\s*year,\s*month\s*\)/);
  assert.match(home, /bsToAd\(\{\s*year,\s*month,\s*day\s*\}\)/);
  assert.match(home, /catch\s*\{\s*return fallback;?\s*\}/);
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

test("homepage rich calendar keeps all requested fields readable at mobile sizes", () => {
  // Day cells: festival · AD date / BS day / tithi / Nepal Sambat (owner-requested layout, Oct 2026).
  // Weather and the repeated weekday name were removed per the UI audit (weather moves to the Today card).
  for (const token of ["pc-event", "pc-ad", "pc-bs", "pc-tithi", "pc-ns", "pc-dot", "is-holiday", "nsShort("])
    assert.ok(home.includes(token), `missing rich day-cell field: ${token}`);
  assert.match(referenceHomeCss, /grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(richCalendar, /@media\(max-width:390px\)/);
  assert.match(richCalendar, /font-size:var\(--ap-t-xs\)/);
  assert.doesNotMatch(richCalendar, /font-size:\.(?:4|5|6|7)\d*rem/);
  assert.doesNotMatch(homepageGuards, /\.rh-weekday\{display:none/);
  assert.doesNotMatch(homepageGuards, /\.rh-cell em\.is-pending\{visibility:hidden/);
  assert.match(homepageGuards, /grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(homepageGuards, /font-size:13px!important/);
  assert.ok(main.indexOf('import "./homepage-regressions.css";') > main.indexOf('import "./rich-calendar.css";'));
});

test("homepage prerender first paint is branded and calendar-first rather than a raw SEO wall", () => {
  assert.match(prerenderPipeline, /import\("\.\/polish-home-prerender\.mjs"\)/);
  assert.match(prerenderPolish, /ap-prerender-header/);
  assert.match(prerenderPolish, /ap-prerender-hero/);
  assert.match(prerenderPolish, /ap-prerender-calendar/);
  assert.doesNotMatch(prerenderPolish, /सम्बन्धित खोजहरू · Related searches/);
  assert.match(prerenderPolish, /@media\(max-width:680px\)/);
});

test("production build does not publish source maps or obsolete service bindings", () => {
  assert.match(vite, /sourcemap:\s*false/);
  assert.match(wrangler, /"main"\s*:\s*"worker\/optimized-entry\.ts"/);
  assert.match(wrangler, /"binding"\s*:\s*"DB"/);
  assert.doesNotMatch(wrangler, /PATRO_API|pages_build_output_dir/i);
  assert.doesNotMatch(connectedWorker, /PATRO_API/);
});

test("selective compatibility proxy remains limited to media and news roots", () => {
  const match = connectedWorker.match(/const\s+ALLOWED_COMPAT_ROOTS\s*=\s*new\s+Set\(\[([^\]]*)\]\);/);
  assert.ok(match, "ALLOWED_COMPAT_ROOTS declaration must exist");
  const roots = [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
  assert.deepEqual(roots, ["tv", "fm", "samachar"]);
});
