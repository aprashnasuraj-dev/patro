import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const url=(path)=>new URL("../"+path,import.meta.url);
const read=(path)=>readFileSync(url(path),"utf8");

test("Phase 0 inventory is executable and external accuracy is not falsely claimed",()=>{
  const doc=read("docs/DATASET_DISCOVERY.md");
  const expected=JSON.parse(read("cloudflare/d1/expected-public-counts.json"));
  const discovery=read("scripts/dataset-discovery.mjs");
  const reference=read("scripts/verify-calendar-reference.mjs");
  const pkg=JSON.parse(read("package.json"));
  assert.equal(expected.tables.astronomy_calendar_map,77070);
  assert.equal(expected.critical_features.main_calendar.first_ad_date,"1826-04-11");
  assert.equal(expected.critical_features.main_calendar.last_ad_date,"2037-04-13");
  assert.ok(doc.includes("77,070 rows"));
  assert.ok(doc.includes("200 deterministic random dates"));
  assert.ok(doc.includes("must not claim that the external 200-date accuracy audit is complete"));
  assert.ok(existsSync(url("scripts/verify-calendar-reference.mjs")));
  assert.ok(discovery.includes("getDatasetInventory"));
  for(const fn of ["getDay","getDayByAd","getMonth","getYear","getFestivals","getFestival","getSait","getHolidays","convertBsToAd","convertAdToBs","getTodayNepal","getTithiAt"]) assert.ok(discovery.includes(fn),fn);
  assert.ok(reference.includes("2075")&&reference.includes("2085"));
  assert.ok(reference.includes("slice(0,200)"));
  assert.equal(pkg.scripts["seo:phase0"],"node scripts/dataset-discovery.mjs");
  assert.ok(pkg.scripts["cloudflare:production-check"].startsWith("npm run seo:phase0 &&"));
});

test("release gate policy preserves UI, facts and privacy",()=>{
  const gates=read("docs/SEO_PHASE_GATES.md");
  for(const phrase of [
    "Preserve product UI and functionality",
    "One canonical calendar source",
    "No invented facts",
    "Visible fact = marked-up fact",
    "Private stays private",
    "`/today` is stable",
    "Nepal calendar boundary",
    "Enhance, do not fork"
  ]) assert.ok(gates.includes(phrase),phrase);
  for(const route of ["/methodology","/corrections","/countdown/","/panchang/","/pdf/calendar/","/ics/","/widget/today","/widget/calendar/"]) assert.ok(gates.includes(route),route);
});

test("runtime and build providers use one approved archive model and exact adapter contract",()=>{
  const runtime=read("worker/patro-source.ts");
  const build=read("lib/patro.mjs");
  const canonical=read("lib/patro.ts");
  assert.ok(runtime.includes("astronomy_calendar_map"));
  assert.ok(build.includes("migration/data/public/astronomy_calendar_map"));
  assert.ok(canonical.includes("createPatroAdapter"));
  for(const fn of ["getDay","getDayByAd","getMonth","getYear","getFestivals","getFestival","getSait","getHolidays","convertBsToAd","convertAdToBs","getTodayNepal","getTithiAt"]) {
    assert.ok(canonical.includes(fn),`runtime adapter missing ${fn}`);
    assert.ok(build.includes(fn),`build provider missing ${fn}`);
  }
  assert.ok(!existsSync(url("src/lib/patro.ts")),"a second src/lib Patro adapter must not reappear");
});

test("16-city diaspora inventory and day-page internal links are locked",()=>{
  const config=read("scripts/seo-config.mjs");
  const adapter=read("lib/patro.ts");
  const days=read("scripts/prerender-days-seo.mjs");
  const cities=["kathmandu","pokhara","biratnagar","butwal","new-york","toronto","london","sydney","melbourne","tokyo","seoul","doha","dubai","riyadh","kuala-lumpur","kuwait-city"];
  for(const city of cities){assert.ok(config.includes(`"${city}"`),city);assert.ok(adapter.includes(`slug: "${city}"`),city);}
  assert.ok(config.includes("DIASPORA_TODAY_ROUTES"));
  assert.ok(days.includes('href="/today"'));
  assert.ok(days.includes("calendarYearRoute"));
  assert.ok(days.includes('/festivals/${esc(h.slug)}/'));
  assert.ok(days.includes('href="/convert"'));
});

test("agent manifests expose narrow tools plus sourced sait and exact citation policy",()=>{
  const generator=read("scripts/generate-seo.mjs");
  const gateway=read("worker/agent-gateway.ts");
  const mcp=read("worker/mcp.ts");
  assert.ok(generator.includes('Cite as: Aafnai Patro (aafnaipatro.com), accessed'));
  assert.ok(generator.includes('name:"sait_lookup"'));
  assert.ok(generator.includes('"/api/agent/v1/sait"'));
  assert.ok(generator.includes("180*86400000"),"security.txt expiry must remain safely under one year");
  assert.ok(gateway.includes('url.pathname === "/api/agent/v1/sait"'));
  for(const tool of ["get_today","convert_date","get_festival"]) assert.ok(mcp.includes(`name: "${tool}"`),tool);
  assert.ok(mcp.includes('const MODERN = "2026-07-28"'));
  assert.ok(mcp.includes('const LEGACY = "2025-11-25"'));
  assert.ok(mcp.includes('request.headers.get("Mcp-Method")'));
  assert.ok(mcp.includes('request.headers.get("Mcp-Name")'));
});

test("Nepal-midnight cache purge is scheduled in both Cloudflare configs",()=>{
  const jobs=read("worker/jobs.ts");
  const jsonc=read("wrangler.jsonc");
  const toml=read("wrangler.toml");
  assert.ok(jobs.includes('cron==="15 18 * * *"'));
  assert.ok(jobs.includes('"/today"'));
  assert.ok(jobs.includes("PATRO_CITIES.map"));
  assert.ok(jsonc.includes('"15 18 * * *"'));
  assert.ok(toml.includes('"15 18 * * *"'));
});

test("post-deploy crawler harness checks the four required bot perspectives and MCP",()=>{
  const smoke=read("scripts/verify-agent-bots.mjs");
  for(const agent of ["Googlebot","OAI-SearchBot","PerplexityBot","Claude-SearchBot"]) assert.ok(smoke.includes(agent),agent);
  assert.ok(smoke.includes('rel=\\"canonical\\" href=\\"'));
  assert.ok(smoke.includes("MCP-Protocol-Version"));
  assert.ok(smoke.includes("Mcp-Method"));
  assert.ok(smoke.includes("2026-07-28"));
});
