import { PATRO_CITIES } from "../lib/patro";
import { fastCalendarResponse } from "./calendar-fast";
import { fastHistoryResponse } from "./history-fast";
import { dispatchDuePushJobs, type PushEnv } from "./push";
import { primeQuotaCache } from "./quota-cache";

export type JobsEnv=PushEnv & {
  DB?:any;
  CACHE?:any;
  ARCHIVE?:any;
  CRON_SECRET?:string;
  PUBLIC_SITE_URL?:string;
  CALENDAR_SOURCE_VERSION?:string;
  PUBLIC_REFERENCE_CACHE_VERSION?:string;
};

function json(body:any,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-patro-backend":"cloudflare-cron"}})}

function todayNepal(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}

export async function maintenance(env:JobsEnv){
  if(!env.DB)return {ok:false,error:"d1_unavailable"};
  const results=await env.DB.batch([
    env.DB.prepare("delete from auth_sessions where expires_at<=datetime('now')"),
    env.DB.prepare("delete from family_invites where expires_at<=datetime('now') or uses>=max_uses"),
    env.DB.prepare("delete from notification_jobs where status in ('sent','failed') and created_at<datetime('now','-30 days')")
  ]);
  if(env.CACHE){for(const key of ["health:doctor"])try{await env.CACHE.delete(key)}catch{}}
  return {ok:true,operations:results.length,at:new Date().toISOString()};
}

export async function purgeDailyCalendarCache(env:JobsEnv){
  const base=String(env.PUBLIC_SITE_URL||"https://aafnaipatro.com").replace(/\/+$/,"");
  const paths=["/","/today",...PATRO_CITIES.map((city)=>`/today/${city.slug}`)];
  let deleted=0;
  try{
    const cache=caches.default;
    for(const path of paths){
      try{if(await cache.delete(new Request(base+path,{method:"GET"})))deleted++;}catch{}
    }
  }catch{}
  return {ok:true,at:new Date().toISOString(),scheduled_utc:"18:15",nepal_time:"00:00",paths,deleted};
}

/**
 * Prime the small, high-traffic public reference set once per Nepal day. This turns
 * thousands of potential D1 reads into one indexed D1 read followed by Cache/KV/R2 hits.
 * The current BS month is also primed; after the first write, the durable R2 copy can
 * repopulate cold edges without touching D1.
 */
export async function warmDailyReferenceCache(env:JobsEnv){
  if(!env.DB)return {ok:false,error:"d1_unavailable"};
  const base=String(env.PUBLIC_SITE_URL||"https://aafnaipatro.com").replace(/\/+$/,"");
  const date=todayNepal();
  const result:any={ok:true,date,kv:!!env.CACHE,r2:!!env.ARCHIVE,items:{}};

  const historyRequest=new Request(`${base}/api/v1/on-this-day?date=${encodeURIComponent(date)}`,{method:"GET"});
  const history=await primeQuotaCache(historyRequest,env,()=>fastHistoryResponse(historyRequest,env as any));
  result.items.history=history?{status:history.status,cache:history.headers.get("x-patro-cache")||"primed"}:{status:0};

  const syncRequest=new Request(`${base}/api/v1/sync?date=${encodeURIComponent(date)}`,{method:"GET"});
  const sync=await primeQuotaCache(syncRequest,env,()=>fastCalendarResponse(syncRequest,env as any));
  result.items.today=sync?{status:sync.status,cache:sync.headers.get("x-patro-cache")||"primed"}:{status:0};

  if(sync?.ok){
    try{
      const body:any=await sync.clone().json();
      const bs=body?.calendars?.bikram_sambat_detail;
      const year=Number(bs?.year),month=Number(bs?.month);
      if(Number.isInteger(year)&&Number.isInteger(month)&&month>=1&&month<=12){
        const monthRequest=new Request(`${base}/api/v1/calendar/${year}/${month}?calendar=bs`,{method:"GET"});
        const monthResponse=await primeQuotaCache(monthRequest,env,()=>fastCalendarResponse(monthRequest,env as any));
        result.items.current_bs_month=monthResponse?{status:monthResponse.status,year,month,cache:monthResponse.headers.get("x-patro-cache")||"primed"}:{status:0,year,month};
      }
    }catch{}
  }
  return result;
}

function authorized(request:Request,env:JobsEnv){
  const expected=env.CRON_SECRET||"";if(!expected)return false;
  return request.headers.get("authorization")==="Bearer "+expected;
}

async function rashifalStatus(env:JobsEnv){
  const row=env.DB?await env.DB.prepare("select count(*) as c,max(updated_at) as updated from content_records where table_name='miti_rashifal_publications'").first():null;
  return {ok:!!row&&Number(row.c)>0,publication_count:Number(row?.c||0),latest_updated_at:row?.updated||null,mode:"cloudflare-d1-publications+native-personalized"};
}

export async function cronResponse(request:Request,env:JobsEnv):Promise<Response|null>{
  const path=new URL(request.url).pathname;
  if(!["/api/cron/push","/api/cron/revalidate","/api/v1/cron/rashifal"].includes(path))return null;
  if(!authorized(request,env))return json({ok:false,error:"unauthorized"},401);
  if(request.method!=="POST"&&request.method!=="GET")return json({ok:false,error:"method_not_allowed"},405);
  if(path==="/api/cron/push")return json(await dispatchDuePushJobs(env,100));
  if(path==="/api/cron/revalidate")return json(await maintenance(env));
  return json(await rashifalStatus(env));
}

export async function runScheduled(cron:string,env:JobsEnv){
  const result:any={cron,at:new Date().toISOString()};
  if(cron==="*/5 * * * *")result.push=await dispatchDuePushJobs(env,100);
  if(cron==="43 2 * * *")result.maintenance=await maintenance(env);
  if(cron==="11 3 * * *")result.rashifal=await rashifalStatus(env);
  if(cron==="15 18 * * *"){
    result.nepal_midnight_cache=await purgeDailyCalendarCache(env);
    result.reference_cache=await warmDailyReferenceCache(env);
  }
  return result;
}
