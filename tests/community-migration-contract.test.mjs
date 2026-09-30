import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const json=(path)=>JSON.parse(read(path));
const IDS=["nepal-sambat","lhosar","tharu","mithila","kirat","hijri"];

test("all six community calendars remain registered",()=>{
  const preferences=read("src/community/preferences.ts");
  for(const id of IDS) assert.ok(preferences.includes('id: "'+id+'"'),id);
  assert.equal((preferences.match(/id: "/g)||[]).length,6);
});

test("build emits six community calendars plus the combined chakra",()=>{
  const emit=read("scripts/emit-community-suites.mjs");
  const routes=[
    "/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu",
    "/samudaya/mithila","/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"
  ];
  for(const route of routes) assert.ok(emit.includes('"'+route+'"'),route);
  assert.match(emit,/नेपाल संवत्, ल्होसार, थारु, मिथिला, किरात र हिजरी/);
});

test("D1 migration manifest preserves every community dataset",()=>{
  const counts=json("cloudflare/d1/expected-public-counts.json");
  assert.equal(counts.tables.community_dates,1062);
  assert.equal(counts.tables.community_festivals,34);
  assert.equal(counts.tables.ns_days,14972);
  assert.equal(counts.tables.ns_festival_dates,1886);
  assert.equal(counts.tables.ns_festivals,47);
  assert.deepEqual(counts.critical_features.community_suites.ids,IDS);
});

test("five suite snapshot has every non-NS suite with expected row counts",()=>{
  const dates=json("migration/data/public/community_dates.json").rows;
  const festivals=json("migration/data/public/community_festivals.json").rows;
  const dateCounts=Object.fromEntries(["lhosar","tharu","mithila","kirat","hijri"].map(id=>[id,dates.filter(r=>r.suite===id).length]));
  const festivalCounts=Object.fromEntries(["lhosar","tharu","mithila","kirat","hijri"].map(id=>[id,festivals.filter(r=>r.suite===id).length]));
  assert.deepEqual(dateCounts,{lhosar:124,tharu:155,mithila:372,kirat:124,hijri:287});
  assert.deepEqual(festivalCounts,{lhosar:4,tharu:5,mithila:12,kirat:4,hijri:9});
});

test("community public runtime is Cloudflare-native and reuses validated Hijri math",()=>{
  const worker=read("worker/community.ts");
  const index=read("worker/index.ts");
  assert.ok(index.includes('communityResponse'));
  for(const route of ["/api/v1/communities","/api/v1/hijri","/api/v1/nepal-sambat"]) assert.ok(worker.includes(route),route);
  assert.ok(worker.includes('from "../src/patro-tools/communities/hijri/calendar"'));
  assert.ok(worker.includes('from "../src/patro-tools/communities/hijri/prayer"'));
  assert.ok(!/supabase/i.test(worker),"native community runtime must not call Supabase");
});

test("cutover contract probes every community experience",()=>{
  const contract=json("cloudflare/cutover-contract.json");
  const paths=new Set(contract.routes.map(r=>r.path));
  for(const route of [
    "/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila",
    "/samudaya/kirat","/samudaya/hijri","/samudaya/chakra","/api/v1/communities",
    "/api/v1/hijri?date=2026-09-30&lat=27.7172&lon=85.324&method=karachi&asr=hanafi",
    "/api/v1/nepal-sambat?ad=2026-09-30"
  ]) assert.ok(paths.has(route),route);
});

test("public community routes are no longer migration blockers",()=>{
  const remaining=json("cloudflare/remaining-cutover.json");
  assert.deepEqual(remaining.community_suites.ids,IDS);
  const pending=new Set(remaining.remaining_native_port_groups.flatMap(g=>g.routes||[]));
  for(const route of [
    "/api/v1/communities","/api/v1/communities/feed.ics","/api/v1/communities/lho",
    "/api/v1/communities/:suite","/api/v1/communities/:suite/ics",
    "/api/v1/hijri","/api/v1/hijri/ramadan",
    "/api/v1/nepal-sambat","/api/v1/nepal-sambat/festivals","/api/v1/nepal-sambat/convert","/api/v1/nepal-sambat/ics"
  ]) assert.ok(!pending.has(route),route);
});
