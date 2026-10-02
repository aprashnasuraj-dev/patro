import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root=process.cwd();
const manifest=JSON.parse(await readFile(resolve(root,"cloudflare/secrets-manifest.json"),"utf8"));
const config=process.env.CF_WRANGLER_CONFIG || (process.env.CF_D1_DATABASE_ID ? "wrangler.generated.jsonc" : "wrangler.jsonc");

function argValue(name,fallback){
  const direct=process.argv.find(x=>x.startsWith(name+"="));
  if(direct)return direct.slice(name.length+1);
  const index=process.argv.indexOf(name);
  return index>=0&&process.argv[index+1]?process.argv[index+1]:fallback;
}
const scopeName=String(argValue("--scope",process.env.CF_SECRET_SCOPE||"full")).toLowerCase();
const scope=manifest.scopes?.[scopeName];
if(!scope){
  console.error("Unknown secret verification scope: "+scopeName+". Use core, public, or full.");
  process.exit(1);
}

const result=spawnSync(process.platform==="win32"?"npx.cmd":"npx",["wrangler","secret","list","--format","json","--config",config],{encoding:"utf8",shell:false});
if(result.status!==0){
  process.stderr.write(result.stderr||result.stdout||"wrangler secret list failed\n");
  process.exit(result.status??1);
}
let rows=[];
try{rows=JSON.parse(result.stdout||"[]");}
catch{throw new Error("Could not parse wrangler secret list JSON output");}
const names=new Set(rows.map(x=>String(x.name||"")));
const groupResults=[];
let failed=false;
for(const groupName of scope.groups||[]){
  const group=manifest.feature_groups?.[groupName];
  if(!group)throw new Error("Secret manifest references unknown feature group: "+groupName);
  const expected=Array.isArray(group.names)?group.names:[];
  const configured=expected.filter(name=>names.has(name));
  const missing=expected.filter(name=>!names.has(name));
  const ok=group.mode==="one_of"?configured.length>0:missing.length===0;
  if(!ok)failed=true;
  groupResults.push({name:groupName,mode:group.mode,ok,configured,missing,required_for:group.required_for||[]});
}
const migratedExact=manifest.migrated_exact_names||[];
const migratedConfigured=migratedExact.filter(name=>names.has(name));
const migratedMissing=migratedExact.filter(name=>!names.has(name));
console.log(JSON.stringify({
  ok:!failed,
  scope:scopeName,
  scope_description:scope.description,
  config,
  configured:[...names].sort(),
  feature_groups:groupResults,
  migrated_exact_names:{configured:migratedConfigured,missing:migratedMissing},
  optional:Object.keys(manifest.optional||{}),
  note:scopeName==="core"?"Core product has no runtime secret requirement; D1/assets/vars are validated separately.":undefined
},null,2));
if(failed){
  for(const group of groupResults.filter(x=>!x.ok)){
    const requirement=group.mode==="one_of"?"at least one of":"all of";
    console.error(`Missing ${group.name}: requires ${requirement} [${group.missing.join(", ")}]`);
  }
  process.exit(2);
}
