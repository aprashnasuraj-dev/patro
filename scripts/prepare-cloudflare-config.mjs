import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root=process.cwd();
const basePath=resolve(root,"wrangler.jsonc");
const outputPath=resolve(root,"wrangler.generated.jsonc");
const base=JSON.parse(await readFile(basePath,"utf8"));

const configuredD1=Array.isArray(base.d1_databases)?base.d1_databases.find((row)=>row?.binding==="DB"):null;
const configuredKv=Array.isArray(base.kv_namespaces)?base.kv_namespaces.find((row)=>row?.binding==="CACHE"):null;
const configuredR2=Array.isArray(base.r2_buckets)?base.r2_buckets.find((row)=>row?.binding==="ARCHIVE"):null;

const d1Id=process.env.CF_D1_DATABASE_ID?.trim()||configuredD1?.database_id;
const d1Name=process.env.CF_D1_DATABASE_NAME?.trim()||configuredD1?.database_name||"patro";
const d1PreviewId=process.env.CF_D1_PREVIEW_DATABASE_ID?.trim();
let kvId=process.env.CF_KV_NAMESPACE_ID?.trim()||configuredKv?.id||"";
const kvPreviewId=process.env.CF_KV_PREVIEW_NAMESPACE_ID?.trim()||configuredKv?.preview_id;
let r2Bucket=process.env.CF_R2_BUCKET_NAME?.trim()||process.env.R2_BUCKET_NAME?.trim()||configuredR2?.bucket_name||"";
const r2PreviewBucket=process.env.CF_R2_PREVIEW_BUCKET_NAME?.trim()||configuredR2?.preview_bucket_name;
const requireQuotaCache=/^(?:1|true|yes)$/i.test(process.env.REQUIRE_QUOTA_CACHE?.trim()||"");

if(!d1Id)throw new Error("Cloudflare D1 DB binding is missing. Configure DB in wrangler.jsonc or set CF_D1_DATABASE_ID.");

const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token=process.env.CLOUDFLARE_API_TOKEN?.trim();
async function cf(path,init={}){
  if(!account||!token)throw new Error("Cloudflare credentials unavailable");
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`,{
    ...init,
    headers:{authorization:`Bearer ${token}`,"content-type":"application/json",...(init.headers||{})}
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok||body?.success===false)throw new Error(`Cloudflare ${path} HTTP ${response.status}`);
  return body?.result;
}

// Production deploys already have an account-scoped API token. If cache IDs were not copied
// into GitHub variables, discover safe resources. KV may be provisioned once under a
// deterministic cache-only name; R2 is never created/deleted here because the bucket can
// also contain user backups or other durable archives.
if(account&&token){
  if(!kvId){
    try{
      const rows=await cf("/storage/kv/namespaces?per_page=100");
      const namespaces=Array.isArray(rows)?rows:[];
      const found=namespaces.find((row)=>["patro-runtime-cache","patro-cache","aafnai-patro-cache","aafnaipatro-cache"].includes(String(row?.title||"").toLowerCase()));
      if(found?.id)kvId=String(found.id);
      else if(process.env.CF_CACHE_AUTO_PROVISION!=="0"){
        const created=await cf("/storage/kv/namespaces",{method:"POST",body:JSON.stringify({title:"patro-runtime-cache"})});
        if(created?.id)kvId=String(created.id);
      }
    }catch(error){
      console.warn(`KV cache discovery/provision skipped: ${String(error?.message||error)}`);
    }
  }

  if(!r2Bucket){
    try{
      const result=await cf("/r2/buckets");
      const buckets=Array.isArray(result?.buckets)?result.buckets:Array.isArray(result)?result:[];
      const names=buckets.map((row)=>String(row?.name||"")).filter(Boolean);
      if(names.includes("patro"))r2Bucket="patro";
      else{
        const preferred=names.filter((name)=>/(?:^|[-_])(patro|aafnai|aafnaipatro|miti)(?:$|[-_])|^(?:patro|aafnai-patro|aafnaipatro|miti)/i.test(name));
        if(preferred.length===1)r2Bucket=preferred[0];
        else if(names.length===1)r2Bucket=names[0];
        else if(names.length>1)console.warn("Multiple R2 buckets found; set CF_R2_BUCKET_NAME to select the Patro archive bucket safely.");
      }
    }catch(error){
      console.warn(`R2 cache discovery skipped: ${String(error?.message||error)}`);
    }
  }
}

if(requireQuotaCache&&!kvId){
  throw new Error("REQUIRE_QUOTA_CACHE=1 but CACHE KV namespace could not be resolved or provisioned.");
}
if(requireQuotaCache&&!r2Bucket){
  throw new Error("REQUIRE_QUOTA_CACHE=1 but ARCHIVE R2 bucket could not be resolved.");
}

base.name="patro";
base.main="worker/optimized-entry.ts";
base.preview_urls=false;
base.assets={...(base.assets||{}),directory:"./dist",binding:"ASSETS",not_found_handling:"none",run_worker_first:[...new Set([...(base.assets?.run_worker_first||["/*","!/assets/*"]),"!/moon","!/moon/*","!/eclipse","!/eclipse/*","!/nepal","!/nepal/*","!/us/*","!/weather","!/weather/*","!/de/*","!/fr/*","!/es/*","!/it/*","!/sitemap-growth.xml","!/aap/runtime.js","!/aap/analytics.js", "!/data/*"])]};
base.d1_databases=[{binding:"DB",database_name:d1Name,database_id:d1Id,migrations_dir:"cloudflare/d1/schema-migrations",...(d1PreviewId?{preview_database_id:d1PreviewId}:{})}];

const otherKv=Array.isArray(base.kv_namespaces)?base.kv_namespaces.filter((row)=>row?.binding!=="CACHE"):[];
if(kvId)base.kv_namespaces=[...otherKv,{binding:"CACHE",id:kvId,...(kvPreviewId?{preview_id:kvPreviewId}:{})}];
else if(otherKv.length)base.kv_namespaces=otherKv;
else delete base.kv_namespaces;

const otherR2=Array.isArray(base.r2_buckets)?base.r2_buckets.filter((row)=>row?.binding!=="ARCHIVE"):[];
if(r2Bucket)base.r2_buckets=[...otherR2,{binding:"ARCHIVE",bucket_name:r2Bucket,...(r2PreviewBucket?{preview_bucket_name:r2PreviewBucket}:{})}];
else if(otherR2.length)base.r2_buckets=otherR2;
else delete base.r2_buckets;

base.vars={
  ...(base.vars||{}),
  PUBLIC_REFERENCE_CACHE_VERSION:process.env.PUBLIC_REFERENCE_CACHE_VERSION?.trim()||base.vars?.PUBLIC_REFERENCE_CACHE_VERSION||"public-reference-v1"
};

await writeFile(outputPath,JSON.stringify(base,null,2)+"\n","utf8");
console.log(`Generated wrangler.generated.jsonc with D1=${d1Name}; KV=${kvId?"enabled":"not configured"}; R2=${r2Bucket?`enabled (${r2Bucket})`:"not configured"}.`);
