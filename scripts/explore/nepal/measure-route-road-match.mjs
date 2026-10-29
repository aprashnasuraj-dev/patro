#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
const args=process.argv.slice(2);
const opt=(n,d)=>{const i=args.indexOf(n);return i>=0&&args[i+1]?args[i+1]:d;};
const roads=resolve(opt("--roads","data/explore/nepal/osm-roads.geojsonseq"));
const fixtures=JSON.parse(await readFile(resolve(opt("--fixtures","infra/nepal-routing/fixtures/routes.json")),"utf8")).fixtures;
const out=resolve(opt("--out","docs/verification/nepal-route-road-match.json"));
await import("./map/road-safety.js");
const safety=globalThis.AafnaiRoadSafety;if(!safety)throw new Error("road-safety module unavailable");
const selected=fixtures.filter(x=>x.kind==="route").slice(0,6),routes=[];
for(const f of selected){
  const profile=f.costing==="pedestrian"?"routed-foot":"routed-car";
  const coords=f.points.map(p=>Number(p.lon).toFixed(6)+","+Number(p.lat).toFixed(6)).join(";");
  const url="https://routing.openstreetmap.de/"+profile+"/route/v1/driving/"+coords+"?overview=full&geometries=geojson&steps=true&alternatives=false";
  const started=performance.now();
  try{
    const r=await fetch(url,{headers:{"user-agent":"AafnaiPatro-roadmap-QA/1.0"}}),data=await r.json().catch(()=>null);
    if(!r.ok||!data?.routes?.[0]?.geometry)throw new Error("HTTP "+r.status+" "+(data?.code||""));
    const route=data.routes[0],cs=route.geometry.coordinates,xs=cs.map(p=>p[0]),ys=cs.map(p=>p[1]);
    routes.push({fixture:f,route,latency_ms:Number((performance.now()-started).toFixed(1)),bbox:[Math.min(...xs)-0.02,Math.min(...ys)-0.02,Math.max(...xs)+0.02,Math.max(...ys)+0.02],features:[]});
  }catch(e){routes.push({fixture:f,error:String(e),latency_ms:Number((performance.now()-started).toFixed(1)),features:[]});}
  await new Promise(r=>setTimeout(r,1200));
}
const active=routes.filter(x=>x.route);
for await(const line of createInterface({input:createReadStream(roads,{encoding:"utf8"}),crlfDelay:Infinity})){
  if(!line.trim())continue;const f=JSON.parse(line),c=f.geometry?.coordinates||[];if(!c.length)continue;
  let minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;for(const p of c){if(p[0]<minx)minx=p[0];if(p[0]>maxx)maxx=p[0];if(p[1]<miny)miny=p[1];if(p[1]>maxy)maxy=p[1];}
  for(const r of active){const b=r.bbox;if(maxx>=b[0]&&minx<=b[2]&&maxy>=b[1]&&miny<=b[3])r.features.push(f);}
}
let eligible=0,matched=0;
const results=routes.map(r=>{if(!r.route)return {name:r.fixture.name,region:r.fixture.region,ok:false,error:r.error,latency_ms:r.latency_ms};const s=safety.summarizeForRoute(r.features,r.route),m=s.route_step_match||{eligible_steps:0,matched_steps:0,rate:0};eligible+=m.eligible_steps;matched+=m.matched_steps;return {name:r.fixture.name,region:r.fixture.region,ok:true,latency_ms:r.latency_ms,distance_m:r.route.distance,duration_s:r.route.duration,candidate_road_features:r.features.length,match_mode:s.match_mode,route_step_match:m,metadata_coverage:s.coverage,warnings:s.warnings};});
const success=results.filter(x=>x.ok).length;
const report={schema_version:1,generated_at:new Date().toISOString(),provider:"FOSSGIS public OSRM fallback evidence",policy:"https://routing.openstreetmap.de/about.html",fresh_osm_roads:roads,fixtures:results,overall:{successful_routes:success,total_routes:results.length,eligible_steps:eligible,matched_steps:matched,weighted_match_rate:eligible?matched/eligible:0},note:"This measures the name/ref + 500 m spatial matcher against actual fallback-provider route steps. It is not first-party Valhalla production evidence."};
await writeFile(out,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({out,overall:report.overall},null,2));if(success<3)process.exitCode=2;
