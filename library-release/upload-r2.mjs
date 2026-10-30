import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const root=resolve(process.argv[2]||"dist/aafnai-library");
const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token=process.env.CLOUDFLARE_API_TOKEN?.trim();
const bucket=(process.env.LIBRARY_R2_BUCKET||"aafnai-library").trim();
const dryRun=process.argv.includes("--dry-run");
if(!account||!token)throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required");

function contentType(path){
  if(path.endsWith(".html"))return "text/html; charset=utf-8";
  if(path.endsWith(".json"))return "application/json; charset=utf-8";
  if(path.endsWith(".xml"))return "application/xml; charset=utf-8";
  if(path.endsWith(".css"))return "text/css; charset=utf-8";
  if(path.endsWith(".js")||path.endsWith(".mjs"))return "text/javascript; charset=utf-8";
  if(path.endsWith(".svg"))return "image/svg+xml";
  if(path.endsWith(".png"))return "image/png";
  if(path.endsWith(".jpg")||path.endsWith(".jpeg"))return "image/jpeg";
  if(path.endsWith(".webp"))return "image/webp";
  return "application/octet-stream";
}
async function walk(dir,out=[]){
  for(const name of await readdir(dir)){
    const path=join(dir,name);
    const info=await stat(path);
    if(info.isDirectory())await walk(path,out);
    else if(info.isFile())out.push(path);
  }
  return out;
}
async function api(path,init={}){
  const response=await fetch("https://api.cloudflare.com/client/v4"+path,{...init,headers:{authorization:"Bearer "+token,...(init.headers||{})}});
  const text=await response.text();
  let body;try{body=JSON.parse(text)}catch{body=text}
  if(!response.ok||body?.success===false)throw new Error("Cloudflare API "+response.status+" "+JSON.stringify(body).slice(0,1000));
  return body;
}
async function ensureBucket(){
  try{await api("/accounts/"+account+"/r2/buckets/"+encodeURIComponent(bucket));}
  catch(error){
    if(!String(error).includes("404"))throw error;
    if(dryRun)return;
    await api("/accounts/"+account+"/r2/buckets/"+encodeURIComponent(bucket),{method:"PUT",headers:{"content-type":"application/json"},body:"{}"});
  }
}
function encodeKey(key){
  return key.split("/").map(part=>encodeURIComponent(part)).join("/");
}
async function upload(file){
  const key=relative(root,file).split(sep).join("/");
  if(!key.startsWith("phase1/"))return {key,skipped:true};
  const bytes=await readFile(file);
  if(dryRun)return {key,bytes:bytes.length,dryRun:true};
  const result=await api("/accounts/"+account+"/r2/buckets/"+encodeURIComponent(bucket)+"/objects/"+encodeKey(key),{
    method:"PUT",
    headers:{"content-type":contentType(key),"content-length":String(bytes.length)},
    body:bytes
  });
  return {key,bytes:bytes.length,etag:result?.result?.etag||result?.etag};
}
await ensureBucket();
const files=await walk(root);
let index=0,uploaded=0,totalBytes=0;
const concurrency=Math.max(1,Math.min(24,Number(process.env.LIBRARY_UPLOAD_CONCURRENCY||12)));
async function worker(){
  while(true){
    const i=index++;
    if(i>=files.length)return;
    const result=await upload(files[i]);
    if(!result.skipped){uploaded++;totalBytes+=result.bytes||0;}
    if(uploaded%250===0)process.stdout.write("uploaded "+uploaded+"/"+files.length+"\n");
  }
}
await Promise.all(Array.from({length:concurrency},()=>worker()));
console.log(JSON.stringify({bucket,root,files:files.length,uploaded,totalBytes,dryRun}));
