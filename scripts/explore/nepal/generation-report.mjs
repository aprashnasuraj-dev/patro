#!/usr/bin/env node
import { readFile, stat, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const args=process.argv.slice(2);
const get=(n)=>{const i=args.indexOf(n);if(i<0||!args[i+1])throw new Error("missing "+n);return resolve(args[i+1]);};
const root=get("--root"), stage=get("--stage"), timings=get("--timings"), out=get("--out"), rebuild=get("--rebuild");
const sourceLock=get("--source-lock"), quality=get("--quality");

async function json(p){return JSON.parse(await readFile(p,"utf8"));}
async function walk(dir,base=dir,result=[]){
  if(!existsSync(dir)) return result;
  for(const ent of await readdir(dir,{withFileTypes:true})){
    const p=join(dir,ent.name);
    if(ent.isDirectory()) await walk(p,base,result);
    else { const s=await stat(p); result.push({path:relative(base,p).replaceAll("\\","/"),bytes:s.size}); }
  }
  return result;
}
const timingRows=(await readFile(timings,"utf8")).trim().split(/\n/).filter(Boolean).map((line)=>{
  const [step,seconds]=line.split("\t");return {step,seconds:Number(seconds)};
});
const rawFiles=await walk(join(root,"data/explore/nepal"),join(root,"data/explore/nepal"));
const stageFiles=await walk(stage,stage);
const groups={
  raw_input_bytes:rawFiles.reduce((s,x)=>s+x.bytes,0),
  compact_api_bytes:stageFiles.filter(x=>x.path.startsWith("data/nepalmap/v1/")).reduce((s,x)=>s+x.bytes,0),
  pmtiles_bytes:stageFiles.filter(x=>x.path.endsWith(".pmtiles")).reduce((s,x)=>s+x.bytes,0),
  offline_pack_bytes:stageFiles.filter(x=>x.path.startsWith("nepalmap/offline/")).reduce((s,x)=>s+x.bytes,0),
  terrain_bytes:stageFiles.filter(x=>x.path.startsWith("data/nepalmap/dem/")).reduce((s,x)=>s+x.bytes,0),
  vendor_runtime_bytes:stageFiles.filter(x=>x.path.startsWith("vendor/nepalmap/")).reduce((s,x)=>s+x.bytes,0),
};
const osmReportPath=join(root,"data/explore/nepal/osm-report.json");
const boundaryPath=join(stage,"data/nepalmap/v1/boundary-confidence.json");
const manifestPath=join(stage,"data/nepalmap/v1/manifest.json");
const offlineIndex=join(stage,"nepalmap/offline/index.json");
const pmManifest=join(stage,"data/nepalmap/v2/manifest.json");
const result={
  schema_version:1,
  generated_at:new Date().toISOString(),
  execution_status:"completed",
  source_lock:await json(sourceLock),
  generation_timings:timingRows,
  total_generation_seconds:timingRows.reduce((s,x)=>s+x.seconds,0),
  sizes:groups,
  selected_files:[...rawFiles.filter(x=>/osm-(admin|pois|settlements|report|roads)/.test(x.path)),...stageFiles.filter(x=>/(manifest\.json$|\.pmtiles$|offline\/index\.json$|dem\/tilejson\.json$)/.test(x.path))],
  osm_ingest:existsSync(osmReportPath)?await json(osmReportPath):null,
  rebuild_audit:await json(rebuild),
  map_quality:await json(quality),
  boundary_confidence:existsSync(boundaryPath)?await json(boundaryPath):null,
  compact_manifest:existsSync(manifestPath)?await json(manifestPath):null,
  offline_index:existsSync(offlineIndex)?await json(offlineIndex):null,
  pmtiles_manifest:existsSync(pmManifest)?await json(pmManifest):null,
  note:"This file is generated only by an actual data build. Presence of this script in Git is not verification evidence."
};
await writeFile(out,JSON.stringify(result,null,2)+"\n");
console.log("wrote",out);
