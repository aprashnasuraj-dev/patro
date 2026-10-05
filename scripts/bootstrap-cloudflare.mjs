import { spawnSync } from "node:child_process";
import { ensureRemoteD1Content } from "./ensure-d1-content.mjs";
function exec(command,args){return spawnSync(command,args,{stdio:"inherit",shell:process.platform==="win32"})}
function run(command,args){const result=exec(command,args);if(result.status!==0)process.exit(result.status??1)}

run("npm",["run","build"]);
run("node",["scripts/generate-d1-migrations.mjs"]);
const hasOverrides=Boolean(process.env.CF_D1_DATABASE_ID?.trim()||process.env.CF_D1_DATABASE_NAME?.trim()||process.env.CF_D1_PREVIEW_DATABASE_ID?.trim()||process.env.CF_KV_NAMESPACE_ID?.trim()||process.env.CF_KV_PREVIEW_NAMESPACE_ID?.trim()||process.env.CF_R2_BUCKET_NAME?.trim()||process.env.CF_R2_PREVIEW_BUCKET_NAME?.trim());
const config=hasOverrides?"wrangler.generated.jsonc":"wrangler.jsonc";
if(hasOverrides)run("node",["scripts/prepare-cloudflare-config.mjs"]);

run("npx",["wrangler","d1","migrations","apply","DB","--remote","--config",config]);
let verified=exec("node",["scripts/verify-d1-remote.mjs",config]).status===0;
if(!verified){
  const r2Bucket=process.env.CF_R2_BUCKET_NAME?.trim();
  const r2SqlKey=process.env.CF_R2_SQL_KEY?.trim();
  if(r2Bucket&&r2SqlKey){
    console.warn(`Remote D1 verification failed; attempting restore from configured R2 SQL object ${r2Bucket}/${r2SqlKey}.`);
    const repair=exec("node",["scripts/repair-d1-from-r2.mjs",config]);
    if(repair.status===0)verified=exec("node",["scripts/verify-d1-remote.mjs",config]).status===0;
  }else{
    console.warn("Remote D1 verification failed and configured R2 SQL bucket/key are incomplete; skipping R2 SQL repair.");
  }
  if(!verified){
    console.warn("R2 SQL repair was unavailable/insufficient; falling back to deterministic repository snapshot repair.");
    try{ensureRemoteD1Content({config});}catch(error){console.error(error instanceof Error?error.message:String(error));process.exit(1)}
    verified=exec("node",["scripts/verify-d1-remote.mjs",config]).status===0;
  }
}
if(!verified){console.error("D1 remains unhealthy after all repair paths; deployment stopped.");process.exit(1)}

// Publish the same ±12-month static JSON window to R2 so runtime routing can fall back D1 -> R2.
if(process.env.CF_R2_BUCKET_NAME?.trim())run("node",["scripts/upload-calendar-r2.mjs"]);
run("npx",["wrangler","deploy","--config",config]);
