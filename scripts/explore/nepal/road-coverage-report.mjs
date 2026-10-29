#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve } from "node:path";

const args=process.argv.slice(2);
const opt=(n,d)=>{const i=args.indexOf(n);return i>=0&&args[i+1]?args[i+1]:d;};
const input=resolve(opt("--roads","data/explore/nepal/osm-roads.geojsonseq"));
const out=resolve(opt("--out","docs/verification/nepal-road-coverage.json"));
function hav(a,b){const p=Math.PI/180;const q=0.5-Math.cos((b[1]-a[1])*p)/2+Math.cos(a[1]*p)*Math.cos(b[1]*p)*(1-Math.cos((b[0]-a[0])*p))/2;return 12742*Math.asin(Math.sqrt(Math.max(0,q)));}
const fields=["name","ref","surface","smoothness","tracktype","sac_scale","access","motor_vehicle","seasonal","ford","bridge","tunnel","maxspeed"];
const byKind={},byHighway={},confidence={},warnings={},coverage=Object.fromEntries(fields.map(k=>[k,{features:0,km:0}]));
let features=0,totalKm=0;
const add=(obj,k,km)=>{obj[k]=(obj[k]||{features:0,km:0});obj[k].features++;obj[k].km+=km;};
for await(const line of createInterface({input:createReadStream(input,{encoding:"utf8"}),crlfDelay:Infinity})){
  if(!line.trim())continue;const f=JSON.parse(line),p=f.properties||{},c=f.geometry?.coordinates||[];let km=0;
  for(let i=1;i<c.length;i++)km+=hav(c[i-1],c[i]);
  features++;totalKm+=km;add(byKind,p.kind||"unknown",km);add(byHighway,p.highway||"unknown",km);add(confidence,p.metadata_confidence||"unknown",km);
  for(const k of fields)if(p[k]!=null&&String(p[k])!==""){coverage[k].features++;coverage[k].km+=km;}
  for(const w of String(p.warnings||"").split(",").filter(Boolean))add(warnings,w,km);
}
const pct=(v,t)=>t?Number((100*v/t).toFixed(2)):0;
const normalize=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,{features:v.features,feature_pct:pct(v.features,features),km:Number(v.km.toFixed(2)),km_pct:pct(v.km,totalKm)}]));
const report={schema_version:1,generated_at:new Date().toISOString(),source:input,features,total_km:Number(totalKm.toFixed(2)),by_kind:normalize(byKind),by_highway:normalize(byHighway),metadata_confidence:normalize(confidence),tag_coverage:Object.fromEntries(Object.entries(coverage).map(([k,v])=>[k,{features:v.features,feature_pct:pct(v.features,features),km:Number(v.km.toFixed(2)),km_pct:pct(v.km,totalKm)}])),warnings:normalize(warnings),interpretation:"Coverage reports the OSM ways present in this extract. Missing tags mean unknown metadata, not that a condition is absent; kilometres are approximate geodesic polyline lengths."};
await writeFile(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({out,features,total_km:report.total_km,metadata_confidence:report.metadata_confidence,tag_coverage:report.tag_coverage},null,2));
if(!features)process.exitCode=2;
