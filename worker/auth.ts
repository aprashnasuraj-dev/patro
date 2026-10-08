import { createRemoteJWKSet, jwtVerify } from "jose";

export type AuthEnv={
  DB?:any;
  GOOGLE_CLIENT_ID?:string;
};

type GoogleTokenInfo={
  sub?:string;
  aud?:string;
  iss?:string;
  exp?:string;
  email?:string;
  email_verified?:boolean;
  name?:string;
  picture?:string;
};

const COOKIE="mp_session";
const NONCE_COOKIE="mp_google_nonce";
const GOOGLE_KEYS=createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"),{timeoutDuration:8000,cacheMaxAge:3600000});
const SESSION_DAYS=30;
const DAY=86_400_000;
const MAX_STATE_BYTES=512*1024;
const AUTH_SCHEMA_READY=new WeakMap<object,Promise<void>>();

/**
 * The account tables are small and deterministic. Keep auth deployable even when the
 * GitHub deployment token can deploy Workers but cannot call the D1 migrations API.
 * DDL is idempotent and runs at most once per Worker isolate/DB binding.
 */
export async function ensureAuthSchema(env:AuthEnv){
  if(!env.DB)return;
  const key=env.DB as object;
  let ready=AUTH_SCHEMA_READY.get(key);
  if(!ready){
    ready=(async()=>{
      const statements=[
        `create table if not exists app_users (id text primary key,provider text not null,provider_subject text not null,email text,email_verified integer not null default 0,display_name text,picture_url text,created_at text not null default (datetime('now')),updated_at text not null default (datetime('now')),unique(provider,provider_subject))`,
        `create table if not exists auth_sessions (id text primary key,user_id text not null references app_users(id) on delete cascade,token_hash text not null unique,expires_at text not null,created_at text not null default (datetime('now')),last_seen_at text not null default (datetime('now')))`,
        `create index if not exists auth_sessions_user_idx on auth_sessions(user_id)`,
        `create index if not exists auth_sessions_expiry_idx on auth_sessions(expires_at)`,
        `create table if not exists user_calendar_state (user_id text primary key references app_users(id) on delete cascade,notes text not null default '{}',events text not null default '[]',calendars text not null default '[]',preferences text not null default '{}',feedback text not null default '[]',updated_at text not null default (datetime('now')),revision integer not null default 0)`,
        `create table if not exists user_community_preferences (user_id text primary key references app_users(id) on delete cascade,communities text not null default '[]',updated_at text not null default (datetime('now')))`
      ];
      for(const sql of statements)await env.DB.prepare(sql).bind().run();
      const info=await env.DB.prepare("pragma table_info(user_calendar_state)").bind().all();
      const columns=Array.isArray(info?.results)?info.results:[];
      if(!columns.some((row:any)=>String(row?.name)==="revision")){
        try{await env.DB.prepare("alter table user_calendar_state add column revision integer not null default 0").bind().run();}
        catch(error){if(!/duplicate column/i.test(String((error as Error)?.message||error)))throw error;}
      }
    })().catch((error)=>{AUTH_SCHEMA_READY.delete(key);throw error;});
    AUTH_SCHEMA_READY.set(key,ready);
  }
  await ready;
}

