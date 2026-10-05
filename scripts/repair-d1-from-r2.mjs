import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const config=process.argv[2]||"wrangler.generated.jsonc";
const bucket=process.env.CF_R2_BUCKET_NAME?.trim();
if(!bucket){console.error("CF_R2_BUCKET_NAME is required for R2 SQL repair.");process.exit(2)}
const explicit=process.env.CF_R2_SQL_KEY?.trim();
const candidates=[explicit,"backups/d1/patro-full.sql","patro-full.sql","backup.sql","database.sql"].filter((v,i,a)=>v&&a.indexOf(v)===i);
const work=mkdtempSync(join(tmpdir(),"patro-r2-d1-")),sql=join(work,"patro-full.sql");
function run(args,stdio="inherit"){return spawnSync("npx",["wrangler",...args],{stdio,shell:process.platform==="win32"})}
let selected="";
for(const key of candidates){console.log(`Trying R2 SQL backup: ${bucket}/${key}`);const r=run(["r2","object","get",`${bucket}/${key}`,"--remote","--file",sql]);if(r.status===0){try{if(statSync(sql).size>0){selected=key;break}}catch{}}}
if(!selected){console.error(`No usable SQL backup found in R2 bucket ${bucket}. Set CF_R2_SQL_KEY to the uploaded object key.`);process.exit(3)}
console.log(`Restoring D1 from R2 object ${bucket}/${selected} ...`);
const restore=run(["d1","execute","DB","--remote","--config",config,"--file",sql,"--yes"]);
if(restore.status!==0){console.error("R2 SQL downloaded but D1 restore failed.");process.exit(restore.status??4)}
console.log("R2 SQL restore completed; remote verification must run next.");
