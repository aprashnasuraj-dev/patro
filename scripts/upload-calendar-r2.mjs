import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const bucket=process.env.CF_R2_BUCKET_NAME?.trim();
if(!bucket){console.log("CF_R2_BUCKET_NAME not set; R2 JSON upload skipped.");process.exit(0)}
const root=process.cwd();
const indexPath=resolve(root,"dist/data/calendar/offline-24-months/index.json");
const index=JSON.parse(await readFile(indexPath,"utf8"));
if(Number(index?.past_months)!==12||Number(index?.future_months)!==12||!Array.isArray(index?.months)||index.months.length!==25){
  throw new Error("24-month calendar index is incomplete; refusing to publish R2 fallback.");
}
const files=[
  {file:indexPath,key:"calendar/offline-24-months/index.json"},
  ...index.months.map((m)=>({file:resolve(root,"dist",String(m.path).replace(/^\//,"")),key:String(m.path).replace(/^\/data\//,"")}))
];
for(const item of files){
  const r=spawnSync("npx",["wrangler","r2","object","put",`${bucket}/${item.key}`,"--remote","--file",item.file],{stdio:"inherit",shell:process.platform==="win32"});
  if(r.status!==0)process.exit(r.status??1);
}
console.log(`Uploaded ${files.length} static calendar objects to R2 bucket ${bucket}.`);
