#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const args=process.argv.slice(2);
const opt=(n,d=null)=>{const i=args.indexOf(n);return i>=0&&args[i+1]?args[i+1]:d;};
const dir=resolve(opt("--data","data/explore/nepal"));
const out=resolve(opt("--out","docs/verification/nepal-boundary-review.json"));
const limit=Math.max(10,Number(opt("--limit","500"))||500);

async function load(file,category){
  const d=JSON.parse(await readFile(join(dir,file),"utf8"));
  const idx=Object.fromEntries(d.fields.map((f,i)=>[f,i]));
  return d.rows.map(r=>({
    category:idx.category==null?category:(r[idx.category]||category),
    source_id:r[idx.osm_id],name:r[idx.name]||r[idx.name_ne]||"",name_ne:r[idx.name_ne]||"",
    lat:r[idx.lat],lng:r[idx.lng],palika_id:r[idx.palika_id]||0,ward:r[idx.ward]||0,district_id:r[idx.district_id]||0,
    confidence:r[idx.admin_confidence]||"unverified",
    boundary_distance_m:Number.isFinite(Number(r[idx.boundary_distance_m]))?Number(r[idx.boundary_distance_m]):null,
    reason:r[idx.admin_confidence_reason]||"",
  }));
}
const rows=[...(await load("osm-pois.json","poi")),...(await load("osm-settlements.json","settlement"))];
const counts=rows.reduce((a,r)=>{a[r.confidence]=(a[r.confidence]||0)+1;return a;},{});
const rank={low:0,unverified:1,medium:2,high:3};
const review=rows.filter(r=>r.confidence!=="high").sort((a,b)=>(rank[a.confidence]??9)-(rank[b.confidence]??9)||(a.boundary_distance_m??1e12)-(b.boundary_distance_m??1e12)||String(a.source_id).localeCompare(String(b.source_id)));
const near=rows.filter(r=>r.boundary_distance_m!=null&&r.boundary_distance_m<=1000).sort((a,b)=>a.boundary_distance_m-b.boundary_distance_m);
const reasons={};for(const r of review) reasons[r.reason||"unspecified"]=(reasons[r.reason||"unspecified"]||0)+1;
const report={schema_version:1,generated_at:new Date().toISOString(),rows:rows.length,confidence_counts:counts,review_count:review.length,review_reason_counts:reasons,near_boundary:{within_250m:near.filter(r=>r.boundary_distance_m<=250).length,within_1000m:near.length},review_candidates:review.slice(0,limit),closest_to_boundary:near.slice(0,Math.min(limit,250)),interpretation:"Review candidates are evidence triage only. Near-boundary distance does not prove an incorrect assignment; low/unverified status and explicit mismatch reasons require source inspection before correction."};
await writeFile(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({out,rows:report.rows,confidence_counts:counts,review_count:review.length,near_boundary:report.near_boundary,top_reasons:Object.entries(reasons).sort((a,b)=>b[1]-a[1]).slice(0,10)},null,2));
