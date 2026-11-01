import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root=process.cwd();
const read=async p=>JSON.parse(await readFile(resolve(root,p),"utf8"));
const ownership=await read("scripts/tool-growth/external-worker-ownership.json");
const wrangler=await read("wrangler.jsonc");
const errors=[];
const verify=(valid,message)=>{if(!valid)errors.push(message)};
const expectedRoot=ownership.root;
verify(wrangler.name===expectedRoot.worker,"Main Worker name changed");
verify(wrangler.main===expectedRoot.main,"Main Worker entry changed");
verify(Array.isArray(wrangler.routes)&&wrangler.routes.length===1&&wrangler.routes[0].pattern===expectedRoot.hostname&&wrangler.routes[0].custom_domain===true,"Main Worker must own only its existing root custom domain");
verify(ownership.foreignRoutes.length===8,"External Worker routes inventory changed unexpectedly");
verify(ownership.foreignCustomDomains.length===6,"External custom domain inventory changed unexpectedly");
const prefixes=ownership.reservedPrefixes;
const isReserved=p=>prefixes.some(prefix=>p.startsWith(prefix));
const redirectText=await readFile(resolve(root,"public/_redirects"),"utf8");
const redirects=redirectText.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith("#"));
verify(redirects.length>=347,"The existing 337 redirects and ten new tool aliases were not all preserved");
for(const line of redirects){
 const [from,to]=line.split(/\s+/);
 verify(!isReserved(from)&&!isReserved(to),"Main Worker redirect would affect an independently owned path: "+line);
}
const children=Array.isArray(wrangler.assets?.run_worker_first)?wrangler.assets.run_worker_first:[];
verify(children.includes("/*"),"Existing Worker-first configuration missing");
verify(children.length<=100,"Cloudflare supports at most 100 run_worker_first rules; got "+children.length);
verify(children.includes("!/assets/*"),"Shared tool analytics must reuse the existing static /assets/* rule");
verify(!children.includes("!/tool-analytics.mjs"),"Do not add a separate analytics routing rule");
try{const st=await stat(resolve(root,"public/assets/tool-analytics.mjs"));verify(st.isFile()&&st.size>0,"Tool analytics static asset is missing")}catch(e){if(e.code==="ENOENT")verify(false,"Tool analytics static asset is missing");else throw e}
for(const p of children.filter(x=>x.startsWith("!")&&x!=="!/*")){
 const path=p.slice(1);
 verify(!isReserved(path),"Main Worker attempts to declare asset-first ownership of a foreign route: "+p);
}
// No release from this repo may create new public blog content or override the library Worker.
for(const p of ["article","blogs","research","library"]){
 try{await stat(resolve(root,"public",p));verify(false,"Main repo contains a foreign content directory: public/"+p)}
 catch(e){if(e.code!=="ENOENT")throw e}
}

async function cloudflareGet(path,token){
 const response=await fetch("https://api.cloudflare.com/client/v4"+path,{
  headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
 const data=await response.json();
 if(!response.ok||data?.success!==true)throw new Error("Cloudflare route API failed at "+path+" ("+response.status+")");
 return data.result;
}
if(process.argv.includes("--live")){
 const token=process.env.CLOUDFLARE_API_TOKEN||process.env.CF_API_TOKEN;
 const account=process.env.CLOUDFLARE_ACCOUNT_ID;
 const zone=process.env.CLOUDFLARE_ZONE_ID;
 if(!token||!account||!zone)throw new Error("LIVE_EXTERNAL_OWNERSHIP_CHECK requires CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ZONE_ID");
 const [routes,domains]=await Promise.all([
  cloudflareGet("/zones/"+encodeURIComponent(zone)+"/workers/routes",token),
  cloudflareGet("/accounts/"+encodeURIComponent(account)+"/workers/domains",token)
 ]);
 const routeMap=new Map((routes||[]).map(r=>[r.pattern,r.script]));
 const domainMap=new Map((domains||[]).map(r=>[r.hostname,r.service]));
 for(const row of ownership.foreignRoutes){
  verify(routeMap.get(row.pattern)===row.script,"External route changed: "+row.pattern+" expected "+row.script);
 }
 for(const row of ownership.foreignCustomDomains){
  verify(domainMap.get(row.hostname)===row.service,"Independent custom domain changed: "+row.hostname);
 }
 verify(domainMap.get(expectedRoot.hostname)===expectedRoot.worker,"Root hostname Worker ownership changed");
}
if(errors.length){
 for(const error of errors)console.error("EXTERNAL_WORKER_GUARD: "+error);
 process.exitCode=1;
}else{
 console.log("External Worker ownership PASS: "+ownership.foreignRoutes.length+" dedicated routes, "+ownership.foreignCustomDomains.length+" independent subdomains, 347+ redirects protected; live="+process.argv.includes("--live"));
}
