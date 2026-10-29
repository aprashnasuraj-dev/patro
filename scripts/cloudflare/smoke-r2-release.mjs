import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root=process.cwd();
const base=String(process.env.PUBLIC_SITE_URL||"https://aafnaipatro.com").replace(/\/+$/,"");
const calendar=JSON.parse(readFileSync(resolve(root,".cloudflare/calendar-r2/manifest.json"),"utf8"));
const community=JSON.parse(readFileSync(resolve(root,".cloudflare/community-r2/manifest.json"),"utf8"));
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const archiveBackends=new Set(["r2","static-fallback"]);
const apiBackends=new Set(["r2","static-fallback","cloudflare-native-indexed-calendar"]);

async function fetchRetry(url,{attempts=6,delayMs=2000}={}){
  let response,lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      response=await fetch(url,{headers:{"user-agent":"AafnaiPatro-ReleaseGate/2.0","cache-control":"no-cache"},redirect:"follow"});
      if(response.ok)break;
      console.warn(JSON.stringify({smoke_retry:true,url,attempt,status:response.status}));
    }catch(error){
      lastError=error;
      console.warn(JSON.stringify({smoke_retry:true,url,attempt,error:String(error)}));
      if(attempt===attempts)throw error;
    }
    if(attempt<attempts)await new Promise((r)=>setTimeout(r,Math.min(delayMs*attempt,5000)));
  }
  if(!response?.ok)throw new Error(`${url} returned ${response?.status||"no-response"} after ${attempts} attempts${lastError?`; last error ${lastError}`:""}`);
  return response;
}

async function request(path,{backends,contains,indexable=false,canonical=false,attempts,delayMs}={}){
  const url=base+path;
  const response=await fetchRetry(url,{attempts,delayMs});
  const actual=response.headers.get("x-patro-backend")||"";
  if(backends&&!backends.has(actual))throw new Error(`${path} backend ${actual||"<missing>"} not in ${[...backends].join(",")}`);
  const text=await response.text();
  if(contains&&!text.includes(contains))throw new Error(`${path} missing expected marker ${contains}`);
  if(/meropatro|mero\s+patro/i.test(text))throw new Error(`${path} contains retired MeroPatro brand`);
  if(indexable&&!/<meta\s+name=["']robots["'][^>]+content=["'][^"']*index\s*,?\s*follow/i.test(text))throw new Error(`${path} is not index,follow`);
  if(canonical){
    const expected=`<link rel="canonical" href="${url}">`;
    if(!text.includes(expected))throw new Error(`${path} missing self canonical ${url}`);
  }
  console.log(JSON.stringify({path,status:response.status,backend:actual||null,bytes:text.length}));
  return {response,text};
}

function urlsFromXml(xml){return [...xml.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)].map((match)=>match[1]);}
async function currentSitemapUrls(){
  const indexText=await (await fetchRetry(base+"/sitemap.xml")).text();
  const children=urlsFromXml(indexText).filter((url)=>/sitemap-(?:days|calendar)/.test(url));
  const urls=[];
  for(const child of children){
    const xml=await (await fetchRetry(child)).text();
    urls.push(...urlsFromXml(xml));
  }
  return [...new Set(urls)];
}
function stableSample(values,count,predicate){
  const filtered=values.filter(predicate).sort();
  if(filtered.length<count)throw new Error(`sitemap has only ${filtered.length} matching URLs; need ${count}`);
  const out=[];
  for(let i=0;i<count;i++)out.push(filtered[Math.floor(i*(filtered.length-1)/Math.max(1,count-1))]);
  return [...new Set(out)].slice(0,count);
}

if(calendar.row_count!==77070||calendar.ad_start!=="1826-04-11"||calendar.ad_end!=="2037-04-13")throw new Error("local calendar manifest is not the expected release inventory");
const oldest=calendar.ad_start;
const latest=calendar.ad_end;
const bsYear=calendar.bs_years?.[0];
if(!Number.isInteger(bsYear))throw new Error("calendar manifest has no BS year");

for(const date of [oldest,today,latest]){
  // Warm/verify the immutable archive API before rendering the public page. Immediately
  // after a Worker deployment, the boundary shard can take longer than ordinary routes
  // to become consistently available across Cloudflare isolates.
  await request(`/api/v1/sync?date=${encodeURIComponent(date)}`,{backends:apiBackends,attempts:15,delayMs:2000});
  await request(`/date/${date}`,{backends:archiveBackends,attempts:15,delayMs:2000});
}
await request(`/calendar/${bsYear}`,{backends:archiveBackends});

const sitemapUrls=await currentSitemapUrls();
const dates=stableSample(sitemapUrls,5,(url)=>/\/date\/\d{4}-\d{2}-\d{2}$/.test(url));
const months=stableSample(sitemapUrls,3,(url)=>/\/calendar\/\d{4}\/\d{2}$/.test(url));
for(const url of [...dates,...months])await request(url.slice(base.length),{backends:archiveBackends,indexable:true,canonical:true});

for(const family of community.primary_families||[]){
  const row=(community.files||[]).find((file)=>file.family===family);
  if(!row?.route)throw new Error(`community manifest has no representative route for ${family}`);
  await request(row.route);
}
await request("/on-this-day/02-29",{contains:"/on-this-day/02-29"});

console.log(JSON.stringify({ok:true,base,calendar_dates:[oldest,today,latest],sampled_indexable_archive_pages:dates.length+months.length,sampled_dates:dates,sampled_months:months,archive_backends:[...archiveBackends]},null,2));
