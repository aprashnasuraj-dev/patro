const account=process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token=process.env.CLOUDFLARE_API_TOKEN?.trim();
const bucket=(process.env.LIBRARY_R2_BUCKET||"aafnai-library").trim();
const domain=(process.env.LIBRARY_ASSET_DOMAIN||"library-assets.aafnaipatro.com").trim();
const zoneName=(process.env.LIBRARY_ZONE_NAME||"aafnaipatro.com").trim();
if(!account||!token)throw new Error("Cloudflare account/token required");
async function api(path,init={}){
  const response=await fetch("https://api.cloudflare.com/client/v4"+path,{...init,headers:{authorization:"Bearer "+token,"content-type":"application/json",...(init.headers||{})}});
  const text=await response.text();let body;try{body=JSON.parse(text)}catch{body=text}
  if(!response.ok||body?.success===false)throw new Error("Cloudflare API "+response.status+" "+JSON.stringify(body).slice(0,1200));
  return body;
}
const existing=await api("/accounts/"+account+"/r2/buckets/"+encodeURIComponent(bucket)+"/domains/custom");
const domains=existing?.result?.domains||existing?.result||[];
if(Array.isArray(domains)&&domains.some(row=>row.domain===domain&&row.enabled!==false)){
  console.log(JSON.stringify({domain,bucket,status:"already_enabled"}));
  process.exit(0);
}
const zones=await api("/zones?name="+encodeURIComponent(zoneName)+"&account.id="+encodeURIComponent(account));
const zone=(zones?.result||[])[0];
if(!zone?.id)throw new Error("Unable to resolve Cloudflare zone "+zoneName);
const result=await api("/accounts/"+account+"/r2/buckets/"+encodeURIComponent(bucket)+"/domains/custom",{
  method:"POST",
  body:JSON.stringify({domain,zoneId:zone.id,enabled:true,minTLS:"1.2"})
});
console.log(JSON.stringify({domain,bucket,zoneId:zone.id,status:"configured",result:result?.result}));
