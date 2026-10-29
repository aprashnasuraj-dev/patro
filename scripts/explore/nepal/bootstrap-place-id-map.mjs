#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { emptyPlaceIdMap, reconcilePlaceIds, validatePlaceIdMap } from "./place-id-core.mjs";

const args=process.argv.slice(2);
const opt=(name,def=null)=>{const i=args.indexOf(name);return i>=0&&args[i+1]?args[i+1]:def;};
const dir=resolve(opt("--data","data/explore/nepal"));
const out=resolve(opt("--out",join(dir,"place-id-map.json")));

async function sourceIds(file){
  const doc=JSON.parse(await readFile(join(dir,file),"utf8"));
  const i=doc.fields.indexOf("osm_id");
  if(i<0) throw new Error(file+" has no osm_id field");
  return doc.rows.map(r=>r[i]).filter(Boolean);
}
let baselineDate=opt("--date");
if(!baselineDate){
  try{
    const report=JSON.parse(await readFile(join(dir,"osm-report.json"),"utf8"));
    baselineDate=String(report.generated||report.osm_timestamp||"").slice(0,10);
  }catch{}
}
if(!/^\d{4}-\d{2}-\d{2}$/.test(String(baselineDate||""))) baselineDate="1970-01-01";
const ids=[...(await sourceIds("osm-pois.json")),...(await sourceIds("osm-settlements.json"))];
const map=reconcilePlaceIds(emptyPlaceIdMap(),ids,{now:new Date(baselineDate+"T00:00:00Z")});
const errors=validatePlaceIdMap(map);
if(errors.length) throw new Error(errors.join("\n"));
await writeFile(out,JSON.stringify(map,null,2)+"\n");
console.log(JSON.stringify({out,baseline_date:baselineDate,source_ids:ids.length,mapping_entries:Object.keys(map.entries).length},null,2));
