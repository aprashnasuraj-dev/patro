#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const root=process.cwd();
const src=resolve(root,process.env.NEPALMAP_DATA_DIR||"public/data/nepalmap/v1");
const out=resolve(root,process.env.NEPALMAP_OFFLINE_DIR||"public/nepalmap/offline");
const cats=["worship","peak","lake","sight","waterfall","park","airport","village","school","health","bank","stay","services"];
const admin=JSON.parse(await readFile(join(src,"admin.json"),"utf8"));
const manifest=JSON.parse(await readFile(join(src,"manifest.json"),"utf8"));
await mkdir(out,{recursive:true});

const layers={};
for(const cat of cats){
  const d=JSON.parse(await readFile(join(src,cat+".json"),"utf8"));
  const did=d.fields.indexOf("district_id");
  layers[cat]={fields:d.fields,rows:d.rows,did};
}
const index=[];
for(const district of admin.districts){
  const categories={};
  let places=0;
  for(const cat of cats){
    const L=layers[cat];
    const rows=L.rows.filter((r)=>r[L.did]===district.id);
    categories[cat]={fields:L.fields,rows};
    places+=rows.length;
  }
  const payload={
    version:1,
    district:{id:district.id,slug:district.slug,name:district.name,ne:district.ne,province:district.province},
    generated:manifest.build_date,
    snapshot_date:manifest.snapshot_date,
    source:manifest.source,
    attribution:"© OpenStreetMap contributors, ODbL 1.0",
    basemap_included:false,
    categories,
  };
  const text=JSON.stringify(payload);
  const file=district.slug+".json";
  const revision=createHash("sha256").update(text).digest("hex").slice(0,16);
  await writeFile(join(out,file),text);
  index.push({slug:district.slug,name:district.name,ne:district.ne,places,bytes:Buffer.byteLength(text),revision,url:"/nepalmap/offline/"+file+"?v="+revision});
}
await writeFile(join(out,"index.json"),JSON.stringify({version:1,generated:manifest.build_date,basemap_included:false,districts:index},null,2)+"\n");
console.log("offline district packs:",index.length,"total bytes",index.reduce((s,x)=>s+x.bytes,0));