function json(body:any,status=200,extra:Record<string,string>={}){
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...extra}});
}
function cookieValue(request:Request,name:string){
  const raw=request.headers.get("cookie")||"";
  for(const part of raw.split(";")){
    const i=part.indexOf("="); if(i<0)continue;
    if(part.slice(0,i).trim()===name){try{return decodeURIComponent(part.slice(i+1).trim())}catch{return ""}}
  }
  return "";
}
function base64Url(bytes:Uint8Array){
  let raw="";for(const b of bytes)raw+=String.fromCharCode(b);
  return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function token(){return base64Url(crypto.getRandomValues(new Uint8Array(32)));}
export async function sha256(value:string){
  const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
  return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function setSessionCookie(value:string,secure:boolean){
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS*86400}${secure?"; Secure":""}`;
}
function clearSessionCookie(secure:boolean){
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?"; Secure":""}`;
}
function markerCookie(secure:boolean,maxAge=SESSION_DAYS*86400){return `aap_signed_in=${maxAge>0?'1':''}; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`;}
function clearAccountResponse(response:Response,secure:boolean){response.headers.append('set-cookie',markerCookie(secure,0));return response;}
async function verifyGoogleCredential(credential:string,env:AuthEnv,nonce:string){
  if(!env.GOOGLE_CLIENT_ID)throw new Error("google_client_id_not_configured");
  if(!credential||credential.length>8192)throw new Error("invalid_google_credential");
  const {payload}=await jwtVerify(credential,GOOGLE_KEYS,{audience:env.GOOGLE_CLIENT_ID,issuer:["accounts.google.com","https://accounts.google.com"],algorithms:["RS256"],requiredClaims:["sub","exp","iat","nonce"]});
  if(!nonce||payload.nonce!==nonce)throw new Error("google_nonce_mismatch");
  if(payload.email_verified!==true)throw new Error("google_email_not_verified");
  const info=payload as unknown as GoogleTokenInfo;
  return info;
}
export async function currentSession(request:Request,env:AuthEnv){
  if(!env.DB)return null;
  await ensureAuthSchema(env);
  const raw=cookieValue(request,COOKIE); if(!raw)return null;
  const hash=await sha256(raw);
  const row=await env.DB.prepare(
    "select s.id as session_id,s.user_id,s.expires_at,u.email,u.display_name,u.picture_url,u.provider_subject from auth_sessions s join app_users u on u.id=s.user_id where s.token_hash=?1 limit 1"
  ).bind(hash).first();
  if(!row)return null;
  if(!Number.isFinite(Date.parse(String(row.expires_at)))||Date.parse(String(row.expires_at))<=Date.now()){
    await env.DB.prepare("delete from auth_sessions where id=?1").bind(row.session_id).run();
    return null;
  }
  env.DB.prepare("update auth_sessions set last_seen_at=datetime('now') where id=?1").bind(row.session_id).run().catch(()=>{});
  return row;
}
export function publicUser(row:any){
  return {id:String(row.user_id),email:row.email||null,name:row.display_name||null,picture:row.picture_url||null,provider:"google"};
}
async function ensureDefaultState(env:AuthEnv,userId:string){
  await env.DB.prepare(
    "insert into user_calendar_state(user_id) values(?1) on conflict(user_id) do nothing"
  ).bind(userId).run();
  await env.DB.prepare(
    "insert into user_community_preferences(user_id) values(?1) on conflict(user_id) do nothing"
  ).bind(userId).run();
}
export async function parseBody(request:Request,max=MAX_STATE_BYTES){
  const text=await request.text();
  if(new TextEncoder().encode(text).byteLength>max)throw new Error("payload_too_large");
  return text?JSON.parse(text):{};
}
export function safeJson(value:any,fallback:any){
  if(typeof value!=="string")return value??fallback;
  try{return JSON.parse(value)}catch{return fallback}
}
async function stateResponse(request:Request,env:AuthEnv,session:any){
  if(request.method==="GET"){
    await ensureDefaultState(env,session.user_id);
    const row=await env.DB.prepare("select notes,events,calendars,preferences,feedback,updated_at,revision from user_calendar_state where user_id=?1").bind(session.user_id).first();
    return json({ok:true,user:publicUser(session),state:{
      notes:safeJson(row?.notes,{}),events:safeJson(row?.events,[]),calendars:safeJson(row?.calendars,[]),
      preferences:safeJson(row?.preferences,{}),feedback:safeJson(row?.feedback,[])
    },updated_at:row?.updated_at||null,revision:Number(row?.revision||0)});
  }
  if(request.method==="PATCH"){
    let body:any;try{body=await parseBody(request)}catch{return json({ok:false,error:"invalid_or_oversized_state"},400)}
    if(body?.account_id!==String(session.user_id))return json({ok:false,error:"account_mismatch"},409);
    if(!Number.isSafeInteger(body?.revision)||body.revision<0||!body.life||typeof body.life!=="object"||Array.isArray(body.life))return json({ok:false,error:"invalid_state"},400);
    await ensureDefaultState(env,session.user_id);
    const result=await env.DB.prepare("update user_calendar_state set preferences=json_set(preferences,'$.life_tools',json(?1)),revision=revision+1,updated_at=datetime('now') where user_id=?2 and revision=?3").bind(JSON.stringify(body.life),session.user_id,body.revision).run();
    return Number(result.meta?.changes)===1?json({ok:true,saved:true,revision:body.revision+1}):json({ok:false,error:"state_conflict"},409);
  }
  if(request.method==="PUT"){
    let body:any;try{body=await parseBody(request)}catch(e){return json({ok:false,error:String((e as Error).message||e)},400)}
    const state=body?.state&&typeof body.state==="object"?body.state:body;
    const normalized={
      notes:state.notes&&typeof state.notes==="object"?state.notes:{},
      events:Array.isArray(state.events)?state.events:[],
      calendars:Array.isArray(state.calendars)?state.calendars:[],
      preferences:state.preferences&&typeof state.preferences==="object"?state.preferences:{},
      feedback:Array.isArray(state.feedback)?state.feedback:[]
    };
    await env.DB.prepare(
      "insert into user_calendar_state(user_id,notes,events,calendars,preferences,feedback,updated_at) values(?1,?2,?3,?4,?5,?6,datetime('now')) on conflict(user_id) do update set notes=excluded.notes,events=excluded.events,calendars=excluded.calendars,preferences=excluded.preferences,feedback=excluded.feedback,revision=user_calendar_state.revision+1,updated_at=datetime('now')"
    ).bind(session.user_id,JSON.stringify(normalized.notes),JSON.stringify(normalized.events),JSON.stringify(normalized.calendars),JSON.stringify(normalized.preferences),JSON.stringify(normalized.feedback)).run();
    return json({ok:true,saved:true,updated_at:new Date().toISOString()});
  }
  return json({ok:false,error:"method_not_allowed"},405);
}
async function communityPreferences(request:Request,env:AuthEnv,session:any){
  if(request.method==="GET"){
    await ensureDefaultState(env,session.user_id);
    const row=await env.DB.prepare("select communities,updated_at from user_community_preferences where user_id=?1").bind(session.user_id).first();
    return json({ok:true,communities:safeJson(row?.communities,[]),updated_at:row?.updated_at||null});
  }
  if(request.method==="PUT"){
    let body:any;try{body=await parseBody(request,32*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
    const communities=Array.isArray(body?.communities)?[...new Set(body.communities.map(String))].slice(0,12):[];
    await env.DB.prepare(
      "insert into user_community_preferences(user_id,communities,updated_at) values(?1,?2,datetime('now')) on conflict(user_id) do update set communities=excluded.communities,updated_at=datetime('now')"
    ).bind(session.user_id,JSON.stringify(communities)).run();
    return json({ok:true,communities});
  }
  return json({ok:false,error:"method_not_allowed"},405);
}
async function myData(request:Request,env:AuthEnv,session:any){
  if(request.method==="GET"){
    const [state,communities,families,push,ics]=await Promise.all([
      env.DB.prepare("select * from user_calendar_state where user_id=?1").bind(session.user_id).first(),
      env.DB.prepare("select * from user_community_preferences where user_id=?1").bind(session.user_id).first(),
      env.DB.prepare("select f.id,f.name,m.role,m.display_name,m.timezone,m.joined_at from family_members m join families f on f.id=m.family_id where m.user_id=?1 order by m.joined_at").bind(session.user_id).all(),
      env.DB.prepare("select device_id,endpoint,user_agent_family,timezone,quiet_hours,created_at,last_success_at from push_subscriptions where user_id=?1").bind(session.user_id).all(),
      env.DB.prepare("select created_at from personal_ics_tokens where user_id=?1").bind(session.user_id).first()
    ]);
    return json({ok:true,user:publicUser(session),calendar_state:state?{
      notes:safeJson(state.notes,{}),events:safeJson(state.events,[]),calendars:safeJson(state.calendars,[]),
      preferences:safeJson(state.preferences,{}),feedback:safeJson(state.feedback,[]),updated_at:state.updated_at
    }:null,community_preferences:communities?{communities:safeJson(communities.communities,[]),updated_at:communities.updated_at}:null,
      families:families.results||[],push_subscriptions:push.results||[],personal_ics:ics?{created_at:ics.created_at}:null});
  }
  if(request.method==="DELETE"){
    const uid=session.user_id;
    await env.DB.batch([
      env.DB.prepare("delete from notification_jobs where device_id in (select device_id from push_subscriptions where user_id=?1)").bind(uid),
      env.DB.prepare("delete from push_subscriptions where user_id=?1").bind(uid),
      env.DB.prepare("delete from personal_ics_tokens where user_id=?1").bind(uid),
      env.DB.prepare("delete from user_community_preferences where user_id=?1").bind(uid),
      env.DB.prepare("delete from family_members where user_id=?1").bind(uid),
      env.DB.prepare("delete from user_calendar_state where user_id=?1").bind(uid),
      env.DB.prepare("delete from auth_sessions where user_id=?1").bind(uid),
      env.DB.prepare("delete from app_users where id=?1").bind(uid)
    ]);
    return clearAccountResponse(json({ok:true,deleted:true},200,{"set-cookie":clearSessionCookie(new URL(request.url).protocol==="https:")}),new URL(request.url).protocol==="https:");
  }
  return json({ok:false,error:"method_not_allowed"},405);
}

export async function authResponse(request:Request,env:AuthEnv):Promise<Response|null>{
  const url=new URL(request.url),path=url.pathname;
  const accountRoute=path.startsWith("/api/v1/auth/")||["/api/v1/me/state","/api/v1/community-preferences","/api/v1/my-data","/api/my-data"].includes(path);
  if(accountRoute&&!["GET","HEAD"].includes(request.method)&&request.headers.get("origin")!==url.origin)return json({ok:false,error:"same_origin_required"},403);
  if(accountRoute&&env.DB){
    try{await ensureAuthSchema(env)}catch(error){console.error("auth schema bootstrap failed",error);return json({ok:false,error:"account_schema_unavailable"},503)}
  }
  if(path==="/api/v1/auth/challenge"&&request.method==="POST"){
    if(!env.DB||!env.GOOGLE_CLIENT_ID)return json({ok:false,error:"google_sign_in_unavailable"},503);
    const nonce=token();
    return json({ok:true,nonce},200,{"set-cookie":`${NONCE_COOKIE}=${nonce}; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=900${url.protocol==="https:"?"; Secure":""}`});
  }
  if(path==="/api/v1/auth/config"&&request.method==="GET"){
    return json({ok:true,google:{enabled:!!env.GOOGLE_CLIENT_ID&&!!env.DB,client_id:env.GOOGLE_CLIENT_ID||null}});
  }
  if(path==="/api/v1/auth/google"&&request.method==="POST"){
    if(!env.DB)return json({ok:false,error:"d1_unavailable"},503);
    let body:any;try{body=await parseBody(request,16*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
    try{
      const info=await verifyGoogleCredential(String(body?.credential||""),env,cookieValue(request,NONCE_COOKIE));
      let user=await env.DB.prepare("select id from app_users where provider='google' and provider_subject=?1 limit 1").bind(info.sub).first();
      const userId=String(user?.id||crypto.randomUUID());
      await env.DB.prepare(
        "insert into app_users(id,provider,provider_subject,email,email_verified,display_name,picture_url,created_at,updated_at) values(?1,'google',?2,?3,1,?4,?5,datetime('now'),datetime('now')) on conflict(provider,provider_subject) do update set email=excluded.email,email_verified=1,display_name=excluded.display_name,picture_url=excluded.picture_url,updated_at=datetime('now')"
      ).bind(userId,info.sub,info.email||null,info.name||null,info.picture||null).run();
      user=await env.DB.prepare("select id as user_id,email,display_name,picture_url,provider_subject from app_users where provider='google' and provider_subject=?1").bind(info.sub).first();
      await ensureDefaultState(env,user.user_id);
      const raw=token(),hash=await sha256(raw),sessionId=crypto.randomUUID();
      const expires=new Date(Date.now()+SESSION_DAYS*DAY).toISOString();
      await env.DB.prepare("insert into auth_sessions(id,user_id,token_hash,expires_at) values(?1,?2,?3,?4)").bind(sessionId,user.user_id,hash,expires).run();
      const response=json({ok:true,user:publicUser(user),expires_at:expires},200,{"set-cookie":setSessionCookie(raw,url.protocol==="https:")});
      response.headers.append("set-cookie",markerCookie(url.protocol==="https:"));
      response.headers.append("set-cookie",`${NONCE_COOKIE}=; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=0${url.protocol==="https:"?"; Secure":""}`);
      return response;
    }catch(error){
      return json({ok:false,error:"google_sign_in_failed"},401);
    }
  }
  if(path==="/api/v1/auth/me"&&request.method==="GET"){
    const session=await currentSession(request,env);
    const response=session?json({ok:true,authenticated:true,user:publicUser(session)}):json({ok:true,authenticated:false,user:null});
    response.headers.append("set-cookie",markerCookie(url.protocol==="https:",session?Math.max(0,Math.floor((Date.parse(String(session.expires_at))-Date.now())/1000)):0));
    return response;
  }
  if(path==="/api/v1/auth/logout"&&request.method==="POST"){
    if(env.DB){const raw=cookieValue(request,COOKIE);if(raw){const hash=await sha256(raw);await env.DB.prepare("delete from auth_sessions where token_hash=?1").bind(hash).run().catch(()=>{});}}
    return clearAccountResponse(json({ok:true},200,{"set-cookie":clearSessionCookie(url.protocol==="https:")}),url.protocol==="https:");
  }

  const needsAuth=path==="/api/v1/me/state"||path==="/api/v1/community-preferences"||path==="/api/v1/my-data"||path==="/api/my-data";
  if(!needsAuth)return null;
  if(!env.DB)return json({ok:false,error:"d1_unavailable"},503);
  const session=await currentSession(request,env);
  if(!session)return json({ok:false,error:"authentication_required"},401);
  if(path==="/api/v1/me/state")return stateResponse(request,env,session);
  if(path==="/api/v1/community-preferences")return communityPreferences(request,env,session);
  return myData(request,env,session);
}
