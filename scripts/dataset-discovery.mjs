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

const candidates=rows.filter(r=>Number(r.bs?.year)>=2075&&Number(r.bs?.year)<=2085);
assert(candidates.length>3000,`2075-2085 BS sample pool unexpectedly small: ${candidates.length}`);
function deterministicIndexes(length,count){
  let x=0x20852075;const out=new Set();
  while(out.size<Math.min(count,length)){x=(Math.imul(x,1664525)+1013904223)>>>0;out.add(x%length);}
  return [...out].sort((a,b)=>a-b);
}
const samples=[];
for(const i of deterministicIndexes(candidates.length,200)){
  const row=candidates[i];
  const ad=await convertBsToAd(row.bs);const bs=await convertAdToBs(row.ad);
  const ok=ad===row.ad&&Number(bs?.year)===Number(row.bs.year)&&Number(bs?.month)===Number(row.bs.month)&&Number(bs?.day)===Number(row.bs.day);
  if(!ok)failures.push(`round-trip mismatch ${row.ad} / ${row.bs.year}-${row.bs.month}-${row.bs.day}`);
  samples.push({ad:row.ad,bs:`${row.bs.year}-${row.bs.month}-${row.bs.day}`,ok});
}
assert(samples.length===200,`internal sample count must be 200, found ${samples.length}`);

const report = {
  schema_version:2,generated_at:new Date().toISOString(),
  source:"migration/data/public/astronomy_calendar_map + approved public reference snapshots",
  dataset_policy:"No second calendar dataset. Build-time and runtime adapters wrap the same approved source model.",
  calendar:{rows:inventory.calendarRows,ad_range:[inventory.firstAd,inventory.lastAd],bs_range:[inventory.firstBs,inventory.lastBs],fields:inventory.fields?.calendar||[],bs_fields:inventory.fields?.bs||[],panchang_fields:inventory.fields?.panchang||[]},
  field_coverage:{missing_bs:missingBs,missing_nepal_sambat:missingNs,missing_panchang:missingPanchang,missing_normalized_tithi:missingTithi},
  holidays:{rows:inventory.holidayRows,fields:inventory.fields?.holiday||[]},panchang_facts:{rows:inventory.panchangFactRows,fields:inventory.fields?.panchangFact||[]},cities:inventory.cities,
  converter:{server_exposed:true,adapter_functions:["convertBsToAd","convertAdToBs"],internal_roundtrip:{range_bs:[2075,2085],sample_count:samples.length,failed:samples.filter(x=>!x.ok).length}},
  exact_adapter_contract:Object.keys(requiredFunctions),
  provenance_note:"Per-record source/verification fields are preserved when present; missing provenance must not be fabricated in rendered output.",
  independent_accuracy_audit:{required_sample_size:200,bs_year_window:[2075,2085],command:"npm run seo:accuracy-reference -- path/to/reference.json",status:"external_fixture_required"},
  warnings,failures,status:failures.length?"fail":"pass_internal_external_pending"
};
await mkdir(resolve(root,"reports"),{recursive:true});
await Promise.all([
  writeFile(resolve(root,"seo-dataset-inventory.json"),JSON.stringify(report,null,2)+"\n","utf8"),
  writeFile(resolve(root,"reports/seo-dataset-audit.json"),JSON.stringify(report,null,2)+"\n","utf8")
]);
console.log(`Phase 0 internal discovery passed: ${inventory.calendarRows} rows, ${inventory.firstAd} → ${inventory.lastAd}; 200 internal round-trips checked. External independent reference remains a separate release gate.`);
if(failures.length){for(const failure of failures)console.error("FAIL",failure);process.exit(1);}
