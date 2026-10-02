import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getDayByAd } from "../lib/patro.mjs";

const root=process.cwd();
const input=process.argv[2]||process.env.SEO_EXTERNAL_REFERENCE_JSON;
if(!input)throw new Error("Independent reference required: npm run seo:accuracy-reference -- path/to/reference.json");
const doc=JSON.parse(await readFile(resolve(root,input),"utf8"));
const source=String(doc.source||doc.reference_source||"").trim();
const raw=Array.isArray(doc)?doc:doc.rows;
if(!Array.isArray(raw))throw new Error("Reference JSON must be an array or {source, rows:[...]}");
if(!source&&!Array.isArray(doc))console.warn("Reference fixture has no source label; keep provenance with the audit artifact.");

const eligible=raw.filter((r)=>{
  const ad=String(r?.ad||"");const bs=String(r?.bs||"");
  const year=Number(bs.split("-")[0]);
  return /^\d{4}-\d{2}-\d{2}$/.test(ad)&&/^\d{4}-\d{1,2}-\d{1,2}$/.test(bs)&&year>=2075&&year<=2085;
});
if(eligible.length<200)throw new Error(`Independent reference needs at least 200 valid mappings across BS 2075–2085; found ${eligible.length}`);

// Sort before slicing so the release gate is deterministic for the same independent fixture.
const sample=eligible.sort((a,b)=>String(a.ad).localeCompare(String(b.ad))).slice(0,200);
const mismatches=[];
for(const ref of sample){
  const row=await getDayByAd(ref.ad);
  const expected=String(ref.bs).split("-").map(Number).join("-");
  const actual=row?`${row.bs.year}-${row.bs.month}-${row.bs.day}`:null;
  if(actual!==expected)mismatches.push({ad:ref.ad,expected,actual});
}
console.log(JSON.stringify({source:source||"unlabelled-independent-reference",range_bs:[2075,2085],checked:sample.length,mismatches:mismatches.length},null,2));
if(mismatches.length){for(const item of mismatches.slice(0,20))console.error("MISMATCH",item);process.exit(1);}
console.log("Independent 200-date BS↔AD accuracy gate passed.");
