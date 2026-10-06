import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("community calendar publishes every seeded observance as a factual indexable page",()=>{
  const expected=JSON.parse(read("cloudflare/d1/expected-public-counts.json"));
  const manifest=JSON.parse(read("public/seo-manifest.json"));
  const sitemap=read("public/sitemap-community-calendar.xml");
  const builder=read("scripts/build-community-observance-pages.mjs");
  const page=read("worker/community-calendar-page.ts");
  const optimized=read("worker/optimized-entry.ts");
  const pkg=JSON.parse(read("package.json"));

  assert.equal(Number(expected.tables.community_dates),1062);
  assert.equal(Number(expected.tables.community_festivals),34);
  assert.equal(Number(manifest.community_observance_count),1062);
  assert.ok(Number(manifest.indexed_community_calendar_route_count)>=1097,"1062 observances plus identity/hub routes must be indexed");
  assert.ok(Number(manifest.dynamic_indexable_route_count)>=22500,"factual URL horizon must stay above 22.5k");
  assert.ok(manifest.sitemap_files.includes("sitemap-community-calendar.xml"));
  assert.ok((sitemap.match(/<url>/g)||[]).length>=1097);

  for(const marker of ["community_dates","community_festivals","community-calendar-index.json","sitemap-community-calendar.xml","occurrenceRoutes.length !== expectedDates"]){
    assert.ok(builder.includes(marker),`community builder missing ${marker}`);
  }
  for(const marker of ["loadCalendarShard","पूर्ण Panchang fields","Community Calendar","dynamic-community-calendar"]){
    assert.ok(page.includes(marker),`community renderer missing ${marker}`);
  }
  assert.ok(optimized.includes('communityCalendarPageResponse(request'));
  assert.ok(pkg.scripts.build.includes("node scripts/build-community-observance-pages.mjs"));
});
