import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("homepage recovery keeps interactive routes, calendar jump, cache invalidation and production data repair",()=>{
  const enhancer=read("src/components/HomepageEnhancer.tsx");
  const history=read("src/components/HomeHistoryCard.tsx");
  const router=read("src/PatroRouter.tsx");
  const chrome=read("src/components/AppChrome.tsx");
  const main=read("src/main.tsx");
  const pwa=read("src/pwa.ts");
  const sw=read("public/sw.js");
  const css=read("src/homepage-interactions.css");
  const worker=read("worker/index.ts");
  const optimizedWorker=read("worker/optimized-entry.ts");
  const calendarWorker=read("worker/calendar-fast.ts");
  const historyWorker=read("worker/history-fast.ts");
  const historySync=read("scripts/cloudflare/ensure-history-d1.mjs");
  const offlineCheck=read("scripts/check-offline-pwa.cjs");
  const importer=read("scripts/cloudflare/import-d1.mjs");
  const importWorkflow=read(".github/workflows/import-d1.yml");
  const releaseGate=read(".github/workflows/release-gate.yml");

  // HomepageEnhancer owns only the extra homepage shortcuts. Rashifal remains an
  // authoritative app-shell/router route and must not be duplicated just to satisfy this guard.
  for(const route of ["/jyotish/china","/time-machine","/tools/astro","/tools"]){
    assert.ok(enhancer.includes(route),`homepage enhancer lost ${route}`);
    assert.ok(router.includes(route),`router lost ${route}`);
  }
  assert.ok(router.includes("/rashifal")&&chrome.includes("/rashifal"),"authoritative app shell/router lost /rashifal");
  assert.ok(enhancer.includes("hp-month-jump")&&enhancer.includes("/calendar/${event.target.value}"),"year/month jump controls must navigate real calendar routes");
  assert.ok(enhancer.includes('aria-label="विक्रम संवत् वर्ष"')&&enhancer.includes('aria-label="विक्रम संवत् महिना"'),"calendar jump controls must retain accessible names");
  assert.ok(main.includes("<HomepageEnhancer />"),"homepage enhancer must be mounted");
  assert.ok(css.includes("pointer-events:auto!important")&&css.includes(".rh-cell"),"interactive calendar and link surfaces must explicitly accept pointer events");
  assert.ok(css.includes("min-height:44px")&&css.includes("outline:3px solid var(--ap-green)"),"mobile controls must keep usable tap targets and keyboard focus");

  assert.ok(history.includes("HISTORY_ROTATION_MS = 8500")&&history.includes("window.setInterval"),"homepage On This Day must rotate automatically within the requested 7-10 second window");
  assert.ok(history.includes('cache: "no-store"')&&history.includes("HISTORY_REFRESH_TOKEN"),"homepage history must bypass stale failed responses");
  assert.ok(optimizedWorker.includes("fastHistoryResponse")&&historyWorker.includes("on_this_day_events"),"production worker must route On This Day through the resilient native D1 path");
  assert.ok(historyWorker.includes("$.ad_month")&&historyWorker.includes("$.ad_day"),"On This Day runtime must recover legacy rows with missing D1 dimensions");

  for(const prefix of ["aafnai-shell-","aafnai-calendar-","aafnai-public-data-"])assert.ok(pwa.includes(prefix),`stale cache cleanup lost ${prefix}`);
  assert.ok(pwa.includes('updateViaCache: "none"'),"service-worker update must bypass stale HTTP cache");
  assert.ok(pwa.includes("registration.update()")&&pwa.includes("SKIP_WAITING"),"new worker must be activated promptly");
  assert.ok(sw.includes('limit <= 800')&&sw.includes('/api/v1/time-machine?limit=800'),"Time Machine must be eligible for and prewarmed into the bounded public offline cache");
  assert.ok(sw.includes('/api/v1/on-this-day?date='),"On This Day must be prewarmed for the current Nepal date");
  assert.ok(offlineCheck.includes("waitForServiceWorkerControl")&&!offlineCheck.includes("await page.reload("),"offline release check must not race the controllerchange reload");

  for(const endpoint of ["/api/v1/sync","/api/v1/on-this-day","/api/v1/time-machine"])assert.ok(worker.includes(endpoint),`Worker lost ${endpoint}`);
  assert.ok(optimizedWorker.includes("fastCalendarResponse")&&calendarWorker.includes("const monthMatch = url.pathname.match")&&calendarWorker.includes("astronomy_calendar_map"),"production Worker lost the indexed /api/v1/calendar/:year/:month hot path");
  assert.ok(worker.includes('contentRange(env,"astronomy_calendar_map"')||worker.includes("astronomy_calendar_map")||calendarWorker.includes("astronomy_calendar_map"),"calendar runtime must remain backed by migrated D1 archive");

  assert.ok(importer.includes("row.ad_month")&&importer.includes("row.ad_day"),"On This Day import must populate queryable month/day dimensions");
  assert.ok(importer.includes("if (TABLE_ARG && doc.table!==TABLE_ARG) continue"),"targeted D1 imports must ignore unrelated snapshot payloads after validating them");
  assert.ok(importer.includes('TABLE_ARG==="miti_rashifal_publications"'),"legacy Rashifal recovery must only run for a full import or an explicit Rashifal import");
  assert.ok(importWorkflow.includes('D1_DATABASE_NAME: "patro"')&&!importWorkflow.includes("PASTE_YOUR_D1_DATABASE_ID"),"manual D1 import workflow must target the production database without placeholders");
  assert.ok(releaseGate.includes("Ensure On This Day D1 snapshot")&&releaseGate.includes("ensure-history-d1.mjs"),"release gate must fingerprint and synchronize the On This Day archive only when its source changes");
  assert.ok(historySync.includes("--table=on_this_day_events")&&historySync.includes("migration_state")&&releaseGate.includes("CLOUDFLARE_D1_DATABASE_ID"),"release gate must keep the public On This Day archive recoverable without redundant deployment writes");
  assert.ok(historySync.includes("TRANSFORM_VERSION")&&!historySync.includes("const IMPORTER ="),"history fingerprint must not change merely because the generic D1 importer implementation changes");
  assert.ok(historySync.includes("ALLOW_D1_QUOTA_DEFER")&&historySync.includes("isDailyQuotaError")&&releaseGate.includes('ALLOW_D1_QUOTA_DEFER: "1"'),"daily D1 quota exhaustion must defer history synchronization without blocking unrelated validated UI/static deployment");
  for(const marker of ["चन्द्र मण्डल · Nepal Sambat","लुङ्दर · ल्होसार पात्रो","माघीको आगो · थारू पात्रो","मधुबनी वर्ष · मिथिला पात्रो","साकेला सिली · किरात पात्रो","हिलाल · हिजरी पात्रो र नमाज समय","समुदाय चक्र · नेपालका सात पात्रो"]){
    assert.ok(releaseGate.includes(marker),`post-deploy smoke test lost Community Patro marker: ${marker}`);
  }
  assert.ok(releaseGate.includes("Smoke test deployed Cloudflare runtime")&&releaseGate.includes("/api/v1/on-this-day")&&releaseGate.includes("/api/v1/time-machine?limit=800"),"release must verify critical live Cloudflare routes after deploy");
});
