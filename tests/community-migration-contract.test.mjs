import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const json=(path)=>JSON.parse(read(path));
const IDS=["nepal-sambat","lhosar","tharu","mithila","kirat","hijri"];

test("exactly six community calendars remain registered",()=>{
  const preferences=read("src/community/preferences.ts");
  for(const id of IDS) assert.ok(preferences.includes('id: "'+id+'"'),id);
  assert.equal((preferences.match(/id: "/g)||[]).length,6);
});

test("build preserves six calendars plus Samudaya Chakra aggregate",()=>{
  const emitter=read("scripts/emit-community-suites.mjs");
  const routes=[
    "/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu",
    "/samudaya/mithila","/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"
  ];
  for(const route of routes) assert.ok(emitter.includes('"'+route+'"'),route);
  assert.ok(emitter.includes("expected 7/7 routes"));
});

test("D1 migration snapshot contains every community dataset",()=>{
  const counts=json("cloudflare/d1/expected-public-counts.json");
  assert.equal(counts.tables.community_dates,1062);
  assert.equal(counts.tables.community_festivals,34);
  assert.equal(counts.tables.ns_days,14972);
  assert.equal(counts.tables.ns_festival_dates,1886);
  assert.equal(counts.tables.ns_festivals,47);
  assert.deepEqual(counts.critical_features.community_suites.calendar_ids,IDS);
});

test("five non-NS suites have their full migrated row distribution",()=>{
  const dates=json("migration/data/public/community_dates.json").rows;
  const festivals=json("migration/data/public/community_festivals.json").rows;
  const ids=["lhosar","tharu","mithila","kirat","hijri"];
  const dc=Object.fromEntries(ids.map(id=>[id,dates.filter(r=>r.suite===id).length]));
  const fc=Object.fromEntries(ids.map(id=>[id,festivals.filter(r=>r.suite===id).length]));
  assert.deepEqual(dc,{lhosar:124,tharu:155,mithila:372,kirat:124,hijri:287});
  assert.deepEqual(fc,{lhosar:4,tharu:5,mithila:12,kirat:4,hijri:9});
});

test("public community runtime is wired to Cloudflare D1 and existing validated Hijri math",()=>{
  const community=read("worker/community.ts");
  const index=read("worker/index.ts");
  assert.ok(index.includes('import { communityResponse } from "./community";'));
  assert.ok(index.includes("communityResponse(request,env)"));
  assert.ok(community.includes('from "../src/patro-tools/communities/hijri/calendar"'));
  assert.ok(community.includes('from "../src/patro-tools/communities/hijri/prayer"'));
  assert.ok(community.includes("table_name='community_dates'"));
  assert.ok(community.includes("table_name='ns_days'"));
  assert.ok(!/supabase/i.test(community),"public native community runtime must not call Supabase");
});

test("cutover contract probes all six calendars and the aggregate hub",()=>{
  const contract=json("cloudflare/cutover-contract.json");
  const paths=new Set(contract.routes.map(r=>r.path));
  for(const path of [
    "/nepal-sambat/mandala","/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila",
    "/samudaya/kirat","/samudaya/hijri","/samudaya/chakra","/api/v1/communities",
    "/api/v1/hijri?date=2026-09-30&lat=27.7172&lon=85.324&method=karachi&asr=hanafi",
    "/api/v1/nepal-sambat?ad=2026-09-30"
  ]) assert.ok(paths.has(path),path);
});

test("community APIs are fully native and no longer cutover blockers",()=>{
  const remaining=json("cloudflare/remaining-cutover.json");
  assert.equal(remaining.community_frontend_parity.required_calendar_count,6);
  assert.deepEqual(remaining.remaining_native_port_groups,[]);
  assert.deepEqual(remaining.community_frontend_parity.pending_private_routes,[]);
  const native=new Set(remaining.already_native_or_local_first.worker_endpoints||[]);
  for(const path of [
    "/api/v1/communities","/api/v1/community-preferences",
    "/api/v1/admin/community-overrides","/api/v1/admin/ns-festival-dates",
    "/api/v1/hijri","/api/v1/nepal-sambat"
  ]) assert.ok(native.has(path),path);
});
