import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const config=process.argv[2]||"wrangler.generated.jsonc";
const bucket=process.env.CF_R2_BUCKET_NAME?.trim();
const key=process.env.CF_R2_SQL_KEY?.trim();
if(!bucket){console.error("CF_R2_BUCKET_NAME is required for R2 SQL repair.");process.exit(2)}
if(!key){console.error("CF_R2_SQL_KEY is required. Configure the exact R2 object key of the uploaded SQL backup; filename guessing is intentionally disabled.");process.exit(2)}

const work=mkdtempSync(join(tmpdir(),"patro-r2-d1-"));
const sql=join(work,"patro-r2-backup.sql");
function run(args,stdio="inherit"){return spawnSync("npx",["wrangler",...args],{stdio,shell:process.platform==="win32"})}

console.log(`Downloading configured R2 SQL backup ${bucket}/${key} ...`);
const download=run(["r2","object","get",`${bucket}/${key}`,"--remote","--file",sql]);
if(download.status!==0){console.error(`Unable to download configured R2 SQL object ${bucket}/${key}.`);process.exit(download.status??3)}
const size=statSync(sql).size;
if(size<256){console.error(`Configured R2 SQL object is unexpectedly small (${size} bytes); refusing D1 restore.`);process.exit(3)}
const head=readFileSync(sql,{encoding:"utf8"}).slice(0,8192).toLowerCase();
if(!/(create\s+table|insert\s+into|begin\s+transaction|pragma\s+)/.test(head)){
  console.error("Configured R2 object does not look like a SQL database export; refusing D1 restore.");process.exit(3);
}

console.log(`Restoring D1 from configured R2 object ${bucket}/${key} (${size} bytes) ...`);
const restore=run(["d1","execute","DB","--remote","--config",config,"--file",sql,"--yes"]);
if(restore.status!==0){console.error("R2 SQL downloaded successfully but D1 restore failed.");process.exit(restore.status??4)}
console.log("R2 SQL restore completed; remote D1 verification must run next.");
