#!/usr/bin/env node
// Snapshot, validate, and publish editorial-only changes to the EXISTING R2-backed library.
// No Worker deployment, no asset rewrite, and no modification of article research pages.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const mode=process.argv[2];
if(!["snapshot","publish"].includes(mode))throw new Error("Usage: node scripts/library/r2-editorial-publish.mjs snapshot|publish");
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
const zone=process.env.CLOUDFLARE_ZONE_ID;
if(!account||!token)throw new Error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN");
const bucket=process.env.AAFNAI_LIBRARY_R2_BUCKET||"aafnai-library";
const root=path.resolve(".aafnai-library-bundle/static");
const snapshotPath=path.resolve(".aafnai-library-bundle/editorial-original-sha256.json");
const base="https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(account)+"/r2/buckets/"+encodeURIComponent(bucket)+"/objects/";
const headers={Authorization:"Bearer "+token};
const sha=buffer=>createHash("sha256").update(buffer).digest("hex");
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const local=key=>path.join(root,key.replace(/^phase1\//,""));

async function api(method,key,data=null){
  const url=base+encodeURIComponent(key);
  for(let attempt=0;attempt<6;attempt++){
    const response=await fetch(url,{method,headers:{...headers,...(data?{"Content-Type":key.endsWith(".json")?"application/json":"text/html; charset=utf-8"}:{})},body:data||undefined});
    if(response.ok)return Buffer.from(await response.arrayBuffer());
    const message=(await response.text()).slice(0,400);
    if((response.status===429||response.status>=500)&&attempt<5){await sleep(500*Math.pow(2,attempt));continue;}
    throw new Error(method+" "+key+" returned "+response.status+" "+message);
  }
  throw new Error("Unreachable");
}
async function pooled(items,fn,workers=12){
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(workers,items.length)},async()=>{
    while(cursor<items.length){const item=items[cursor++];await fn(item);}
  }));
}
async function readCurrent(key){return api("GET",key);}
async function saveLocal(key,data){
  const file=local(key);
  await mkdir(path.dirname(file),{recursive:true});
  await writeFile(file,data);
}
const original={};
if(mode==="snapshot"){
  const catalog=await readCurrent("phase1/catalog.json");
  const parsed=JSON.parse(catalog.toString("utf8"));
  if(parsed.article_count!==2640||!Array.isArray(parsed.articles)||parsed.articles.length!==2640)
    throw new Error("Unexpected R2 catalog size; cannot edit.");
  const slugs=parsed.articles.map(x=>x.slug);
  if(new Set(slugs).size!==2640||slugs.some(s=>!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(s)))
    throw new Error("Unsafe or duplicate catalog slug");
  original["phase1/catalog.json"]=sha(catalog);
  await saveLocal("phase1/catalog.json",catalog);
  const keys=slugs.flatMap(slug=>["phase1/article/"+slug+".html","phase1/research/"+slug+".html"]);
  await pooled(keys,async key=>{
    const data=await readCurrent(key);
    if(!data.length)throw new Error("Empty R2 source: "+key);
    original[key]=sha(data);
    await saveLocal(key,data);
  });
  await mkdir(path.dirname(snapshotPath),{recursive:true});
  await writeFile(snapshotPath,JSON.stringify({count:2640,bucket,original,created_at:new Date().toISOString()})+"\n");
  console.log(JSON.stringify({phase:"snapshot",article_count:2640,objects:keys.length+1,source_hashes:Object.keys(original).length}));
} else {
  const snap=JSON.parse(await readFile(snapshotPath,"utf8"));
  if(snap.count!==2640||snap.bucket!==bucket||Object.keys(snap.original).length!==5281)
    throw new Error("Incomplete or different R2 editorial snapshot");
  const qa=JSON.parse(await readFile(path.join(root,"library-data/editorial-qa.json"),"utf8"));
  if(qa.status!=="pass"||qa.article_count!==2640||qa.research_count!==2640||
     qa.unique_research_notes!==2640||qa.catalog_entries_validated<2640)
    throw new Error("Full editorial QA gate not passed");
  // Compare current remote SHA before any write, guarding against another editor
  // changing the source between our snapshot and publication.
  const candidates=Object.keys(snap.original).filter(k=>k.includes("/article/")||k==="phase1/catalog.json");
  const changed=[];
  await pooled(candidates,async key=>{
    const before=await readCurrent(key);
    const originalHash=snap.original[key];
    const target=await readFile(local(key));
    if(sha(before)!==originalHash)throw new Error("Concurrent R2 change detected, refusing deployment: "+key);
    if(sha(target)!==originalHash)changed.push({key,target,before});
  });
  if(!changed.length)throw new Error("No editorial changes found. Refusing unnecessary publish.");
  const changedArticles=changed.filter(x=>x.key.includes("/article/"));
  const catalogChange=changed.find(x=>x.key==="phase1/catalog.json");
  // Backup original bytes under an immutable release-specific prefix.
  const run=process.env.GITHUB_RUN_ID||new Date().toISOString().replace(/[^0-9]/g,"");
  const backupPrefix="phase1/_editorial_backup/"+run+"/";
  await pooled(changed,async item=>{
    await api("PUT",backupPrefix+item.key.slice("phase1/".length),item.before);
  });
  // Publish pages first, catalog last. Other R2 assets and evidence are untouched.
  await pooled(changedArticles,async item=>await api("PUT",item.key,item.target));
  if(catalogChange)await api("PUT",catalogChange.key,catalogChange.target);
  const report={...qa,published_at:new Date().toISOString(),run,changed_articles:changedArticles.length,backup_prefix:backupPrefix};
  await api("PUT","phase1/_release/editorial-qa.json",Buffer.from(JSON.stringify(report)));
  if(!zone)throw new Error("Published but cannot purge edge caches: missing CLOUDFLARE_ZONE_ID");
  const urls=changedArticles.map(x=>"https://aafnaipatro.com/article/"+path.basename(x.key,".html"));
  if(catalogChange)urls.push("https://aafnaipatro.com/library-index.json");
  for(let i=0;i<urls.length;i+=30){
    const response=await fetch("https://api.cloudflare.com/client/v4/zones/"+encodeURIComponent(zone)+"/purge_cache",{
      method:"POST",headers:{...headers,"Content-Type":"application/json"},
      body:JSON.stringify({files:urls.slice(i,i+30)})
    });
    const responseBody=await response.json().catch(()=>({success:false}));
    if(!response.ok||!responseBody.success)throw new Error("Cache purge failed after publish: "+JSON.stringify(responseBody).slice(0,500));
  }
  console.log(JSON.stringify({phase:"published",changed_articles:changedArticles.length,catalog_changed:!!catalogChange,backup_prefix:backupPrefix,purge_urls:urls.length,qa_hash:qa.editorial_sha256}));
}
