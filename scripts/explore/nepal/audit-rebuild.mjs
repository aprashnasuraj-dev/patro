#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { detectPlaceAnomalies } from "./place-anomalies.mjs";

const args=process.argv.slice(2);
const opt=(name,required=true)=>{
  const i=args.indexOf(name);
  const v=i>=0?args[i+1]:null;
  if(required&&!v) throw new Error(`missing ${name}`);
  return v;
};
const previous=resolve(opt("--previous"));
const current=resolve(opt("--current"));
const output=resolve(opt("--out"));

async function compactRows(dir,file,categoryFallback){
  const data=JSON.parse(await readFile(join(dir,file),"utf8"));
  const idx=Object.fromEntries(data.fields.map((f,i)=>[f,i]));
  return data.rows.map((r)=>({
    source_id:r[idx.osm_id],
    name:r[idx.name]||"",
    name_ne:r[idx.name_ne]||"",
    lat:Number(r[idx.lat]),
    lng:Number(r[idx.lng]),
    category:idx.category==null?categoryFallback:(r[idx.category]||categoryFallback),
  })).filter((r)=>r.source_id&&Number.isFinite(r.lat)&&Number.isFinite(r.lng));
}
async function mapping(dir){
  try{return JSON.parse(await readFile(join(dir,"place-id-map.json"),"utf8"));}
  catch{return {version:1,entries:{}};}
}

const [prevPois,prevSett,nextPois,nextSett,prevMap,nextMap]=await Promise.all([
  compactRows(previous,"osm-pois.json","poi"),
  compactRows(previous,"osm-settlements.json","settlement"),
  compactRows(current,"osm-pois.json","poi"),
  compactRows(current,"osm-settlements.json","settlement"),
  mapping(previous),mapping(current),
]);
const prevRows=[...prevPois,...prevSett], nextRows=[...nextPois,...nextSett];
const anomalies=detectPlaceAnomalies(prevRows,nextRows,{moveKm:5,bulkThreshold:100});
const activeNext=new Set(nextRows.map((r)=>String(r.source_id)));
const continuity=[];
let changed=0,missing=0,retained=0,newIds=0;
for(const sourceId of activeNext){
  const before=prevMap.entries?.[sourceId];
  const after=nextMap.entries?.[sourceId];
  if(!after){
    missing++;
    continuity.push({code:"missing_place_id",source_id:sourceId});
  }else if(before&&before.place_id!==after.place_id){
    changed++;
    continuity.push({code:"place_id_changed",source_id:sourceId,before:before.place_id,after:after.place_id});
  }else if(before){
    retained++;
  }else{
    newIds++;
  }
}
const counts={};
for(const a of anomalies) counts[a.code]=(counts[a.code]||0)+1;
const report={
  schema_version:1,
  compared_at:new Date().toISOString(),
  previous:{places:prevRows.length,mapping_entries:Object.keys(prevMap.entries||{}).length},
  current:{places:nextRows.length,mapping_entries:Object.keys(nextMap.entries||{}).length},
  stable_id_continuity:{retained,new_source_ids:newIds,changed,missing,ok:changed===0&&missing===0},
  anomaly_counts:counts,
  anomalies,
  continuity_errors:continuity,
  policy:{
    moved_threshold_km:5,
    bulk_add_remove_threshold:100,
    note:"Disappeared OSM objects are retained in the persistent place-ID map; disappearance is an anomaly for review, not an instruction to reuse an ID."
  }
};
await writeFile(output,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({output,stable_id_continuity:report.stable_id_continuity,anomaly_counts:counts},null,2));
if(!report.stable_id_continuity.ok) process.exitCode=2;
