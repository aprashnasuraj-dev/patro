import { readFile } from "node:fs/promises";
import path from "node:path";

const token=process.env.CLOUDFLARE_API_TOKEN;
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const bucket=process.env.AAFNAI_LIBRARY_R2_BUCKET||"aafnai-library";
const root=process.env.AAFNAI_LIBRARY_BUNDLE_ROOT||".aafnai-library-bundle";
if(!token||!account)throw new Error("Cloudflare credentials missing");
const api="https://api.cloudflare.com/client/v4/accounts/"+account+"/r2/buckets/"+encodeURIComponent(bucket)+"/objects";
const auth={Authorization:"Bearer "+token};

async function getObject(key){
  const res=await fetch(api+"/"+encodeURIComponent(key),{headers:auth});
  if(res.status===404)return null;
  if(!res.ok)throw new Error("GET "+key+": "+res.status+" "+await res.text());
  return Buffer.from(await res.arrayBuffer());
}
async function putObject(item){
  const file=path.join(root,item.path);
  const data=await readFile(file);
  const res=await fetch(api+"/"+encodeURIComponent(item.key),{
    method:"PUT",
    headers:{...auth,"Content-Type":item.content_type||"application/octet-stream","Cache-Control":item.cache_control||"public, max-age=31536000, immutable","Content-Length":String(data.byteLength)},
    body:data
  });
  if(!res.ok)throw new Error("PUT "+item.key+": "+res.status+" "+await res.text());
}

const manifest=JSON.parse(await readFile(path.join(root,"r2-manifest.json"),"utf8"));
let previous={objects:[]};
try{
  const bytes=await getObject("phase1/_release/r2-manifest.json");
  if(bytes)previous=JSON.parse(bytes.toString("utf8"));
}catch(err){console.warn("Previous manifest unavailable:",err.message)}
const old=new Map((previous.objects||[]).map(x=>[x.key,x.sha256]));
const changed=manifest.objects.filter(x=>old.get(x.key)!==x.sha256);
const concurrency=12;
let next=0,uploaded=0;
async function worker(){
  while(true){
    const i=next++;
    if(i>=changed.length)return;
    await putObject(changed[i]);
    uploaded++;
    if(uploaded%100===0)console.log("Uploaded "+uploaded+"/"+changed.length);
  }
}
await Promise.all(Array.from({length:Math.min(concurrency,Math.max(1,changed.length))},worker));
const releaseManifest={...manifest,published_at:new Date().toISOString()};
const manifestBytes=Buffer.from(JSON.stringify(releaseManifest));
const res=await fetch(api+"/"+encodeURIComponent("phase1/_release/r2-manifest.json"),{
  method:"PUT",
  headers:{...auth,"Content-Type":"application/json","Cache-Control":"no-cache","Content-Length":String(manifestBytes.byteLength)},
  body:manifestBytes
});
if(!res.ok)throw new Error("PUT release manifest: "+res.status+" "+await res.text());
console.log(JSON.stringify({bucket,total:manifest.objects.length,changed:changed.length,unchanged:manifest.objects.length-changed.length,uploaded}));
