import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root=process.cwd();
const contract=JSON.parse(await readFile(resolve(root,"cloudflare/cutover-contract.json"),"utf8"));
const legacy=(process.env.LEGACY_ORIGIN||contract.legacy_origin||"").replace(/\/$/,"");
const target=(process.env.TARGET_ORIGIN||process.argv.find(x=>x.startsWith("--target="))?.slice(9)||"").replace(/\/$/,"");
const timeoutMs=Math.max(1000,Number(process.env.SMOKE_TIMEOUT_MS||"12000"));

if(!legacy) throw new Error("LEGACY_ORIGIN is missing.");
if(!target) throw new Error("TARGET_ORIGIN or --target=https://... is required.");

function getPath(obj,path){
  return path.split(".").reduce((v,k)=>v==null?undefined:v[k],obj);
}
function stable(v){
  if(v===undefined) return "__undefined__";
  if(v===null||typeof v!=="object") return v;
  if(Array.isArray(v)) return v.map(stable);
  return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
}
async function fetchOne(origin,path){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetch(origin+path,{redirect:"manual",headers:{accept:"text/html,application/json;q=0.9,*/*;q=0.8"},signal:controller.signal});
    const type=res.headers.get("content-type")||"";
    const body=await res.text();
    return {status:res.status,type,body,location:res.headers.get("location")};
  }finally{clearTimeout(timer);}
}
function parseJson(result,label){
  try{return JSON.parse(result.body);}
  catch{throw new Error(label+" did not return valid JSON");}
}

const failures=[];
const report=[];
for(const spec of contract.routes){
  let a,b;
  try{
    [a,b]=await Promise.all([fetchOne(legacy,spec.path),fetchOne(target,spec.path)]);
  }catch(error){
    failures.push(spec.path+": request failed: "+String(error?.message||error));
    continue;
  }
  const row={path:spec.path,kind:spec.kind,legacy_status:a.status,target_status:b.status};
  if(a.status!==b.status){
    failures.push(spec.path+`: status legacy=${a.status} target=${b.status}`);
  }
  if(spec.kind==="html"){
    if(!a.type.includes("text/html")) failures.push(spec.path+": legacy content-type is not HTML");
    if(!b.type.includes("text/html")) failures.push(spec.path+": target content-type is not HTML");
  }else{
    if(!a.type.includes("json")) failures.push(spec.path+": legacy content-type is not JSON");
    if(!b.type.includes("json")) failures.push(spec.path+": target content-type is not JSON");
    if(spec.kind==="json-semantic" && a.status<400 && b.status<400){
      const aj=parseJson(a,"legacy "+spec.path), bj=parseJson(b,"target "+spec.path);
      row.fields={};
      for(const field of spec.fields||[]){
        const av=stable(getPath(aj,field)), bv=stable(getPath(bj,field));
        row.fields[field]={legacy:av,target:bv,equal:JSON.stringify(av)===JSON.stringify(bv)};
        if(!row.fields[field].equal) failures.push(spec.path+": semantic field mismatch "+field);
      }
    }
  }
  report.push(row);
}

console.log(JSON.stringify({legacy,target,checked:report.length,failures,report},null,2));
if(failures.length) process.exit(1);
