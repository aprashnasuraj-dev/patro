import { readFileSync } from "node:fs";
const file=process.argv[2];
if(!file){console.error("usage: node scripts/reports/slo.mjs <workers-logs.ndjson>");process.exit(2);}
const raw=readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean);
const events=[];
for(const line of raw){try{const v=JSON.parse(line);const x=v.message&&typeof v.message==="object"?v.message:v;events.push(x);}catch{}}
const http=events.filter(x=>x.event==="roadmap_http");
const deps=events.filter(x=>x.event==="roadmap_dependency");
const pct=(a,b)=>b?a/b:null;
const percentile=(values,p)=>{
  if(!values.length)return null;
  const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;
  const i=Math.min(a.length-1,Math.max(0,Math.ceil(p*a.length)-1));return a[i];
};
const byPath={};
for(const e of http){
  const k=e.path_group||"unknown";const b=byPath[k]||(byPath[k]={requests:0,server_errors:0,durations:[]});
  b.requests++;if(Number(e.status)>=500)b.server_errors++;if(Number.isFinite(Number(e.duration_ms)))b.durations.push(Number(e.duration_ms));
}
for(const b of Object.values(byPath)){b.availability=1-pct(b.server_errors,b.requests);b.p95_ms=percentile(b.durations,.95);delete b.durations;}
const depOut={};
for(const e of deps){const k=(e.dependency||"unknown")+":"+(e.operation||"unknown");const b=depOut[k]||(depOut[k]={total:0,outcomes:{},durations:[]});b.total++;b.outcomes[e.outcome]=(b.outcomes[e.outcome]||0)+1;if(Number.isFinite(Number(e.duration_ms)))b.durations.push(Number(e.duration_ms));}
for(const b of Object.values(depOut)){b.p95_ms=percentile(b.durations,.95);delete b.durations;}
const serverErrors=http.filter(e=>Number(e.status)>=500).length;
const durations=http.map(e=>Number(e.duration_ms)).filter(Number.isFinite);
const availability=http.length?1-serverErrors/http.length:null;
const out={
  status:http.length?"MEASURED":"INSUFFICIENT_DATA",
  http:{requests:http.length,server_errors:serverErrors,availability,p50_ms:percentile(durations,.5),p95_ms:percentile(durations,.95),p99_ms:percentile(durations,.99),meets_99_9:availability==null?null:availability>=.999,by_path:byPath},
  dependencies:depOut
};
console.log(JSON.stringify(out,null,2));
if(!http.length)process.exitCode=3;
