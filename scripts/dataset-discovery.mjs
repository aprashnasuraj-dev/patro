import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getAllDays, getDatasetInventory, getDay, getDayByAd, getMonth, getYear,
  getFestivals, getFestival, getSait, getHolidays, convertBsToAd, convertAdToBs,
  getTodayNepal, getTithiAt, nsText, tithiText
} from "../lib/patro.mjs";

const root = process.cwd();
const expected=JSON.parse(await readFile(resolve(root,"cloudflare/d1/expected-public-counts.json"),"utf8"));
const spec=expected.critical_features?.main_calendar||{};
const inventory = await getDatasetInventory();
const rows = await getAllDays();
const failures=[];
const warnings=[];
const assert=(ok,msg)=>{if(!ok)failures.push(msg);};

assert(rows.length===Number(spec.rows),`calendar rows: expected ${spec.rows}, found ${rows.length}`);
assert(inventory.firstAd===spec.first_ad_date,`first AD: expected ${spec.first_ad_date}, found ${inventory.firstAd}`);
assert(inventory.lastAd===spec.last_ad_date,`last AD: expected ${spec.last_ad_date}, found ${inventory.lastAd}`);

let missingBs=0,missingNs=0,missingPanchang=0,missingTithi=0;
for(const row of rows){
  if(!row.bs?.year||!row.bs?.month||!row.bs?.day)missingBs++;
  if(!nsText(row.ns))missingNs++;
  if(!row.panchang)missingPanchang++;
  if(!tithiText(row.panchang))missingTithi++;
}
assert(missingBs===0,`rows missing BS: ${missingBs}`);
assert(missingNs===0,`rows missing Nepal Sambat: ${missingNs}`);
assert(missingPanchang===0,`rows missing Panchang: ${missingPanchang}`);
if(missingTithi)warnings.push(`${missingTithi} rows do not expose a normalized tithi label even though Panchang exists`);

const requiredFunctions = {
  getDay, getDayByAd, getMonth, getYear, getFestivals, getFestival, getSait, getHolidays,
  convertBsToAd, convertAdToBs, getTodayNepal, getTithiAt
};
for (const [name, fn] of Object.entries(requiredFunctions)) assert(typeof fn === "function",`adapter function missing: ${name}`);

function deterministicIndexes(length,count,seed=0x20852075){
  let x=seed>>>0;const out=new Set();
  while(out.size<Math.min(count,length)){x=(Math.imul(x,1664525)+1013904223)>>>0;out.add(x%length);}
  return [...out].sort((a,b)=>a-b);
}

const candidates=rows.filter(r=>Number(r.bs?.year)>=2075&&Number(r.bs?.year)<=2085);
assert(candidates.length>3000,`2075-2085 BS sample pool unexpectedly small: ${candidates.length}`);
const samples=[];
for(const i of deterministicIndexes(candidates.length,200)){
  const row=candidates[i];
  const ad=await convertBsToAd(row.bs);const bs=await convertAdToBs(row.ad);
  const ok=ad===row.ad&&Number(bs?.year)===Number(row.bs.year)&&Number(bs?.month)===Number(row.bs.month)&&Number(bs?.day)===Number(row.bs.day);
  if(!ok)failures.push(`round-trip mismatch ${row.ad} / ${row.bs.year}-${row.bs.month}-${row.bs.day}`);
  samples.push({ad:row.ad,bs:`${row.bs.year}-${row.bs.month}-${row.bs.day}`,ok});
}
assert(samples.length===200,`internal sample count must be 200, found ${samples.length}`);

function normalizeReference(row){
  const ad=String(row?.ad||row?.ad_date||"").slice(0,10);
  let bs=null;
  if(typeof row?.bs==="string"){
    const m=row.bs.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)bs={year:Number(m[1]),month:Number(m[2]),day:Number(m[3])};
  }else if(row?.bs&&typeof row.bs==="object")bs={year:Number(row.bs.year),month:Number(row.bs.month),day:Number(row.bs.day)};
  else if(row?.bs_year)bs={year:Number(row.bs_year),month:Number(row.bs_month),day:Number(row.bs_day)};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(ad)||!bs||!Number.isInteger(bs.year)||bs.year<2075||bs.year>2085||bs.month<1||bs.month>12||bs.day<1||bs.day>32)return null;
  return {ad,bs,tithi:String(row?.tithi||row?.tithi_ne||"").trim(),source:row?.source||null};
}

