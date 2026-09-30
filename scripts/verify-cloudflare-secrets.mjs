import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root=process.cwd();
const manifest=JSON.parse(await readFile(resolve(root,"cloudflare/secrets-manifest.json"),"utf8"));
const config=process.env.CF_WRANGLER_CONFIG || (process.env.CF_D1_DATABASE_ID ? "wrangler.generated.jsonc" : "wrangler.jsonc");
const required=[...manifest.exact_case_sensitive_names,...manifest.cloudflare_native_additional];

const result=spawnSync(process.platform==="win32"?"npx.cmd":"npx",["wrangler","secret","list","--format","json","--config",config],{
  encoding:"utf8",
  shell:false
});
if(result.status!==0){
  process.stderr.write(result.stderr||result.stdout||"wrangler secret list failed\n");
  process.exit(result.status??1);
}
let rows=[];
try{rows=JSON.parse(result.stdout||"[]");}
catch{throw new Error("Could not parse wrangler secret list JSON output");}
const names=new Set(rows.map((x)=>String(x.name||"")));
const missing=required.filter((name)=>!names.has(name));
const exactMissing=manifest.exact_case_sensitive_names.filter((name)=>!names.has(name));
console.log(JSON.stringify({
  config,
  expected_exact_names:manifest.exact_case_sensitive_names,
  cloudflare_native_additional:manifest.cloudflare_native_additional,
  configured:[...names].sort(),
  missing
},null,2));
if(exactMissing.length){
  console.error("Missing exact migrated secret names: "+exactMissing.join(", "));
  process.exit(2);
}
if(missing.length){
  console.error("Cloudflare-native features still need secrets: "+missing.join(", "));
  process.exit(3);
}
