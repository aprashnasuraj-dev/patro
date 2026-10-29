#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const args=process.argv.slice(2);
const opt=(n,d=null)=>{const i=args.indexOf(n);return i>=0&&args[i+1]?args[i+1]:d;};
const auditPath=resolve(opt("--audit","docs/verification/nepal-rebuild-audit.json"));
const currentDir=resolve(opt("--current","data/explore/nepal"));
const out=resolve(opt("--out","docs/verification/nepal-anomaly-triage.json"));

async function compact(file,fallback){
  const d=JSON.parse(await readFile(join(currentDir,file),"utf8"));
  const idx=Object.fromEntries(d.fields.map((f,i)=>[f,i]));
  return d.rows.map(r=>({
    source_id:String(r[idx.osm_id]||""),
    name:String(r[idx.name]||""),
    name_ne:String(r[idx.name_ne]||""),
    lat:Number(r[idx.lat]),lng:Number(r[idx.lng]),
    category:idx.category==null?fallback:String(r[idx.category]||fallback),
    sub:idx.sub==null?"":String(r[idx.sub]||""),
    palika_id:idx.palika_id==null?null:r[idx.palika_id],
    ward:idx.ward==null?null:r[idx.ward],
    district_id:idx.district_id==null?null:r[idx.district_id],
  })).filter(r=>r.source_id);
}
const current=[...(await compact("osm-pois.json","poi")),...(await compact("osm-settlements.json","settlement"))];
const byId=new Map(current.map(r=>[r.source_id,r]));
const audit=JSON.parse(await readFile(auditPath,"utf8"));
const rad=v=>v*Math.PI/180;
const km=(a,b)=>{const dlat=rad(b.lat-a.lat),dlon=rad(b.lng-a.lng),q=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;return 12742*Math.asin(Math.sqrt(Math.max(0,q)));};
const duplicates=(audit.anomalies||[]).filter(x=>x.code==="probable_duplicate").map(x=>{
  const a=byId.get(String(x.other_source_id)),b=byId.get(String(x.source_id));
  const distance_m=a&&b?Math.round(km(a,b)*1000):null;
  const same_category=!!(a&&b&&a.category===b.category);
  const same_sub=!!(a&&b&&a.sub===b.sub);
  let triage="manual_review";
  if(a&&b&&same_category&&same_sub&&distance_m!=null&&distance_m<=5) triage="high_duplicate_candidate";
  else if(a&&b&&same_category&&distance_m!=null&&distance_m<=15) triage="same_category_near_duplicate";
  else if(a&&b&&!same_category&&distance_m!=null&&distance_m<=15) triage="cross_category_colocation";
  return {source_id:x.source_id,other_source_id:x.other_source_id,distance_m,same_category,same_sub,triage,a,b};
});
const disappeared=(audit.anomalies||[]).filter(x=>x.code==="disappeared").map(x=>({source_id:x.source_id,before:x.before}));
const groups=duplicates.reduce((acc,x)=>{acc[x.triage]=(acc[x.triage]||0)+1;return acc;},{});
const report={
  schema_version:1,generated_at:new Date().toISOString(),
  source_audit:auditPath,
  stable_id_continuity:audit.stable_id_continuity,
  disappeared,
  duplicate_summary:groups,
  duplicate_candidates:duplicates,
  policy:{
    high_duplicate_candidate:"same category + same subtype + <=5 m; inspect OSM objects before any correction",
    same_category_near_duplicate:"same category within 15 m but differing subtype/position; manual inspection required",
    cross_category_colocation:"same normalized name and near-identical position across categories; often legitimate co-location, never auto-dedupe",
    note:"This is review triage only. No OSM object is edited or suppressed automatically."
  }
};
await writeFile(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({out,stable_id_continuity:report.stable_id_continuity,disappeared:disappeared.length,duplicate_summary:groups},null,2));
