#!/usr/bin/env node
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const args=process.argv.slice(2);
const opt=(name,required=true)=>{
  const i=args.indexOf(name),v=i>=0?args[i+1]:null;
  if(required&&!v) throw new Error("missing "+name);
  return v;
};
const dataDir=resolve(opt("--data"));
const out=resolve(opt("--out"));
const rebuildPath=opt("--rebuild",false);
const minimumSample=Math.max(1,Number(opt("--minimum-sample",false)||5));

const admin=JSON.parse(await readFile(join(dataDir,"admin.json"),"utf8"));
const files=(await readdir(dataDir)).filter((x)=>x.endsWith(".json")&&!["admin.json","manifest.json","boundary-confidence.json"].includes(x));
const rows=[];
for(const file of files){
  const path=join(dataDir,file);
  let data;
  try{data=JSON.parse(await readFile(path,"utf8"));}catch{continue;}
  if(!Array.isArray(data?.fields)||!Array.isArray(data?.rows)) continue;
  const idx=Object.fromEntries(data.fields.map((f,i)=>[f,i]));
  for(const required of ["name","name_ne","palika_id","ward","district_id","source_id","place_id","admin_confidence"]){
    if(idx[required]===undefined) throw new Error(`${file} missing required quality field ${required}; run with stable-ID and boundary-confidence flags`);
  }
  for(const r of data.rows){
    const palika=Number(r[idx.palika_id])||0,ward=Number(r[idx.ward])||0,district=Number(r[idx.district_id])||0;
    if(!palika||!district) continue;
    rows.push({
      category:file.replace(/\.json$/,""),
      palika_id:palika,ward,district_id:district,
      has_name:Boolean(String(r[idx.name]||"").trim()),
      has_name_ne:Boolean(String(r[idx.name_ne]||"").trim()),
      has_source_id:Boolean(String(r[idx.source_id]||"").trim()),
      has_place_id:Boolean(String(r[idx.place_id]||"").trim()),
      admin_confidence:String(r[idx.admin_confidence]||"unverified"),
    });
  }
}

const weights={stable_place_id:0.30,bilingual_name:0.20,reliable_admin_assignment:0.35,source_identity:0.15};
function summarize(list){
  const count=list.length;
  const n=(fn)=>list.filter(fn).length;
  const metrics={
    stable_place_id:n((x)=>x.has_place_id)/Math.max(1,count),
    bilingual_name:n((x)=>x.has_name&&x.has_name_ne)/Math.max(1,count),
    reliable_admin_assignment:n((x)=>x.admin_confidence==="high"||x.admin_confidence==="medium")/Math.max(1,count),
    high_admin_assignment:n((x)=>x.admin_confidence==="high")/Math.max(1,count),
    source_identity:n((x)=>x.has_source_id)/Math.max(1,count),
  };
  const raw=Object.entries(weights).reduce((s,[k,w])=>s+(metrics[k]||0)*w,0)*100;
  const confidence_counts=list.reduce((a,x)=>{a[x.admin_confidence]=(a[x.admin_confidence]||0)+1;return a;},{});
  return {
    sample_size:count,
    score:count>=minimumSample?Number(raw.toFixed(1)):null,
    score_status:count>=minimumSample?"scored":"insufficient_sample",
    metrics:Object.fromEntries(Object.entries(metrics).map(([k,v])=>[k,Number(v.toFixed(4))])),
    admin_confidence_counts:confidence_counts,
  };
}
const group=(keyFn)=>{
  const m=new Map();
  for(const row of rows){const k=keyFn(row);if(!m.has(k))m.set(k,[]);m.get(k).push(row);}
  return m;
};
const palikaGroups=group((x)=>String(x.palika_id));
const wardGroups=group((x)=>x.palika_id+":"+x.ward);
const palikas=[...palikaGroups.entries()].map(([id,list])=>{
  const meta=admin.palikas?.[id]||[];
  return {palika_id:Number(id),slug:meta[0]||null,name:meta[1]||null,name_ne:meta[2]||null,district_id:meta[3]||list[0].district_id,...summarize(list)};
}).sort((a,b)=>a.district_id-b.district_id||String(a.name||"").localeCompare(String(b.name||"")));
const wards=[...wardGroups.entries()].map(([key,list])=>{
  const [palika,ward]=key.split(":").map(Number),meta=admin.palikas?.[String(palika)]||[];
  return {palika_id:palika,palika_slug:meta[0]||null,palika_name:meta[1]||null,ward,...summarize(list)};
}).sort((a,b)=>a.palika_id-b.palika_id||a.ward-b.ward);

let rebuild=null;
if(rebuildPath){
  rebuild=JSON.parse(await readFile(resolve(rebuildPath),"utf8"));
}
const report={
  schema_version:1,
  generated_at:new Date().toISOString(),
  dataset_snapshot:admin.osm_snapshot||null,
  methodology:{
    name:"AafnaiPatro Nepal map metadata-quality score v1",
    minimum_sample:minimumSample,
    weights,
    components:{
      stable_place_id:"Share of indexed places with a persistent internal place_id.",
      bilingual_name:"Share with both English/Latin and Nepali name fields populated.",
      reliable_admin_assignment:"Share whose boundary-confidence engine reports high or medium assignment confidence.",
      source_identity:"Share retaining a typed OSM source identity.",
    },
    exclusions:[
      "Does not estimate how many real-world places/roads are missing.",
      "Does not measure positional truth, field-survey accuracy, road passability, current hazards or religious/cultural correctness.",
      "Does not score data density because population/area-normalized completeness needs an independent reference dataset.",
    ],
    interpretation:"Use component metrics and anomaly review together. A high score means the records present are well-identified/attributed; it does not mean the area is comprehensively mapped.",
  },
  national:summarize(rows),
  palikas,
  wards,
  change_review:rebuild?{
    stable_id_continuity:rebuild.stable_id_continuity,
    anomaly_counts:rebuild.anomaly_counts,
    review_summary:rebuild.review_summary,
  }:null,
};
await writeFile(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({output:out,places:rows.length,palikas:palikas.length,wards:wards.length,national:report.national,review_summary:report.change_review?.review_summary||null},null,2));
