import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("festival routes are real full-detail pages, never homepage redirects",()=>{
  const connected=read("worker/connected-entry.ts");
  const optimized=read("worker/optimized-entry.ts");
  const gateway=read("worker/agent-gateway.ts");
  const page=read("worker/festival-page.ts");
  const snapshot=read("scripts/calendar-snapshot.mjs");
  const builder=read("scripts/build-festival-index.mjs");
  const pkg=JSON.parse(read("package.json"));

  assert.ok(!connected.includes('path === "/festivals" || path.startsWith("/festivals/") ? "/"'),"festival routes must never redirect to homepage");
  assert.ok(connected.includes('"/festivals"'),"festival hub must remain a public route");
  assert.ok(optimized.includes('import { festivalPageResponse } from "./festival-page"'));
  assert.ok(optimized.indexOf("festivalPageResponse(request")<optimized.indexOf("staticFestivalResponse(request"),"dynamic full-detail festival renderer must precede static fallback");
  assert.ok(gateway.includes("festivalPageResponse(request"),"connected/agent entry must preserve festival renderer");

  for(const marker of ["loadCalendarShard","पूर्ण Panchang विवरण","Nepal Sambat / NS record","अन्य उपलब्ध day/archive fields","/data/festival-index.json"]){
    assert.ok(page.includes(marker),`festival renderer missing ${marker}`);
  }
  assert.ok(snapshot.includes('return "dashain"'));
  assert.ok(snapshot.includes('return "gai-jatra"'));
  assert.ok(snapshot.includes('out.add("gaijatra")'));
  assert.ok(builder.includes('public/sitemap-festivals.xml'));
  assert.ok(builder.includes('indexed_festival_route_count'));
  assert.ok(pkg.scripts.build.includes("node scripts/build-festival-index.mjs"));
});
