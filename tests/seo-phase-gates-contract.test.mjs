import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const url=(path)=>new URL("../"+path,import.meta.url);
const read=(path)=>readFileSync(url(path),"utf8");

test("Phase 0 inventory is explicit and external accuracy is not falsely claimed",()=>{
  const doc=read("docs/DATASET_DISCOVERY.md");
  const expected=JSON.parse(read("cloudflare/d1/expected-public-counts.json"));
  assert.equal(expected.tables.astronomy_calendar_map,77070);
  assert.equal(expected.critical_features.main_calendar.first_ad_date,"1826-04-11");
  assert.equal(expected.critical_features.main_calendar.last_ad_date,"2037-04-13");
  assert.ok(doc.includes("77,070 rows"));
  assert.ok(doc.includes("200 deterministic random dates"));
  assert.ok(doc.includes("must not claim that the external 200-date accuracy audit is complete"));
  assert.ok(existsSync(url("scripts/verify-calendar-reference.mjs")));
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

test("runtime and build providers use the same committed archive identity",()=>{
  const runtime=read("worker/patro-source.ts");
  const build=read("lib/patro.mjs");
  const canonical=read("lib/patro.ts");
  assert.ok(runtime.includes("astronomy_calendar_map"));
  assert.ok(build.includes("migration/data/public/astronomy_calendar_map"));
  assert.ok(canonical.includes("createPatroAdapter"));
  assert.ok(!existsSync(url("src/lib/patro.ts")),"a second src/lib Patro adapter must not reappear");
});

test("post-deploy crawler harness checks the four required bot perspectives and MCP",()=>{
  const smoke=read("scripts/verify-agent-bots.mjs");
  for(const agent of ["Googlebot","OAI-SearchBot","PerplexityBot","Claude-SearchBot"]) assert.ok(smoke.includes(agent),agent);
  assert.ok(smoke.includes('rel=\\"canonical\\" href=\\"'));
  assert.ok(smoke.includes("MCP-Protocol-Version"));
  assert.ok(smoke.includes("Mcp-Method"));
  assert.ok(smoke.includes("2026-07-28"));
});
