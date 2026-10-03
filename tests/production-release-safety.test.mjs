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
  assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\).*return/s);
  assert.doesNotMatch(sw, /url\.pathname\.startsWith\("\/api\/"\).*respondWith\(networkFirst/s);
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
