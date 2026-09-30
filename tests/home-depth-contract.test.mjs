import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("home surfaces deep features without autoplay",()=>{
  const home=read("src/components/HomeDeepSections.tsx");
  for(const text of ["MediaPreview","HistoryWidget","NewsWidget","MarketsWidget","WorldTimeStrip","ToolGrid"]){
    assert.ok(home.includes("function "+text),text);
  }
  assert.ok(home.includes('href="/tv"'));
  assert.ok(home.includes('href="/fm"'));
  assert.ok(home.includes('Playback starts only after you choose a channel.'));
  assert.ok(!/autoplay/i.test(home),"home media preview must not autoplay");
});

test("below-the-fold home data is lazy and independently fetched",()=>{
  const home=read("src/components/HomeDeepSections.tsx");
  assert.ok(home.includes("IntersectionObserver"));
  assert.ok(home.includes("/api/v1/on-this-day?date="));
  assert.ok(home.includes("/api/v1/news/latest?limit=5"));
  assert.ok(home.includes("/api/v1/markets/latest?kind="));
});

test("Cloudflare serves latest migrated news from D1 with compatibility fallback",()=>{
  const worker=read("worker/index.ts");
  assert.ok(worker.includes("nativeNewsLatest"));
  assert.ok(worker.includes("table_name='news_items'"));
  assert.ok(worker.includes('path === "/api/v1/news/latest"'));
  assert.ok(worker.includes('"/api/samachar/feed"'));
});

test("brief news/history aliases work through React, Pages and Worker static routing",()=>{
  const router=read("src/PatroRouter.tsx");
  const pages=read("functions/[[path]].js");
  const worker=read("worker/index.ts");
  for(const path of ["/news","/history"]){
    assert.ok(router.includes('"'+path+'"'));
    assert.ok(pages.includes('"'+path+'"'));
    assert.ok(worker.includes('"'+path+'"'));
  }
  assert.ok(router.includes('to="/samachar"'));
  assert.ok(router.includes('to="/on-this-day"'));
});

test("home parity exposes reference utility entry points",()=>{
  const home=read("src/components/HomeDeepSections.tsx");
  for(const slug of ["convert","calc","age","forex","emi","vat","units","words"]){
    assert.ok(home.includes('/tools/'+slug),slug);
  }
});
