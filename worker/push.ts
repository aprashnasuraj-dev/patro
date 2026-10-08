import { buildPushPayload, type PushMessage, type PushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";
import { currentSession, parseBody, sha256, type AuthEnv } from "./auth";

export type PushEnv=AuthEnv & {
  DB?:any;
  CACHE?:any;
  VAPID_PUBLIC_KEY?:string;
  VAPID_PRIVATE_KEY?:string;
  VAPID_SUBJECT?:string;
};

const PUSH_GATE_KEY="quota:push-next-due:v1";
const IDLE_RECHECK_MS=60*60*1000;

function json(body:any,status=200){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
}
function token(bytes=24){const data=crypto.getRandomValues(new Uint8Array(bytes));let s="";for(const b of data)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function vapid(env:PushEnv):VapidKeys|null{
  if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return null;
  return {subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY};
}
function safeSubscription(row:any):PushSubscription|null{
  try{
    const keys=typeof row.keys==="string"?JSON.parse(row.keys):row.keys;
    if(!row.endpoint||!keys?.p256dh||!keys?.auth)return null;
    return {endpoint:String(row.endpoint),expirationTime:null,keys:{p256dh:String(keys.p256dh),auth:String(keys.auth)}};
  }catch{return null}
}

async function readPushGate(env:PushEnv){
  if(!env.CACHE)return null;
  try{
    const raw=await env.CACHE.get(PUSH_GATE_KEY,"text");
    if(!raw)return null;
    const value=JSON.parse(raw);
    return Number.isFinite(Number(value?.wake_at_ms))?Number(value.wake_at_ms):null;
  }catch{return null}
}
async function writePushGate(env:PushEnv,wakeAtMs:number){
  if(!env.CACHE||!Number.isFinite(wakeAtMs))return;
  try{await env.CACHE.put(PUSH_GATE_KEY,JSON.stringify({wake_at_ms:wakeAtMs,updated_at:new Date().toISOString()}),{expirationTtl:48*3600})}catch{}
}
async function notePushDue(env:PushEnv,wakeAtMs:number){
  if(!env.CACHE||!Number.isFinite(wakeAtMs))return;
  const current=await readPushGate(env);
  if(current!=null&&current<=wakeAtMs&&current>Date.now()-30_000)return;
  await writePushGate(env,wakeAtMs);
}
async function invalidatePushGate(env:PushEnv){
  if(!env.CACHE)return;
  try{await env.CACHE.delete(PUSH_GATE_KEY)}catch{}
}
async function refreshPushGate(env:PushEnv){
  if(!env.CACHE||!env.DB)return;
  try{
    const row=await env.DB.prepare(
      "select case when next_attempt_at is not null and julianday(next_attempt_at)>julianday(fire_at_utc) then next_attempt_at else fire_at_utc end as next_due from notification_jobs where status='pending' order by max(julianday(fire_at_utc),coalesce(julianday(next_attempt_at),julianday(fire_at_utc))) asc limit 1"
    ).first();
    const next=row?.next_due?Date.parse(String(row.next_due)):NaN;
    await writePushGate(env,Number.isFinite(next)?next:Date.now()+IDLE_RECHECK_MS);
  }catch{
    await writePushGate(env,Date.now()+5*60*1000);
  }
}

export async function dispatchDuePushJobs(env:PushEnv,limit=50){
  if(!env.DB)return {ok:false,error:"d1_unavailable",processed:0,sent:0,failed:0};
  const keys=vapid(env);if(!keys)return {ok:false,error:"vapid_not_configured",processed:0,sent:0,failed:0};

  // The 5-minute cron used to hit D1 288 times/day even with no reminders. KV stores only
  // the next wake timestamp (no personal data). New/updated jobs lower this timestamp, so
  // delivery cadence is preserved while idle/future periods avoid D1 reads entirely.
  const gatedUntil=await readPushGate(env);
  if(gatedUntil!=null&&gatedUntil>Date.now()+15_000){
    return {ok:true,processed:0,sent:0,failed:0,skipped:"kv_next_due",next_check_at:new Date(gatedUntil).toISOString()};
  }

  const rows=await env.DB.prepare(
    "select j.id,j.device_id,j.job_ref,j.category,j.attempts,j.shared_payload,s.endpoint,s.keys from notification_jobs j join push_subscriptions s on s.device_id=j.device_id where j.status='pending' and j.fire_at_utc<=datetime('now') and (j.next_attempt_at is null or j.next_attempt_at<=datetime('now')) order by j.fire_at_utc limit ?1"
  ).bind(Math.min(200,Math.max(1,limit))).all();
  let sent=0,failed=0;
  for(const row of rows.results||[]){
    const sub=safeSubscription(row);
    if(!sub){
      failed++;
      await env.DB.prepare("update notification_jobs set status='failed',attempts=attempts+1 where id=?1").bind(row.id).run();
      continue;
    }
    const data=typeof row.shared_payload==="string"?row.shared_payload:JSON.stringify(row.shared_payload||{title:"Aafnai Patro",body:"You have a reminder.",url:"/"});
    try{
      const message:PushMessage={data,options:{ttl:3600,urgency:"normal" as any}};
      const payload=await buildPushPayload(message,sub,keys);
      const response=await fetch(sub.endpoint,payload);
      if(response.ok){
        sent++;
        await env.DB.batch([
          env.DB.prepare("update notification_jobs set status='sent',attempts=attempts+1,next_attempt_at=null where id=?1").bind(row.id),
          env.DB.prepare("update push_subscriptions set last_success_at=datetime('now') where device_id=?1").bind(row.device_id)
        ]);
      }else if(response.status===404||response.status===410){
        failed++;
        await env.DB.batch([
          env.DB.prepare("update notification_jobs set status='failed',attempts=attempts+1 where id=?1").bind(row.id),
          env.DB.prepare("delete from push_subscriptions where device_id=?1").bind(row.device_id)
        ]);
      }else{
        failed++;
        const attempts=Number(row.attempts||0)+1,delay=Math.min(3600,Math.pow(2,Math.min(attempts,8))*60);
        await env.DB.prepare("update notification_jobs set attempts=?2,next_attempt_at=datetime('now',?3) where id=?1").bind(row.id,attempts,"+"+delay+" seconds").run();
        await notePushDue(env,Date.now()+delay*1000);
      }
    }catch{
      failed++;
      const attempts=Number(row.attempts||0)+1,delay=Math.min(3600,Math.pow(2,Math.min(attempts,8))*60);
      await env.DB.prepare("update notification_jobs set attempts=?2,next_attempt_at=datetime('now',?3) where id=?1").bind(row.id,attempts,"+"+delay+" seconds").run();
      await notePushDue(env,Date.now()+delay*1000);
    }
  }
  await refreshPushGate(env);
  return {ok:true,processed:(rows.results||[]).length,sent,failed};
}
async function subscribe(request:Request,env:PushEnv,session:any){
  let body:any;try{body=await parseBody(request,64*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
  if(request.method==="DELETE"){
    const deviceId=String(body?.device_id||"");
    if(!deviceId)return json({ok:false,error:"device_id_required"},400);
    const own=await env.DB.prepare("select device_id from push_subscriptions where device_id=?1 and user_id=?2").bind(deviceId,session.user_id).first();
    if(!own)return json({ok:false,error:"subscription_not_found"},404);
    await env.DB.batch([
      env.DB.prepare("delete from notification_jobs where device_id=?1").bind(deviceId),
      env.DB.prepare("delete from push_subscriptions where device_id=?1").bind(deviceId)
    ]);
    await invalidatePushGate(env);
    return json({ok:true,deleted:true});
  }
  const sub=body?.subscription||body;
  const endpoint=String(sub?.endpoint||"");
  const keys=sub?.keys||{};
  if(!/^https:\/\//i.test(endpoint)||typeof keys.p256dh!=="string"||typeof keys.auth!=="string")return json({ok:false,error:"invalid_push_subscription"},400);
  const deviceId=String(body?.device_id||crypto.randomUUID()),secret=token(),secretHash=await sha256(secret);
  const ua=String(body?.user_agent_family||request.headers.get("user-agent")||"unknown").slice(0,240);
  const tz=String(body?.timezone||"Asia/Kathmandu").slice(0,64);
  const quiet=body?.quiet_hours&&typeof body.quiet_hours==="object"?JSON.stringify(body.quiet_hours):null;
  const stored=await env.DB.prepare(
    "insert into push_subscriptions(device_id,device_secret_hash,user_id,endpoint,keys,user_agent_family,timezone,quiet_hours,created_at) values(?1,?2,?3,?4,?5,?6,?7,?8,datetime('now')) on conflict(endpoint) do update set user_id=excluded.user_id,keys=excluded.keys,user_agent_family=excluded.user_agent_family,timezone=excluded.timezone,quiet_hours=excluded.quiet_hours returning device_id"
  ).bind(deviceId,secretHash,session.user_id,endpoint,JSON.stringify(keys),ua,tz,quiet).first<{device_id:string}>();
  return json({ok:true,device_id:stored?.device_id||deviceId,device_secret:secret});
}
async function jobs(request:Request,env:PushEnv,session:any){
  if(request.method==="GET"){
    const rows=await env.DB.prepare(
      "select j.id,j.device_id,j.fire_at_utc,j.job_ref,j.category,j.status,j.attempts,j.next_attempt_at,j.shared_payload,j.created_at from notification_jobs j join push_subscriptions s on s.device_id=j.device_id where s.user_id=?1 order by j.fire_at_utc desc limit 200"
    ).bind(session.user_id).all();
    return json({ok:true,jobs:(rows.results||[]).map((r:any)=>({...r,shared_payload:typeof r.shared_payload==="string"?JSON.parse(r.shared_payload||"{}"):r.shared_payload}))});
  }
  let body:any;try{body=await parseBody(request,64*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
  if(request.method==="DELETE"){
    const id=String(body?.id||"");
    const row=await env.DB.prepare("select j.id from notification_jobs j join push_subscriptions s on s.device_id=j.device_id where j.id=?1 and s.user_id=?2").bind(id,session.user_id).first();
    if(!row)return json({ok:false,error:"job_not_found"},404);
    await env.DB.prepare("delete from notification_jobs where id=?1").bind(id).run();
    await invalidatePushGate(env);
    return json({ok:true,deleted:true});
  }
  const deviceId=String(body?.device_id||"");
  const own=await env.DB.prepare("select device_id from push_subscriptions where device_id=?1 and user_id=?2").bind(deviceId,session.user_id).first();
  if(!own)return json({ok:false,error:"subscription_not_found"},404);
  const fire=String(body?.fire_at_utc||"");const ms=Date.parse(fire);
  if(!Number.isFinite(ms)||ms<Date.now()-60_000||ms>Date.now()+366*86400_000)return json({ok:false,error:"invalid_fire_at"},400);
  const id=crypto.randomUUID(),jobRef=String(body?.job_ref||id).slice(0,160),category=String(body?.category||"reminder").slice(0,60);
  const payload=body?.payload&&typeof body.payload==="object"?body.payload:{title:"Aafnai Patro",body:"Reminder",url:"/"};
  await env.DB.prepare("insert into notification_jobs(id,device_id,fire_at_utc,job_ref,category,status,attempts,shared_payload,created_at) values(?1,?2,?3,?4,?5,'pending',0,?6,datetime('now'))")
    .bind(id,deviceId,new Date(ms).toISOString(),jobRef,category,JSON.stringify(payload)).run();
  await notePushDue(env,ms);
  return json({ok:true,id,status:"pending",fire_at_utc:new Date(ms).toISOString()});
}
export async function pushResponse(request:Request,env:PushEnv):Promise<Response|null>{
  const path=new URL(request.url).pathname;
  if(path==="/api/push/vapid"&&request.method==="GET")return env.VAPID_PUBLIC_KEY?json({ok:true,publicKey:env.VAPID_PUBLIC_KEY}):json({ok:false,error:"vapid_not_configured"},503);
  if(path!=="/api/push/subscribe"&&path!=="/api/push/jobs")return null;
  if(!env.DB)return json({ok:false,error:"d1_unavailable"},503);
  const session=await currentSession(request,env);if(!session)return json({ok:false,error:"authentication_required"},401);
  if(path==="/api/push/subscribe"&&["POST","DELETE"].includes(request.method))return subscribe(request,env,session);
  if(path==="/api/push/jobs"&&["GET","POST","DELETE"].includes(request.method))return jobs(request,env,session);
  return json({ok:false,error:"method_not_allowed"},405);
}