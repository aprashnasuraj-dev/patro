import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { ensureRemoteD1Content } from "./ensure-d1-content.mjs";
function run(command,args){const result=spawnSync(command,args,{stdio:"inherit",shell:process.platform==="win32"});if(result.status!==0)process.exit(result.status??1);}
run("npm",["run","build"]); run("node",["scripts/generate-d1-migrations.mjs"]); rmSync("dist/_redirects",{force:true});
const hasOverrides=Boolean(process.env.CF_D1_DATABASE_ID?.trim()||process.env.CF_D1_DATABASE_NAME?.trim()||process.env.CF_D1_PREVIEW_DATABASE_ID?.trim()||process.env.CF_KV_NAMESPACE_ID?.trim()||process.env.CF_KV_PREVIEW_NAMESPACE_ID?.trim());
const config=hasOverrides?"wrangler.generated.jsonc":"wrangler.jsonc"; if(hasOverrides)run("node",["scripts/prepare-cloudflare-config.mjs"]);
run("npx",["wrangler","d1","migrations","apply","DB","--remote","--config",config]);
try{ensureRemoteD1Content({config});}catch(error){console.error(error instanceof Error?error.message:String(error));process.exit(1);}
run("node",["scripts/verify-d1-remote.mjs",config]); run("npx",["wrangler","deploy","--config",config]); if(process.env.SKIP_INDEXNOW!=="1")run("node",["scripts/indexnow.mjs"]);
