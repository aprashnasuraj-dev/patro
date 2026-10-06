import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root=process.cwd();
const base=String(process.env.PUBLIC_SITE_URL||"https://aafnaipatro.com").replace(/\/+$/,"");
const calendar=JSON.parse(readFileSync(resolve(root,".cloudflare/calendar-r2/manifest.json"),"utf8"));
const community=JSON.parse(readFileSync(resolve(root,".cloudflare/community-r2/manifest.json"),"utf8"));
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const expectedPageBackend="cloudflare-r2-public-archive";
const expectedApiBackend="cloudflare-r2-calendar";
const currentDayApiBackends=new Set([expectedApiBackend,"cloudflare-native-indexed-calendar"]);

async function request(path,{backend,backends,contains}={}){
  const url=base+path;
  let response;
  for(let attempt=1;attempt<=6;attempt++){
    try{
      response=await fetch(url,{headers:{"user-agent":"AafnaiPatro-ReleaseGate/1.0","cache-control":"no-cache"},redirect:"follow"});
      if(response.ok)break;
    }catch(error){if(attempt===6)throw error;}
    if(attempt<6)await new Promise((r)=>setTimeout(r,2000));
  }
  if(!response?.ok)throw new Error(`${path} returned ${response?.status||"no-response"}`);
  const actual=response.headers.get("x-patro-backend")||"";
  if(backend&&actual!==backend)throw new Error(`${path} backend ${actual||"<missing>"} != ${backend}`);
  if(backends&&!backends.has(actual))throw new Error(`${path} backend ${actual||"<missing>"} not in ${[...backends].join(",")}`);
  const text=await response.text();
  if(contains&&!text.includes(contains))throw new Error(`${path} missing expected marker ${contains}`);
  console.log(JSON.stringify({path,status:response.status,backend:actual||null,bytes:text.length}));
  return {response,text};
}

if(calendar.row_count!==77070||calendar.ad_start!=="1826-04-11"||calendar.ad_end!=="2037-04-13")throw new Error("local calendar manifest is not the expected release inventory");
const oldest=calendar.ad_start;
const latest=calendar.ad_end;
const bsYear=calendar.bs_years?.[0];
if(!Number.isInteger(bsYear))throw new Error("calendar manifest has no BS year");

for(const date of [oldest,today,latest]){
  await request(`/date/${date}`,{backend:expectedPageBackend});
  await request(`/api/v1/sync?date=${encodeURIComponent(date)}`,date===today?{backends:currentDayApiBackends}:{backend:expectedApiBackend});
}
await request(`/calendar/${bsYear}`,{backend:expectedPageBackend});

for(const family of community.primary_families||[]){
  const row=(community.files||[]).find((file)=>file.family===family);
  if(!row?.route)throw new Error(`community manifest has no representative route for ${family}`);
  await request(row.route,{backend:expectedPageBackend});
}

await request("/on-this-day/02-29",{contains:"/on-this-day/02-29"});

console.log(JSON.stringify({
  ok:true,
  base,
  calendar_dates:[oldest,today,latest],
  calendar_year:bsYear,
  community_families:community.primary_families,
  history_recurrence:"/on-this-day/02-29",
  page_backend:expectedPageBackend,
  api_backend:expectedApiBackend,
  current_day_api_backends:[...currentDayApiBackends]
},null,2));
