import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("homepage recovery keeps interactive routes, calendar jump and cache invalidation",()=>{
  const enhancer=read("src/components/HomepageEnhancer.tsx");
  const router=read("src/PatroRouter.tsx");
  const main=read("src/main.tsx");
  const pwa=read("src/pwa.ts");
  const css=read("src/homepage-interactions.css");
  const worker=read("worker/index.ts");

  for(const route of ["/rashifal","/jyotish/china","/time-machine","/tools/astro","/tools"]){
    assert.ok(enhancer.includes(route),`homepage enhancer lost ${route}`);
    assert.ok(router.includes(route),`router lost ${route}`);
  }
  assert.ok(enhancer.includes("hp-month-jump")&&enhancer.includes("/calendar/${event.target.value}"),"year/month jump controls must navigate real calendar routes");
  assert.ok(main.includes("<HomepageEnhancer />"),"homepage enhancer must be mounted");
  assert.ok(css.includes("pointer-events:auto!important")&&css.includes(".rh-cell"),"interactive calendar and link surfaces must explicitly accept pointer events");

  for(const prefix of ["aafnai-shell-","aafnai-calendar-","aafnai-public-data-"])assert.ok(pwa.includes(prefix),`stale cache cleanup lost ${prefix}`);
  assert.ok(pwa.includes('updateViaCache: "none"'),"service-worker update must bypass stale HTTP cache");
  assert.ok(pwa.includes("registration.update()")&&pwa.includes("SKIP_WAITING"),"new worker must be activated promptly");

  for(const endpoint of ["/api/v1/sync","/api/v1/on-this-day","/api/v1/time-machine","/api/v1/calendar/"])assert.ok(worker.includes(endpoint),`Worker lost ${endpoint}`);
  assert.ok(worker.includes('contentRange(env,"astronomy_calendar_map"')||worker.includes("astronomy_calendar_map"),"calendar runtime must remain backed by migrated D1 archive");
});
