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

test("reference design layer loads after existing app styles",()=>{
  const main=read("src/main.tsx");
  const ref=main.indexOf('import "./reference-ui.css";');
  const previous=main.indexOf('import "./community/community.css";');
  assert.ok(ref>previous,"reference-ui.css must load last so the reference design can override presentation without rewriting feature CSS");
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
  assert.match(tools,/no verified live gold\/silver feed/i);
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
