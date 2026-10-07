import { tithiAlarmUtc } from "../src/tithiAlarm";
import { currentSession, parseBody, safeJson, sha256, type AuthEnv } from "./auth";
import { nextOccurrences, type TithiRule } from "../src/patro-tools/tithi-events/engine";
import { KATHMANDU } from "../src/patro-tools/core/types";

type Env=AuthEnv & { DB?:any };

function json(body:any,status=200,extra:Record<string,string>={}){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...extra}});
}
function randomToken(bytes=32){
  const data=crypto.getRandomValues(new Uint8Array(bytes));let raw="";for(const b of data)raw+=String.fromCharCode(b);
  return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function validDate(value:any){return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+"T00:00:00Z"));}
function icsEsc(value:any){return String(value??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");}
function nextDate(value:string){const d=new Date(value+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
async function membership(env:Env,userId:string,familyId:string){
  return env.DB.prepare("select family_id,user_id,role,display_name,timezone,joined_at from family_members where family_id=?1 and user_id=?2 limit 1").bind(familyId,userId).first();
}
async function familyState(env:Env,userId:string){
  const memberships=await env.DB.prepare(
    "select f.id,f.name,f.created_by,f.created_at,m.role,m.display_name,m.timezone,m.joined_at from family_members m join families f on f.id=m.family_id where m.user_id=?1 order by m.joined_at"
  ).bind(userId).all();
  const families=[];
  for(const row of memberships.results||[]){
    const [members,events]=await Promise.all([
      env.DB.prepare("select user_id,role,display_name,timezone,joined_at from family_members where family_id=?1 order by joined_at").bind(row.id).all(),
      env.DB.prepare("select id,created_by,title,event_date,payload,created_at,updated_at from family_events where family_id=?1 order by event_date,id limit 500").bind(row.id).all()
    ]);
    families.push({...row,members:members.results||[],events:(events.results||[]).map((e:any)=>({...e,payload:safeJson(e.payload,{})}))});
  }
  return families;
}
async function createFamily(request:Request,env:Env,session:any){
  let body:any;try{body=await parseBody(request,64*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
  const name=String(body?.name||"").trim().slice(0,100);
  if(!name)return json({ok:false,error:"family_name_required"},400);
  const id=crypto.randomUUID(),display=String(body?.display_name||session.display_name||"").trim().slice(0,100)||null;
  const tz=String(body?.timezone||"Asia/Kathmandu").slice(0,64);
  await env.DB.batch([
    env.DB.prepare("insert into families(id,name,created_by) values(?1,?2,?3)").bind(id,name,session.user_id),
    env.DB.prepare("insert into family_members(family_id,user_id,role,display_name,timezone) values(?1,?2,'owner',?3,?4)").bind(id,session.user_id,display,tz)
  ]);
  return json({ok:true,family_id:id,name});
}
async function inviteFamily(request:Request,env:Env,session:any){
  let body:any;try{body=await parseBody(request,32*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
  const familyId=String(body?.family_id||"");
  const member=await membership(env,session.user_id,familyId);
  if(!member||!["owner","admin"].includes(String(member.role)))return json({ok:false,error:"family_admin_required"},403);
  const raw=randomToken(),hash=await sha256(raw),id=crypto.randomUUID();
  const hours=Math.min(168,Math.max(1,Number(body?.expires_hours||72)));
  const maxUses=Math.min(20,Math.max(1,Number(body?.max_uses||1)));
  const role=String(body?.role||"member")==="admin"?"admin":"member";
  const expires=new Date(Date.now()+hours*3600_000).toISOString();
  await env.DB.prepare("insert into family_invites(id,family_id,token_hash,role,expires_at,max_uses,created_by) values(?1,?2,?3,?4,?5,?6,?7)")
    .bind(id,familyId,hash,role,expires,maxUses,session.user_id).run();
  return json({ok:true,invite_id:id,token:raw,path:"/family/join?token="+encodeURIComponent(raw),expires_at:expires,max_uses:maxUses});
}
async function joinFamily(request:Request,env:Env,session:any){
  let body:any;try{body=await parseBody(request,32*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
  const raw=String(body?.token||"");if(raw.length<20)return json({ok:false,error:"invalid_invite"},400);
  const hash=await sha256(raw);
  const invite=await env.DB.prepare("select id,family_id,role,expires_at,max_uses,uses from family_invites where token_hash=?1 limit 1").bind(hash).first();
  if(!invite||Date.parse(String(invite.expires_at))<=Date.now()||Number(invite.uses)>=Number(invite.max_uses))return json({ok:false,error:"invite_expired_or_invalid"},404);
  const display=String(body?.display_name||session.display_name||"").trim().slice(0,100)||null,tz=String(body?.timezone||"Asia/Kathmandu").slice(0,64);
  await env.DB.batch([
    env.DB.prepare("insert into family_members(family_id,user_id,role,display_name,timezone) values(?1,?2,?3,?4,?5) on conflict(family_id,user_id) do update set display_name=excluded.display_name,timezone=excluded.timezone").bind(invite.family_id,session.user_id,invite.role,display,tz),
    env.DB.prepare("update family_invites set uses=uses+1 where id=?1").bind(invite.id)
  ]);
  return json({ok:true,family_id:invite.family_id,role:invite.role});
}
async function familyEvent(request:Request,env:Env,session:any){
  let body:any;try{body=await parseBody(request,128*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
  const familyId=String(body?.family_id||"");
  const member=await membership(env,session.user_id,familyId);if(!member)return json({ok:false,error:"family_membership_required"},403);
  if(request.method==="DELETE"){
    const id=String(body?.id||"");if(!id)return json({ok:false,error:"event_id_required"},400);
    const event=await env.DB.prepare("select created_by from family_events where id=?1 and family_id=?2").bind(id,familyId).first();
    if(!event)return json({ok:false,error:"event_not_found"},404);
    if(String(event.created_by)!==String(session.user_id)&&!["owner","admin"].includes(String(member.role)))return json({ok:false,error:"event_delete_forbidden"},403);
    await env.DB.prepare("delete from family_events where id=?1").bind(id).run();return json({ok:true,deleted:true,id});
  }
  const title=String(body?.title||"").trim().slice(0,180),date=String(body?.event_date||body?.date||"");
  if(!title||!validDate(date))return json({ok:false,error:"title_and_valid_event_date_required"},400);
  const payload=body?.payload&&typeof body.payload==="object"?body.payload:{};
  const id=String(body?.id||crypto.randomUUID());
  await env.DB.prepare(
    "insert into family_events(id,family_id,created_by,title,event_date,payload,created_at,updated_at) values(?1,?2,?3,?4,?5,?6,datetime('now'),datetime('now')) on conflict(id) do update set title=excluded.title,event_date=excluded.event_date,payload=excluded.payload,updated_at=datetime('now')"
  ).bind(id,familyId,session.user_id,title,date,JSON.stringify(payload)).run();
  return json({ok:true,id,family_id:familyId,title,event_date:date,payload});
}
async function issueIcsToken(env:Env,session:any){
  const raw=randomToken(),hash=await sha256(raw);
  await env.DB.prepare("insert into personal_ics_tokens(user_id,token_hash,created_at) values(?1,?2,datetime('now')) on conflict(user_id) do update set token_hash=excluded.token_hash,created_at=datetime('now')")
    .bind(session.user_id,hash).run();
  return json({ok:true,token:raw,path:"/api/v1/tools/tithi-feed.ics?token="+encodeURIComponent(raw)});
}
async function personalTithiFeed(request:Request,env:Env){
  const raw=new URL(request.url).searchParams.get("token")||"";if(raw.length<20)return json({ok:false,error:"invalid_feed_token"},400);
  const hash=await sha256(raw);
  const tokenRow=await env.DB.prepare("select user_id from personal_ics_tokens where token_hash=?1 limit 1").bind(hash).first();
  if(!tokenRow)return json({ok:false,error:"feed_not_found"},404);
  const state=await env.DB.prepare("select preferences from user_calendar_state where user_id=?1 limit 1").bind(tokenRow.user_id).first();
  const prefs=safeJson(state?.preferences,{});
  const life=prefs&&typeof prefs.life_tools==="object"?prefs.life_tools:{};
  const events=Array.isArray(life.tithiEvents)?life.tithiEvents.slice(0,30):[];
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Aafnai Patro//Private Tithi Feed//NE","CALSCALE:GREGORIAN","X-WR-CALNAME:आफ्नै पात्रो · तिथि रिमाइन्डर","X-WR-TIMEZONE:Asia/Kathmandu","REFRESH-INTERVAL;VALUE=DURATION:P1D"];
  for(const event of events){
    const rule=event?.rule as TithiRule|undefined;if(!rule||!event?.id||!event?.title)continue;
    let occurrences;try{occurrences=nextOccurrences(rule,today,4,KATHMANDU)}catch{continue}
    for(const occurrence of occurrences){
      lines.push("BEGIN:VEVENT","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z"),"UID:"+icsEsc(event.id+"-"+occurrence.date+"@meropatro"),"DTSTART;VALUE=DATE:"+occurrence.date.replace(/-/g,""),"DTEND;VALUE=DATE:"+nextDate(occurrence.date).replace(/-/g,""),"SUMMARY:"+icsEsc(event.title),"DESCRIPTION:"+icsEsc("तिथि रिमाइन्डर · Aafnai Patro"));
      const reminders=Array.isArray(event.remindDaysBefore)?event.remindDaysBefore:[];
      for(const day of reminders.filter((x:any)=>Number.isInteger(x)&&x>=0&&x<=365).slice(0,12))lines.push("BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsEsc(event.title),"TRIGGER;VALUE=DATE-TIME:"+tithiAlarmUtc(occurrence.date,String(event.remindAt||"07:00"),day),"END:VALARM");
      lines.push("END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n")+"\r\n",{headers:{"content-type":"text/calendar; charset=utf-8","cache-control":"private, no-store","content-disposition":'inline; filename="aafnai-patro-tithi.ics"',"x-robots-tag":"noindex, nofollow"}});
}

export async function privateResponse(request:Request,env:Env):Promise<Response|null>{
  const url=new URL(request.url),path=url.pathname;
  if(path==="/api/v1/tools/tithi-feed.ics"&&request.method==="GET"){
    if(!env.DB)return json({ok:false,error:"d1_unavailable"},503);
    return personalTithiFeed(request,env);
  }
  const privatePaths=new Set(["/api/family/state","/api/family/create","/api/family/invite","/api/family/join","/api/family/event","/api/ics/token","/api/v1/tools/tithi-feed-token"]);
  if(!privatePaths.has(path))return null;
  if(!env.DB)return json({ok:false,error:"d1_unavailable"},503);
  const session=await currentSession(request,env);if(!session)return json({ok:false,error:"authentication_required"},401);
  if(path==="/api/family/state"&&request.method==="GET")return json({ok:true,families:await familyState(env,session.user_id)});
  if(path==="/api/family/create"&&request.method==="POST")return createFamily(request,env,session);
  if(path==="/api/family/invite"&&request.method==="POST")return inviteFamily(request,env,session);
  if(path==="/api/family/join"&&request.method==="POST")return joinFamily(request,env,session);
  if(path==="/api/family/event"&&["POST","PUT","DELETE"].includes(request.method))return familyEvent(request,env,session);
  if((path==="/api/ics/token"||path==="/api/v1/tools/tithi-feed-token")&&request.method==="POST")return issueIcsToken(env,session);
  return json({ok:false,error:"method_not_allowed"},405);
}