const referencePath=process.argv[2]||process.env.SEO_EXTERNAL_REFERENCE_JSON||"";
const requireExternal=process.env.SEO_REQUIRE_EXTERNAL_REFERENCE==="1"||Boolean(process.argv[2]);
let external={status:"not_provided",checked:0,represented_bs_years:0,tithi_checked:0,mismatches:[]};
if(referencePath){
  const doc=JSON.parse(await readFile(resolve(root,referencePath),"utf8"));
  const rawRefs=Array.isArray(doc)?doc:Array.isArray(doc?.rows)?doc.rows:[];
  const unique=new Map();
  for(const raw of rawRefs){const ref=normalizeReference(raw);if(ref)unique.set(`${ref.bs.year}-${ref.bs.month}-${ref.bs.day}`,ref);}
  const refs=[...unique.values()];
  if(refs.length<200)failures.push(`external reference fixture has ${refs.length} valid unique rows across BS 2075-2085; 200 required`);
  const picked=deterministicIndexes(refs.length,Math.min(200,refs.length),0xAFAA2026).map(i=>refs[i]);
  const years=new Set(picked.map(x=>x.bs.year));
  if(picked.length===200&&years.size<8)failures.push(`external 200-date sample is too concentrated: only ${years.size} represented BS years`);
  external={status:picked.length===200?"checked":"insufficient",checked:picked.length,represented_bs_years:years.size,tithi_checked:0,mismatches:[]};
  for(const ref of picked){
    const actual=await getDay(ref.bs.year,ref.bs.month,ref.bs.day);
    const key=`${ref.bs.year}-${ref.bs.month}-${ref.bs.day}`;
    if(!actual){external.mismatches.push({key,expected_ad:ref.ad,actual:null});continue;}
    if(actual.ad!==ref.ad)external.mismatches.push({key,expected_ad:ref.ad,actual_ad:actual.ad});
    if(ref.tithi){
      external.tithi_checked++;
      const actualTithi=tithiText(actual.panchang).normalize("NFKC");
      if(actualTithi!==ref.tithi.normalize("NFKC"))external.mismatches.push({key,expected_tithi:ref.tithi,actual_tithi:actualTithi||null});
    }
  }
  if(external.mismatches.length)failures.push(`external reference mismatches: ${external.mismatches.length}`);
}else if(requireExternal)failures.push("Independent 200-date reference is required. Pass a JSON path as argv[2] or SEO_EXTERNAL_REFERENCE_JSON.");

const report = {
  schema_version:3,generated_at:new Date().toISOString(),
  source:"migration/data/public/astronomy_calendar_map + approved public reference snapshots",
  dataset_policy:"No second calendar dataset. Build-time and runtime providers wrap the same approved source model.",
  calendar:{rows:inventory.calendarRows,ad_range:[inventory.firstAd,inventory.lastAd],bs_range:[inventory.firstBs,inventory.lastBs],fields:inventory.fields?.calendar||[],bs_fields:inventory.fields?.bs||[],panchang_fields:inventory.fields?.panchang||[]},
  field_coverage:{missing_bs:missingBs,missing_nepal_sambat:missingNs,missing_panchang:missingPanchang,missing_normalized_tithi:missingTithi},
  holidays:{rows:inventory.holidayRows,fields:inventory.fields?.holiday||[]},panchang_facts:{rows:inventory.panchangFactRows,fields:inventory.fields?.panchangFact||[]},cities:inventory.cities,
  converter:{server_exposed:true,adapter_functions:["convertBsToAd","convertAdToBs"],internal_roundtrip:{range_bs:[2075,2085],sample_count:samples.length,failed:samples.filter(x=>!x.ok).length}},
  exact_adapter_contract:Object.keys(requiredFunctions),
  provenance_note:"Per-record source/verification fields are preserved when present; missing provenance must not be fabricated in rendered output.",
  independent_accuracy_audit:{required_sample_size:200,bs_year_window:[2075,2085],reference:referencePath||null,...external},
  warnings,failures,status:failures.length?"fail":external.status==="checked"?"pass":"pass_internal_external_pending"
};
await mkdir(resolve(root,"reports"),{recursive:true});
await Promise.all([
  writeFile(resolve(root,"seo-dataset-inventory.json"),JSON.stringify(report,null,2)+"\n","utf8"),
  writeFile(resolve(root,"reports/seo-dataset-audit.json"),JSON.stringify(report,null,2)+"\n","utf8")
]);
console.log(`Phase 0 dataset audit: ${report.status}; ${inventory.calendarRows} rows, ${inventory.firstAd} → ${inventory.lastAd}; 200 internal round-trips; external=${external.status}.`);
if(failures.length){for(const failure of failures)console.error("FAIL",failure);process.exit(1);}
