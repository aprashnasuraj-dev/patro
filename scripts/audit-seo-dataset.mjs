import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { getAllDays, getDay, getDayByAd, getDatasetInventory, tithiText, nsText } from "../lib/patro.mjs";

const root=process.cwd();
const expected=JSON.parse(await readFile(resolve(root,"cloudflare/d1/expected-public-counts.json"),"utf8"));
const rows=await getAllDays();
const inventory=await getDatasetInventory();
const spec=expected.critical_features?.main_calendar||{};
const failures=[];
const warn=[];
const assert=(ok,msg)=>{if(!ok)failures.push(msg);};

assert(rows.length===Number(spec.rows),`calendar rows: expected ${spec.rows}, found ${rows.length}`);
assert(rows[0]?.ad===spec.first_ad_date,`first AD: expected ${spec.first_ad_date}, found ${rows[0]?.ad}`);
assert(rows.at(-1)?.ad===spec.last_ad_date,`last AD: expected ${spec.last_ad_date}, found ${rows.at(-1)?.ad}`);
let missingBs=0,missingNs=0,missingPanchang=0,missingTithi=0;
for(const row of rows){
  if(!row.bs?.year||!row.bs?.month||!row.bs?.day)missingBs++;
  if(!nsText(row.ns))missingNs++;
  if(!row.panchang)missingPanchang++;
  if(!tithiText(row.panchang))missingTithi++;
}
assert(!missingBs,`rows missing BS: ${missingBs}`);
assert(!missingNs,`rows missing Nepal Sambat: ${missingNs}`);
assert(!missingPanchang,`rows missing Panchang: ${missingPanchang}`);
if(missingTithi)warn.push(`${missingTithi} rows do not expose a normalized tithi label even though Panchang exists`);

const target=rows.filter(r=>Number(r.bs?.year)>=2075&&Number(r.bs?.year)<=2085);
assert(target.length>3000,`2075-2085 BS sample pool unexpectedly small: ${target.length}`);
function seededIndexes(length,count){
  let x=0x20852075;const out=new Set();
  while(out.size<Math.min(count,length)){x=(Math.imul(x,1664525)+1013904223)>>>0;out.add(x%length);}
  return [...out].sort((a,b)=>a-b);
}
const internalSamples=[];
for(const i of seededIndexes(target.length,200)){
  const row=target[i];
  const byAd=await getDayByAd(row.ad);const byBs=await getDay(row.bs.year,row.bs.month,row.bs.day);
  const ok=byAd?.ad===row.ad&&byBs?.ad===row.ad&&Number(byAd?.bs?.year)===Number(row.bs.year)&&Number(byAd?.bs?.month)===Number(row.bs.month)&&Number(byAd?.bs?.day)===Number(row.bs.day);
  if(!ok)failures.push(`round-trip mismatch ${row.ad} / BS ${row.bs.year}-${row.bs.month}-${row.bs.day}`);
  internalSamples.push({ad:row.ad,bs:[row.bs.year,row.bs.month,row.bs.day].join("-"),ok});
}

let external={status:"not_provided",checked:0,mismatches:[]};
const referencePath=process.env.SEO_EXTERNAL_REFERENCE_JSON;
if(referencePath){
  const doc=JSON.parse(await readFile(resolve(root,referencePath),"utf8"));
  const refs=Array.isArray(doc)?doc:doc.rows;
  if(!Array.isArray(refs))failures.push("external reference JSON must be an array or {rows:[]}");
  else{
    const pool=refs.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(String(r.ad||""))&&/^\d{4}-\d{1,2}-\d{1,2}$/.test(String(r.bs||""))).slice(0,200);
    external={status:pool.length>=200?"checked":"insufficient",checked:pool.length,mismatches:[]};
    for(const ref of pool){
      const row=await getDayByAd(ref.ad);const actual=row?`${row.bs.year}-${row.bs.month}-${row.bs.day}`:null;
      const expectedBs=String(ref.bs).split("-").map(Number).join("-");
      if(actual!==expectedBs)external.mismatches.push({ad:ref.ad,expected:expectedBs,actual});
    }
    if(pool.length<200)failures.push(`external reference fixture has ${pool.length} valid rows; 200 required`);
    if(external.mismatches.length)failures.push(`external reference mismatches: ${external.mismatches.length}`);
  }
}else if(process.env.SEO_REQUIRE_EXTERNAL_REFERENCE==="1") failures.push("SEO_EXTERNAL_REFERENCE_JSON is required for this release gate");

const report={
  schema_version:1,generated_at:new Date().toISOString(),source:"migration/data/public/astronomy_calendar_map",
  inventory,expected:{rows:spec.rows,first_ad_date:spec.first_ad_date,last_ad_date:spec.last_ad_date},
  field_coverage:{missing_bs:missingBs,missing_nepal_sambat:missingNs,missing_panchang:missingPanchang,missing_normalized_tithi:missingTithi},
  internal_roundtrip:{range_bs:"2075-2085",sample_count:internalSamples.length,failed:internalSamples.filter(x=>!x.ok).length},
  external_reference:external,warnings:warn,failures,status:failures.length?"fail":external.status==="checked"?"pass":"pass_internal_external_pending"
};
await mkdir(resolve(root,"reports"),{recursive:true});
await writeFile(resolve(root,"reports/seo-dataset-audit.json"),JSON.stringify(report,null,2)+"\n","utf8");
console.log(JSON.stringify({status:report.status,rows:rows.length,internal_samples:internalSamples.length,external:external.status,warnings:warn.length,failures:failures.length}));
if(failures.length){for(const failure of failures)console.error("FAIL",failure);process.exit(1);}
