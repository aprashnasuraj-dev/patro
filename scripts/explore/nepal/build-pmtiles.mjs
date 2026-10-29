#!/usr/bin/env node
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const src = resolve(root, process.env.NEPALMAP_DATA_DIR || "public/data/nepalmap/v1");
const out = resolve(root, process.env.NEPALMAP_PMTILES_DIR || "public/data/nepalmap/v2");
const categories = ["worship","peak","lake","sight","waterfall","park","airport","village","school","health","bank","stay","services"];

function command(bin,args,opts={}) {
  const r=spawnSync(bin,args,{encoding:"utf8",stdio:opts.capture?"pipe":"inherit"});
  if(r.error) throw r.error;
  if(r.status!==0) throw new Error(`${bin} failed with ${r.status}: ${r.stderr||""}`);
  return r.stdout||"";
}
const version = command("tippecanoe",["--version"],{capture:true});
const m = version.match(/(\d+)\.(\d+)/);
if(!m || Number(m[1])<2 || (Number(m[1])===2 && Number(m[2])<17)) {
  throw new Error("tippecanoe >=2.17 is required for direct PMTiles output; got: "+version.trim());
}
await mkdir(out,{recursive:true});
const temp=await mkdtemp(join(tmpdir(),"aafnaipatro-pmtiles-"));
try {
  const ndjson=join(temp,"places.ndjson");
  const lines=[];
  for(const cat of categories){
    const path=join(src,cat+".json");
    if(!existsSync(path)) continue;
    const data=JSON.parse(await readFile(path,"utf8"));
    const idx=Object.fromEntries(data.fields.map((f,i)=>[f,i]));
    for(let i=0;i<data.rows.length;i++){
      const r=data.rows[i];
      const props={
        cat,i,
        name:r[idx.name]||"",name_ne:r[idx.name_ne]||"",sub:r[idx.sub]||"",
        ele:r[idx.ele]||0,palika_id:r[idx.palika_id]||0,ward:r[idx.ward]||0,district_id:r[idx.district_id]||0,
        source_id:r[idx.source_id]||"",place_id:idx.place_id==null?"":(r[idx.place_id]||""),
        admin_confidence:idx.admin_confidence==null?"":(r[idx.admin_confidence]||""),
      };
      lines.push(JSON.stringify({type:"Feature",id:props.place_id||props.source_id||`${cat}:${i}`,properties:props,geometry:{type:"Point",coordinates:[r[idx.lng],r[idx.lat]]}}));
    }
  }
  await writeFile(ndjson,lines.join("\n")+"\n");
  const placesOut=join(out,"places.pmtiles");
  command("tippecanoe",["-f","-o",placesOut,"-l","places","-Z","4","-z","15","--drop-densest-as-needed","--extend-zooms-if-still-dropping","--read-parallel",ndjson]);

  const roads=process.env.NEPALMAP_ROADS_NDJSON ? resolve(root,process.env.NEPALMAP_ROADS_NDJSON) : null;
  if(roads && existsSync(roads)){
    command("tippecanoe",["-f","-o",join(out,"roads.pmtiles"),"-l","roads","-Z","6","-z","15","--drop-densest-as-needed","--extend-zooms-if-still-dropping","--read-parallel",roads]);
  }

  const manifest={
    generated_at:new Date().toISOString(),
    tippecanoe_version:version.trim(),
    source:"/data/nepalmap/v1 compact JSON",
    attribution:"© OpenStreetMap contributors, ODbL 1.0",
    archives:{
      places:"/data/nepalmap/v2/places.pmtiles",
      roads:roads&&existsSync(roads)?"/data/nepalmap/v2/roads.pmtiles":null,
    },
  };
  await writeFile(join(out,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  console.log(JSON.stringify(manifest,null,2));
} finally {
  await rm(temp,{recursive:true,force:true});
}
