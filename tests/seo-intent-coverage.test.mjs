import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const catalog=JSON.parse(read("seo/search-intents.json"));
const config=read("scripts/seo-config.mjs");
const prerender=read("scripts/prerender-seo.mjs");
const support=read("src/SeoSearchSupport.tsx");
const canonicalTools=[
  "/tools/astro","/tools/nepali-typing","/tools/preeti-converter","/tools/bstoad","/tools/adtobs","/tools/calc","/tools/age","/tools/clock","/tools/forex","/tools/gold","/tools/emi","/tools/vat","/tools/units","/tools/words","/tools/incometax","/tools/landconverter","/tools/nepaliqr","/tools/fuelprice","/tools/tithi-reminder","/tools/sait","/tools/baby-names","/tools/janmadin-akhbar","/tools/future-letter","/tools/spell-check","/tools/voice-typing","/tools/ocr","/tools/name-check","/tools/read-aloud","/tools/patro-bot"
];
const devanagari=/[\u0900-\u097F]/;
const normalized=new Map();
function add(query,route){const q=String(query).trim().replace(/\s+/g," ");if(q.length<3)return;normalized.set(q.toLowerCase(),route)}
function expand(alias,route){const qs=devanagari.test(alias)?[alias,`${alias} अनलाइन`,`अनलाइन ${alias}`,`निःशुल्क ${alias}`,`${alias} नेपाल`,`${alias} tool`,`${alias} कसरी प्रयोग गर्ने`,`${alias} online Nepal`,`${alias} free tool`,`${alias} आफ्नै पात्रो`]:[alias,`${alias} online`,`free ${alias}`,`${alias} Nepal`,`${alias} Nepali`,`${alias} tool`,`best ${alias} online`,`how to use ${alias}`,`${alias} free tool`,`online ${alias} Nepal`];for(const q of qs)add(q,route)}

for(const [route,meta] of Object.entries({...catalog.core,...catalog.tools}))for(const alias of meta.aliases||[])expand(alias,route);
for(const year of [2081,2082,2083,2084,2085])for(const q of [`Nepali calendar ${year}`,`Nepal calendar ${year}`,`Nepali patro ${year}`,`Bikram Sambat calendar ${year}`,`नेपाली पात्रो ${year}`,`${year} नेपाली पात्रो`,`calendar ${year} Nepal`,`BS calendar ${year}`,`Nepali calendar ${year} festivals`,`Nepali calendar ${year} holidays`])add(q,`/calendar/${year}`);

test("all 29 canonical tools have rich intent metadata",()=>{
  assert.equal(canonicalTools.length,29);
  assert.equal(Object.keys(catalog.tools).length,29);
  for(const route of canonicalTools){
    const meta=catalog.tools[route];assert.ok(meta,route);assert.ok(config.includes(`"${route}"`),`${route} canonical config`);
    assert.ok(meta.title.length>=12,`${route} title`);assert.ok(meta.description.length>=60,`${route} description`);assert.ok(meta.aliases.length>=5,`${route} aliases`);assert.ok(meta.steps.length>=3,`${route} steps`);assert.ok(meta.faqs.length>=2,`${route} faqs`);
    assert.ok(meta.aliases.some((value)=>/[A-Za-z]/.test(value)),`${route} needs English/Roman intent`);
  }
});

test("intent expansion covers at least 1000 unique real queries without doorway routes",()=>{
  assert.ok(normalized.size>=1000,`only ${normalized.size} unique intents`);
  const allowed=new Set([...Object.keys(catalog.core),...Object.keys(catalog.tools),"/calendar/2081","/calendar/2082","/calendar/2083","/calendar/2084","/calendar/2085"]);
  for(const route of normalized.values())assert.ok(allowed.has(route),`noncanonical intent target ${route}`);
  for(const must of ["nepali calendar","aaja kati gate","आज कति गते","nepali typing","nepali unicode typing","preeti to unicode","bs to ad converter","ad to bs converter","age calculator nepal","emi calculator nepal","nepali ocr","nepali text to speech"]){assert.ok(normalized.has(must),must);}
});

test("machine intent metadata stays separate from clean user-facing guidance",()=>{
  for(const token of ["seo/search-intents.json","WebApplication","twitter:title","twitter:description"])assert.ok(prerender.includes(token),token);
  assert.ok(prerender.includes("कसरी प्रयोग गर्ने?")&&prerender.includes("धेरै सोधिने प्रश्न"));
  assert.equal(prerender.includes("सम्बन्धित नामहरू"),false,"prerender must not render query aliases as visible copy");
  assert.equal(prerender.includes('"@type": "FAQPage"'),false,"FAQ rich-result markup is obsolete for Google Search");
  assert.equal(prerender.includes('"@type": "HowTo"'),false,"HowTo rich-result markup is deprecated");
  assert.ok(support.includes("कसरी प्रयोग गर्ने?")&&support.includes("धेरै सोधिने प्रश्न"));
  assert.equal(support.includes("यो सुविधा यस्ता नामले पनि खोजिन्छ"),false,"hydrated UI must not render search aliases");
  assert.ok(!prerender.includes('meta name="keywords"'),"do not add obsolete keyword meta stuffing");
});
