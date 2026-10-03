import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const json=(path)=>JSON.parse(read(path));
const canonicalTools=[
 "/tools/astro","/tools/nepali-typing","/tools/preeti-converter","/tools/bstoad","/tools/adtobs","/tools/calc","/tools/age","/tools/clock","/tools/forex","/tools/gold","/tools/emi","/tools/vat","/tools/units","/tools/words","/tools/incometax","/tools/landconverter","/tools/nepaliqr","/tools/fuelprice","/tools/tithi-reminder","/tools/sait","/tools/baby-names","/tools/janmadin-akhbar","/tools/future-letter","/tools/spell-check","/tools/voice-typing","/tools/ocr","/tools/name-check","/tools/read-aloud","/tools/patro-bot"
];

function lookup(payload, query){
 const needle=query.toLocaleLowerCase("en-US");
 return payload.intents.find((row)=>row.query.toLocaleLowerCase("en-US")===needle);
}

test("search/AI intent graph covers at least 3000 unique real queries",()=>{
 assert.ok(existsSync(new URL("../public/search-intents.json",import.meta.url)),"build must generate public/search-intents.json");
 const payload=json("public/search-intents.json");
 assert.equal(payload.schema_version,2);
 assert.equal(payload.canonical_site,"https://aafnaipatro.com");
 assert.ok(payload.query_count>=3000,`expected >=3000 intents, got ${payload.query_count}`);
 assert.equal(payload.query_count,payload.intents.length);
 assert.ok(payload.canonical_page_count>=70,"intent graph should span tools, core, community, month/year and diaspora routes");
 assert.equal(payload.canonical_tool_count,29);
 assert.ok(payload.minimum_tool_intents>=50,`minimum tool intent coverage too low: ${payload.minimum_tool_intents}`);
 assert.equal(new Set(payload.intents.map((row)=>row.query.toLocaleLowerCase("en-US"))).size,payload.intents.length,"queries must be unique");
 for(const row of payload.intents){
   assert.ok(row.route.startsWith("/"),`invalid canonical route for ${row.query}`);
   assert.ok(!row.route.startsWith("/api/")&&!row.route.startsWith("/me/")&&!row.route.startsWith("/admin/")&&!row.route.startsWith("/auth/"),`private route leaked into discovery: ${row.route}`);
 }
});

test("all 29 tools receive deep query coverage",()=>{
 const payload=json("public/search-intents.json");
 for(const route of canonicalTools){
   assert.ok(payload.routes[route],`missing intent bucket for ${route}`);
   assert.ok(payload.routes[route].length>=50,`${route} has only ${payload.routes[route].length} intents`);
   assert.ok(payload.tool_coverage[route]>=50,`${route} tool coverage summary is weak`);
 }
});

test("priority Nepali, English and Romanized searches resolve to the right canonical pages",()=>{
 const payload=json("public/search-intents.json");
 const expected={
   "nepali calendar":"/",
   "नेपाली पात्रो":"/",
   "aaja kati gate":"/today",
   "आज कति गते":"/today",
   "nepali date today":"/today",
   "nepali date converter":"/convert",
   "bs to ad converter":"/convert",
   "ad to bs converter":"/convert",
   "nepali typing":"/tools/nepali-typing",
   "english to nepali typing":"/tools/nepali-typing",
   "नेपाली टाइपिङ":"/tools/nepali-typing",
   "preeti to unicode":"/tools/preeti-converter",
   "today rashifal nepali":"/rashifal",
   "nepali astronomical calendar":"/tools/astro",
   "nepal live tv":"/tv",
   "nepali fm online":"/fm",
   "nepali kundali":"/jyotish/china"
 };
 for(const [query,route] of Object.entries(expected)){
   const row=lookup(payload,query);assert.ok(row,`priority query missing: ${query}`);assert.equal(row.route,route,query);
 }
});

test("AI-readable query maps and well-known discovery metadata are emitted",()=>{
 for(const path of ["public/search-intents.txt","public/.well-known/search-intents.json"])assert.ok(existsSync(new URL("../"+path,import.meta.url)),path);
 const text=read("public/search-intents.txt");
 assert.ok(text.includes("aaja kati gate -> https://aafnaipatro.com/today"));
 assert.ok(text.includes("nepali typing -> https://aafnaipatro.com/tools/nepali-typing"));
 const well=json("public/.well-known/search-intents.json");
 assert.ok(well.query_count>=3000);
 assert.equal(well.canonical_tool_count,29);
 assert.equal(well.search_map,"https://aafnaipatro.com/search-intents.json");
});

test("build pipeline regenerates query coverage before SEO assets",()=>{
 const pkg=json("package.json");
 assert.equal(pkg.scripts["seo:intents"],"node scripts/generate-search-intents.mjs");
 assert.ok(pkg.scripts.build.includes("npm run seo:intents && node scripts/generate-seo.mjs"));
 assert.ok(pkg.scripts["seo:generate"].startsWith("npm run seo:intents"));
 const generator=read("scripts/generate-search-intents.mjs");
 assert.ok(generator.includes("const TARGET = 3000"));
 assert.ok(generator.includes("minimumToolCoverage < 50"));
 assert.ok(generator.includes("thin doorway pages"));
});
