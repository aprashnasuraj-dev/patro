import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("release seven keeps Home history on On This Day only",()=>{
  const source=read("src/components/HomeHistoryCard.tsx");
  assert.match(source,/\/api\/v1\/on-this-day/);
  assert.doesNotMatch(source,/\/api\/v1\/time-machine/);
  assert.match(source,/href:\s*"\/on-this-day"/);
});

test("current Home cells receive D1 sync and weather enrichment",()=>{
  const source=read("src/components/CalendarCellEnhancer.tsx");
  assert.match(source,/bsToAd/);
  assert.match(source,/\.pc-bs/);
  assert.match(source,/\/api\/v1\/sync\?start=/);
  assert.match(source,/\/api\/v1\/weather\/daily\?days=16/);
  assert.match(source,/pc-weather/);
});

test("Panchang tools accept the Cloudflare D1 panchang response shape",()=>{
  const source=read("src/patro-tools-integration/panchangAdapter.ts");
  assert.match(source,/raw\?\.ad \|\| raw\?\.date \|\| date/);
  assert.match(source,/cache\.set\(date, payload\)/);
});

test("rich repair layer covers community Jyotish Home and birthday newspaper",()=>{
  const main=read("src/main.tsx"),css=read("src/release-seven.css");
  assert.match(main,/release-seven\.css/);
  for(const selector of [".rh-hero",".community-hub-page",".jyotish-suite",".birth-paper",".pc-weather"])assert.ok(css.includes(selector),`missing ${selector}`);
});
