import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("archived Aafnai Patro UI reference is byte-exact",()=>{
  const bytes=readFileSync(new URL("../reference/aafnai-patro-ui-reference.html",import.meta.url));
  assert.equal(bytes.byteLength,249712);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),"21504b9bb8a638884b2eb00356983638bebbc310f690ee8de5721aac4cbcb519");
});

test("Aafnai design system is the final runtime presentation layer",()=>{
  const main=read("src/main.tsx");
  const aafnai=main.indexOf('import "./aafnai.css";');
  const previous=main.indexOf('import "./community/community.css";');
  assert.ok(aafnai>previous,"aafnai.css must load after retained feature styles");
  assert.equal(main.includes('import "./reference-ui.css";'),false,"archived reference styles must not load at runtime");
});

test("safe Aafnai router covers reworked UI and legacy aliases",()=>{
  const router=read("src/PatroRouter.tsx");
  for(const route of ["/time-machine","/on-this-day","/date/","/tools/astro","/me","/aaja","/astro","/nepal-sambat"]){
    assert.ok(router.includes(route),`missing app route or alias: ${route}`);
  }
  assert.ok(router.includes("TimeMachinePage"));
  assert.ok(router.includes("OnThisDayPage"));
  assert.ok(router.includes("DateDetailPage"));
  assert.ok(router.includes('"/nepal-sambat":"/nepal-sambat/mandala"'));
});

test("new Aafnai chrome exposes retained history and all community suites",()=>{
  const chrome=read("src/components/AppChrome.tsx");
  const required=[
    "/time-machine",
    "/on-this-day",
    "/samudaya",
    "/nepal-sambat/mandala",
    "/samudaya/lhosar",
    "/samudaya/tharu",
    "/samudaya/mithila",
    "/samudaya/kirat",
    "/samudaya/hijri",
    "/samudaya/chakra"
  ];
  for(const route of required) assert.ok(chrome.includes(`href=\"${route}\"`),`new UI does not expose retained route: ${route}`);
});

test("reference tool parity is wired into the React utility suite",()=>{
  const suite=read("src/utilities/UtilitySuite.tsx");
  for(const slug of ["convert","calc","age","clock","forex","gold","tax","emi","vat","land","units","words","qr","fuel"]){
    assert.ok(suite.includes(`id: "${slug}"`),`missing reference tool/alias: ${slug}`);
  }
  assert.ok(suite.includes("ReferenceUtilityTools"));
  assert.ok(suite.includes("https://www.nepalstock.com"));
  assert.ok(suite.includes("https://kalimatimarket.gov.np"));
});

test("missing tools are implemented rather than placeholder cards",()=>{
  const tools=read("src/utilities/ReferenceUtilities.tsx");
  for(const name of ["DateCalculator","AgeCalculator","WorldClock","ForexTool","GoldTool","EmiCalculator","VatPercent","TraditionalUnits","AmountWords"]){
    assert.ok(tools.includes(`function ${name}`),`missing implementation: ${name}`);
  }
  const gold=tools.slice(tools.indexOf("function GoldTool"),tools.indexOf("function EmiCalculator"));
  assert.ok(gold.includes('const [rate,setRate]=useState("")'),"gold calculator must require the user to supply the current market rate rather than inventing one");
  assert.ok(gold.includes("Rate per tola")&&gold.includes("making")&&gold.includes("tax"),"gold calculator must retain rate, weight, making-charge and tax inputs");
  assert.equal(gold.includes("fetch("),false,"gold calculator must not pretend to have a live feed when none is wired");
  assert.ok(tools.includes("/api/v1/markets/latest?kind=forex"));
  assert.ok(tools.includes("/data/market/forex-latest.json"));
});

test("Cloudflare worker exposes native migrated market data",()=>{
  const worker=read("worker/index.ts");
  assert.ok(worker.includes('path === "/api/v1/markets/latest"'));
  assert.ok(worker.includes('"market_snapshots"') || worker.includes("'market_snapshots'"));
  assert.ok(worker.includes("nativeMarketLatest"));
});

test("verified forex fallback is traceable to NRB",()=>{
  const data=JSON.parse(read("public/data/market/forex-latest.json"));
  assert.equal(data.ok,true);
  assert.equal(data.kind,"forex");
  assert.equal(data.as_of,"2026-09-30");
  assert.ok(data.items.length>=20);
  assert.ok(data.items.every((row)=>row.source_label==="Nepal Rastra Bank"));
  assert.ok(data.items.some((row)=>row.asset==="USD"));
  assert.ok(data.items.some((row)=>row.asset==="JPY"));
});

test("community suite build contract is exactly seven",()=>{
  const emitter=read("scripts/emit-community-suites.mjs");
  const required=[
    "/nepal-sambat/mandala",
    "/samudaya/lhosar",
    "/samudaya/tharu",
    "/samudaya/mithila",
    "/samudaya/kirat",
    "/samudaya/hijri",
    "/samudaya/chakra"
  ];
  for(const route of required) assert.ok(emitter.includes(route),`missing community route: ${route}`);
  assert.ok(emitter.includes("expected 7/7 routes"));
  for(const file of [
    "community-frontends/nepal-sambat-mandala.html",
    "community-frontends/lhosar.src.html",
    "community-frontends/tharu.src.html",
    "community-frontends/mithila.src.html",
    "community-frontends/kirat.src.html",
    "community-frontends/hijri.src.html",
    "community-frontends/samudaya-chakra.src.html"
  ]) assert.ok(read(file).length>1000,`community frontend missing or empty: ${file}`);
});