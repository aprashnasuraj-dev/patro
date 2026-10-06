const site=(process.env.PUBLIC_SITE_URL||"https://aafnaipatro.com").replace(/\/$/,"");
const concurrency=Math.max(1,Math.min(16,Number(process.env.HISTORY_PRIME_CONCURRENCY||8)));
const settleMs=Math.max(0,Number(process.env.HISTORY_PRIME_SETTLE_MS||1500));

const dates=[];
for(let month=1;month<=12;month++){
  const days=new Date(Date.UTC(2000,month,0)).getUTCDate();
  for(let day=1;day<=days;day++){
    dates.push(`2000-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`);
  }
}

const stats={edge:0,kv:0,r2:0,origin:0};
const backends={};
const failures=[];
let d1Responses=0;
let cursor=0;

async function fetchHistory(date){
  const response=await fetch(`${site}/api/v1/on-this-day?date=${date}&rev=annual-prime`,{
    headers:{accept:"application/json","user-agent":"aafnai-patro-storage-primer/1.0"},
  });
  const text=await response.text();
  let body;
  try{body=JSON.parse(text);}catch{throw new Error(`non-json HTTP ${response.status}`);}
  if(!response.ok)throw new Error(`HTTP ${response.status}: ${String(body?.error||body?.message||"").slice(0,120)}`);
  if(body?.ok!==true||body?.date!==date||!Array.isArray(body?.items)){
    throw new Error(`invalid payload for ${date}`);
  }
  const layer=response.headers.get("x-patro-cache")||"origin";
  const backend=response.headers.get("x-patro-backend")||String(body?.source||"unknown");
  if(layer in stats)stats[layer]++;else stats.origin++;
  backends[backend]=(backends[backend]||0)+1;
  if(/d1/i.test(backend))d1Responses++;
  return {layer,backend,count:Number(body.count||0)};
}

async function worker(){
  while(true){
    const index=cursor++;
    if(index>=dates.length)return;
    const date=dates[index];
    try{await fetchHistory(date);}catch(error){failures.push(`${date}: ${String(error?.message||error)}`);}
  }
}

await Promise.all(Array.from({length:concurrency},()=>worker()));
if(failures.length){
  throw new Error(`Annual On This Day prime failed (${failures.length}/366): ${failures.slice(0,8).join(" | ")}`);
}
if(d1Responses>0){
  throw new Error(`Annual On This Day prime unexpectedly used D1 ${d1Responses} times; R2/static archive should satisfy cold fills.`);
}

if(settleMs)await new Promise(resolve=>setTimeout(resolve,settleMs));

const verifyDates=["2000-01-01","2000-02-29","2000-10-06","2000-12-31"];
const verify=[];
for(const date of verifyDates){
  const result=await fetchHistory(date);
  verify.push({date,...result});
}
if(!verify.some(row=>["edge","kv","r2"].includes(row.layer))){
  throw new Error(`Post-prime verification did not observe a cache hit: ${JSON.stringify(verify)}`);
}
if(verify.some(row=>/d1/i.test(row.backend))){
  throw new Error(`Post-prime verification still reports D1: ${JSON.stringify(verify)}`);
}

console.log(JSON.stringify({
  ok:true,
  annual_keys:dates.length,
  concurrency,
  first_pass:stats,
  backends,
  verify,
},null,2));
