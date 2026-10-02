import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
const url=(path)=>new URL("../"+path,import.meta.url);const read=(path)=>readFileSync(url(path),"utf8");

test("Phase 0 inventory is executable and external accuracy is never falsely claimed",()=>{
 const doc=read("docs/DATASET_DISCOVERY.md"),expected=JSON.parse(read("cloudflare/d1/expected-public-counts.json")),discovery=read("scripts/dataset-discovery.mjs"),reference=read("scripts/verify-calendar-reference.mjs"),pkg=JSON.parse(read("package.json"));
 assert.equal(expected.tables.astronomy_calendar_map,77070);assert.equal(expected.critical_features.main_calendar.first_ad_date,"1826-04-11");assert.equal(expected.critical_features.main_calendar.last_ad_date,"2037-04-13");assert.ok(doc.includes("77,070 rows"));assert.ok(doc.includes("200 deterministic pseudo-random dates"));assert.ok(doc.includes("must not claim that the external 200-date accuracy audit is complete"));
 for(const fn of ["getDay","getDayByAd","getMonth","getYear","getFestivals","getFestival","getSait","getHolidays","convertBsToAd","convertAdToBs","getTodayNepal","getTithiAt"])assert.ok(discovery.includes(fn),fn);
 assert.ok(discovery.includes("2075")&&discovery.includes("2085"));assert.ok(discovery.includes("deterministicIndexes(candidates.length,200)"));assert.ok(reference.includes("2075")&&reference.includes("2085"));assert.ok(reference.includes("slice(0,200)"));assert.ok(reference.includes("deterministic-pseudo-random"));
 assert.equal(pkg.scripts["seo:phase0"],"node scripts/dataset-discovery.mjs");assert.equal(pkg.scripts["seo:accuracy-reference"],"node scripts/verify-calendar-reference.mjs");assert.ok(pkg.scripts.build.includes("npm run seo:phase0"));
});

test("release policy preserves UI, facts, privacy and new intent routes",()=>{
 const gates=read("docs/SEO_PHASE_GATES.md");for(const phrase of ["Preserve product UI and functionality","One canonical calendar source","No invented facts","Visible fact = marked-up fact","Private stays private","`/today` is stable","Nepal calendar boundary","Enhance, do not fork"])assert.ok(gates.includes(phrase),phrase);
 for(const route of ["/methodology","/corrections","/calendar/{bsYear}","/countdown/","/panchang/","/pdf/calendar/","/ics/","/widget/today","/widget/calendar/","/data/calendar/{year}.csv"])assert.ok(gates.includes(route),route);
 const schema=read("docs/SEO_SCHEMA_2026.md");for(const token of ["BreadcrumbList","FAQPage","HowTo","Dataset","SearchAction","2026-05-07"])assert.ok(schema.includes(token),token);
});

test("runtime and build providers use one approved archive model and exact adapter contract",()=>{
 const runtime=read("worker/patro-source.ts"),build=read("lib/patro.mjs"),canonical=read("lib/patro.ts");assert.ok(runtime.includes("astronomy_calendar_map"));assert.ok(build.includes("migration/data/public/astronomy_calendar_map"));assert.ok(canonical.includes("createPatroAdapter"));
 for(const fn of ["getDay","getDayByAd","getMonth","getYear","getFestivals","getFestival","getSait","getHolidays","convertBsToAd","convertAdToBs","getTodayNepal","getTithiAt"]){assert.ok(canonical.includes(fn));assert.ok(build.includes(fn));}assert.ok(!existsSync(url("src/lib/patro.ts")));
});

test("16-city diaspora inventory and strict day-page link graph are locked",()=>{
 const config=read("scripts/seo-config.mjs"),adapter=read("lib/patro.ts"),days=read("scripts/prerender-days-seo.mjs");const cities=["kathmandu","pokhara","biratnagar","butwal","new-york","toronto","london","sydney","melbourne","tokyo","seoul","doha","dubai","riyadh","kuala-lumpur","kuwait-city"];
 for(const city of cities){assert.ok(config.includes(`"${city}"`),city);assert.ok(adapter.includes(`slug: "${city}"`),city);}assert.ok(config.includes("DIASPORA_TODAY_ROUTES"));for(const token of ['href="/today"',"calendarYearRoute",'/festivals/${esc(h.slug)}/','href="/convert"',"अघिल्लो दिन","अर्को दिन"])assert.ok(days.includes(token),token);
});

test("agent manifests use narrow MCP plus sourced sait REST without inventing protocol headers",()=>{
 const generator=read("scripts/generate-seo.mjs"),gateway=read("worker/agent-gateway.ts"),mcp=read("worker/mcp.ts");assert.ok(generator.includes('Cite as: Aafnai Patro (aafnaipatro.com), accessed'));assert.ok(generator.includes('name:"sait_lookup"'));assert.ok(generator.includes('"/api/agent/v1/sait"'));assert.ok(generator.includes("180*86400000"));assert.ok(gateway.includes('url.pathname === "/api/agent/v1/sait"'));
 for(const tool of ["get_today","convert_date","get_festival"])assert.ok(mcp.includes(`name: "${tool}"`),tool);assert.ok(mcp.includes('const MODERN = "2026-07-28"'));assert.ok(mcp.includes('const LEGACY = "2025-11-25"'));assert.ok(mcp.includes('method === "server/discover"'));assert.ok(mcp.includes('method === "initialize"'));
});

test("Nepal-midnight cache purge is scheduled in canonical Cloudflare config",()=>{
 const jobs=read("worker/jobs.ts"),jsonc=read("wrangler.jsonc");assert.ok(jobs.includes('cron==="15 18 * * *"'));assert.ok(jobs.includes('"/today"'));assert.ok(jobs.includes("PATRO_CITIES.map"));assert.ok(jsonc.includes('"15 18 * * *"'));
});

test("post-deploy harness checks four bot perspectives, machine files, MCP and explicit IndexNow tooling",()=>{
 const smoke=read("scripts/verify-agent-bots.mjs"),pkg=JSON.parse(read("package.json")),indexnow=read("scripts/indexnow.mjs");for(const agent of ["Googlebot","OAI-SearchBot","PerplexityBot","Claude-SearchBot"])assert.ok(smoke.includes(agent),agent);assert.ok(smoke.includes('canonical!==origin+"/today"'));assert.ok(smoke.includes("MCP-Protocol-Version"));assert.ok(smoke.includes("server/discover"));assert.ok(smoke.includes("2026-07-28"));assert.equal(pkg.scripts["seo:indexnow"],"node scripts/indexnow.mjs");assert.equal(pkg.scripts["deploy:cloudflare"],"wrangler deploy --config wrangler.jsonc");assert.ok(indexnow.includes("https://api.indexnow.org/indexnow"));assert.ok(existsSync(url("public/ec3997cfe5c249f1af7885fa9f4d790d.txt")));
});
