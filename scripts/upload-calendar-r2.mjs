import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const bucket=process.env.CF_R2_BUCKET_NAME?.trim();
if(!bucket){console.log("CF_R2_BUCKET_NAME not set; R2 JSON upload skipped.");process.exit(0)}
const root=process.cwd(),indexPath=resolve(root,"dist/data/calendar/offline/index.json");
const index=JSON.parse(await readFile(indexPath,"utf8"));
const files=[{file:indexPath,key:"calendar/offline/index.json"},...(index.months||[]).map((m)=>({file:resolve(root,"dist",String(m.path).replace(/^\//,"")),key:String(m.path).replace(/^\/data\//,"")}))];
for(const item of files){const r=spawnSync("npx",["wrangler","r2","object","put",`${bucket}/${item.key}`,"--remote","--file",item.file],{stdio:"inherit",shell:process.platform==="win32"});if(r.status!==0)process.exit(r.status??1)}
console.log(`Uploaded ${files.length} calendar JSON objects to R2 bucket ${bucket}.`);
