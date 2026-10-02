import { PATRO_CITIES } from "../lib/patro";
import { dispatchDuePushJobs, type PushEnv } from "./push";

export type JobsEnv=PushEnv & {
  DB?:any;
  CACHE?:any;
  CRON_SECRET?:string;
  PUBLIC_SITE_URL?:string;
};

function json(body:any,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-patro-backend":"cloudflare-cron"}})}

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
  if(cron==="15 18 * * *")result.nepal_midnight_cache=await purgeDailyCalendarCache(env);
  return result;
}
