import { dispatchDuePushJobs, type PushEnv } from "./push";

export type JobsEnv=PushEnv & {
  DB?:any;
  CACHE?:any;
  CRON_SECRET?:string;
};

function json(body:any,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-patro-backend":"cloudflare-cron"}})}
function todayUtc(){return new Date().toISOString().slice(0,10)}
async function upsertMarket(env:JobsEnv,row:any){
  const key=String(row.provider)+":"+String(row.asset)+":"+String(row.as_of);
  await env.DB.prepare(
    "insert into content_records(table_name,record_key,ad_date,category,payload,updated_at) values('market_snapshots',?1,?2,?3,?4,datetime('now')) on conflict(table_name,record_key) do update set payload=excluded.payload,updated_at=datetime('now')"
  ).bind(key,row.as_of,row.kind,JSON.stringify(row)).run();
}
async function refreshNrb(env:JobsEnv){
  const end=todayUtc(),start=new Date(Date.now()-7*86400_000).toISOString().slice(0,10);
  const u=new URL("https://www.nrb.org.np/api/forex/v1/rates");
  u.searchParams.set("page","1");u.searchParams.set("per_page","20");u.searchParams.set("from",start);u.searchParams.set("to",end);
  const r=await fetch(u.toString(),{headers:{accept:"application/json","user-agent":"MeroPatro-Market/2.0"},signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error("nrb_http_"+r.status);
  const body:any=await r.json();
  const payloads=Array.isArray(body?.data?.payload)?body.data.payload:Array.isArray(body?.data)?body.data:Array.isArray(body?.payload)?body.payload:[];
  const day=payloads.filter((x:any)=>x?.date&&Array.isArray(x?.rates)).sort((a:any,b:any)=>String(b.date).localeCompare(String(a.date)))[0];
  if(!day)throw new Error("nrb_payload_empty");
  let count=0;
  for(const rate of day.rates){
    const iso=String(rate?.currency?.iso3||rate?.currency?.iso||"").toUpperCase();if(!iso)continue;
    const per=Number(rate?.currency?.unit||rate?.unit||1)||1,buy=Number(rate?.buy),sell=Number(rate?.sell);
    if(!Number.isFinite(buy)||!Number.isFinite(sell))continue;
    await upsertMarket(env,{provider:"nrb_forex",asset:iso,as_of:String(day.date),kind:"forex",value:String(sell),buy:String(buy),sell:String(sell),unit:iso,per:String(per),fetched_at:new Date().toISOString(),source_url:"https://www.nrb.org.np/forex/",change:null,percent_change:null,source_label:"Nepal Rastra Bank",source_updated_at:new Date().toISOString()});count++;
  }
  if(!count)throw new Error("nrb_rates_empty");
  return {provider:"nrb_forex",date:day.date,count};
}
async function refreshNepse(env:JobsEnv){
  const r=await fetch("https://shubhamnpk.github.io/yonepse/data/market/indices.json",{headers:{accept:"application/json","user-agent":"MeroPatro-Market/2.0"},signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error("nepse_http_"+r.status);
  const body:any=await r.json(),list=Array.isArray(body)?body:Array.isArray(body?.data)?body.data:Array.isArray(body?.indices)?body.indices:[];
  const item=list.find((x:any)=>/^(nepse|nepse index)$/i.test(String(x?.name||x?.index||x?.symbol||"")))||list[0];
  if(!item)throw new Error("nepse_payload_empty");
  const value=Number(item.value??item.currentValue??item.close??item.indexValue),change=Number(item.change??item.pointChange??0),pct=Number(item.percentChange??item.percentageChange??item.percent_change??0);
  if(!Number.isFinite(value))throw new Error("nepse_value_invalid");
  const date=String(item.date||item.asOf||todayUtc()).slice(0,10);
  await upsertMarket(env,{provider:"nepse_index",asset:"NEPSE",as_of:validIso(date)?date:todayUtc(),kind:"index",value:String(value),buy:null,sell:null,unit:"points",per:"1",fetched_at:new Date().toISOString(),source_url:"https://shubhamnpk.github.io/yonepse/pages/docs.html",change:Number.isFinite(change)?String(change):null,percent_change:Number.isFinite(pct)?String(pct):null,source_label:"YoNEPSE public mirror (MIT; NEPSE-sourced)",source_updated_at:new Date().toISOString()});
  return {provider:"nepse_index",date:validIso(date)?date:todayUtc(),count:1};
}
function validIso(v:string){return /^\d{4}-\d{2}-\d{2}$/.test(v)}
export async function refreshMarkets(env:JobsEnv){
  if(!env.DB)return {ok:false,error:"d1_unavailable"};
  const settled=await Promise.allSettled([refreshNrb(env),refreshNepse(env)]);
  const providers=settled.map((x,i)=>x.status==="fulfilled"?x.value:{provider:i===0?"nrb_forex":"nepse_index",error:String((x as PromiseRejectedResult).reason?.message||(x as PromiseRejectedResult).reason)});
  return {ok:settled.some(x=>x.status==="fulfilled"),providers,refreshed_at:new Date().toISOString()};
}
export async function maintenance(env:JobsEnv){
  if(!env.DB)return {ok:false,error:"d1_unavailable"};
  const results=await env.DB.batch([
    env.DB.prepare("delete from auth_sessions where expires_at<=datetime('now')"),
    env.DB.prepare("delete from family_invites where expires_at<=datetime('now') or uses>=max_uses"),
    env.DB.prepare("delete from notification_jobs where status in ('sent','failed') and created_at<datetime('now','-30 days')")
  ]);
  if(env.CACHE){for(const key of ["market:latest","health:doctor"])try{await env.CACHE.delete(key)}catch{}}
  return {ok:true,operations:results.length,at:new Date().toISOString()};
}
function authorized(request:Request,env:JobsEnv){
  const expected=env.CRON_SECRET||"";if(!expected)return false;
  return request.headers.get("authorization")==="Bearer "+expected;
}
export async function cronResponse(request:Request,env:JobsEnv):Promise<Response|null>{
  const path=new URL(request.url).pathname;
  if(!["/api/cron/market","/api/cron/push","/api/cron/revalidate","/api/v1/cron/rashifal"].includes(path))return null;
  if(!authorized(request,env))return json({ok:false,error:"unauthorized"},401);
  if(request.method!=="POST"&&request.method!=="GET")return json({ok:false,error:"method_not_allowed"},405);
  if(path==="/api/cron/market")return json(await refreshMarkets(env));
  if(path==="/api/cron/push")return json(await dispatchDuePushJobs(env,100));
  if(path==="/api/cron/revalidate")return json(await maintenance(env));
  // Universal Rashifal publications remain deterministic D1 content. Native personalized
  // readings are computed on demand; this job validates availability rather than calling Vercel.
  const row=env.DB?await env.DB.prepare("select count(*) as c,max(updated_at) as updated from content_records where table_name='miti_rashifal_publications'").first():null;
  return json({ok:!!row&&Number(row.c)>0,publication_count:Number(row?.c||0),latest_updated_at:row?.updated||null,mode:"cloudflare-d1-publications+native-personalized"});
}
export async function runScheduled(cron:string,env:JobsEnv){
  const result:any={cron,at:new Date().toISOString()};
  if(cron==="*/5 * * * *")result.push=await dispatchDuePushJobs(env,100);
  if(cron==="17 0,6,12,18 * * *")result.market=await refreshMarkets(env);
  if(cron==="43 2 * * *")result.maintenance=await maintenance(env);
  return result;
}
