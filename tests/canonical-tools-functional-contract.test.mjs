import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

const canonical=[
 "astro","nepali-typing","preeti-converter","bstoad","adtobs","calc","age","clock","forex","gold","emi","vat","units","words","incometax","landconverter","nepaliqr","fuelprice","tithi-reminder","sait","baby-names","janmadin-akhbar","future-letter","spell-check","voice-typing","ocr","name-check","read-aloud","patro-bot"
];

test("canonical tool inventory stays exactly 29 unique public tools",()=>{
 assert.equal(canonical.length,29);
 assert.equal(new Set(canonical).size,29);
 const config=read("scripts/seo-config.mjs");
 for(const slug of canonical)assert.ok(config.includes(`"/tools/${slug}"`),`SEO canonical inventory lost ${slug}`);
});

test("specialized Astronomy and Nepali Typing tools have real routed implementations",()=>{
 const router=read("src/PatroRouter.tsx");
 const typing=read("src/features/nepali-tools/NepaliTools.tsx");
 assert.ok(router.includes('path==="/tools/astro"'));
 assert.ok(router.includes("<AstroPage"));
 assert.ok(router.includes('path==="/tools/nepali-typing"'));
 assert.ok(router.includes('<NepaliTools mode="typing"'));
 assert.ok(typing.includes('const BASE = "/nepali-tools"'));
});

test("shared UtilitySuite implements converter and worker-backed canonical tools",()=>{
 const utilities=read("src/utilities/UtilitySuite.tsx");
 for(const slug of ["preeti-converter","bstoad","adtobs","incometax","landconverter","nepaliqr","fuelprice"]){
  assert.ok(utilities.includes(`id: "${slug}"`)||utilities.includes(`selectedTool === "${slug}"`),`UtilitySuite lost ${slug}`);
 }
 for(const workerType of ["font","date-bs","date-ad","land-sqft","tax-2083","qr"]){
  assert.ok(utilities.includes(`type: "${workerType}"`),`utility worker action lost ${workerType}`);
 }
 assert.ok(utilities.includes('fetch("/api/v1/noc/fuel-prices"'),"fuelprice lost NOC API");
});

test("nine reference utilities contain interactive local implementations and verified forex fallback",()=>{
 const refs=read("src/utilities/ReferenceUtilities.tsx");
 const implementations={calc:"DateCalculator",age:"AgeCalculator",clock:"WorldClock",forex:"ForexTool",gold:"GoldTool",emi:"EmiCalculator",vat:"VatPercent",units:"TraditionalUnits",words:"AmountWords"};
 for(const [slug,name] of Object.entries(implementations)){
  assert.ok(refs.includes(`function ${name}`),`${slug} lost ${name}`);
  assert.ok(refs.includes(`tool==="${slug}"`)||slug==="words",`${slug} is no longer routed by ReferenceUtilityTools`);
 }
 assert.ok(refs.includes('/api/v1/markets/latest?kind=forex'),"forex lost Cloudflare market endpoint");
 assert.ok(refs.includes('/data/market/forex-latest.json'),"forex lost verified offline snapshot fallback");
 assert.ok(refs.includes("Runs on device"),"local utility privacy indicator disappeared");
});

test("all eleven bespoke Patro tools map to lazy-loaded real components",()=>{
 const shell=read("src/patro-tools-integration/PatroToolsShell.tsx");
 const mapping={
  "tithi-reminder":"TithiReminderTool","sait":"SaitTool","baby-names":"BabyNamesTool","janmadin-akhbar":"JanmadinAkhbarTool","future-letter":"FutureLetterTool","spell-check":"SpellCheckTool","voice-typing":"VoiceTypingTool","ocr":"OcrTool","name-check":"NameCheckTool","read-aloud":"ReadAloudTool","patro-bot":"PatroBotTool"
 };
 for(const [slug,component] of Object.entries(mapping)){
  assert.ok(shell.includes(`slug==="${slug}"`),`${slug} lost route mapping`);
  assert.ok(shell.includes(component),`${slug} lost ${component}`);
 }
 assert.equal(/integration phase|coming soon/i.test(shell),false);
});

test("canonical tools are reachable through production SPA and no generic compatibility page is needed",()=>{
 const bridge=read("worker/connected-entry.ts");
 const router=read("src/PatroRouter.tsx");
 assert.ok(bridge.includes('path.startsWith("/tools/")'));
 assert.ok(bridge.includes('url.pathname = "/index.html"')||bridge.includes('"/index.html"'));
 assert.equal(router.includes("compat/page"),false);
});
