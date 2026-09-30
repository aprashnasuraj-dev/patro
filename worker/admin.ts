import { currentSession, parseBody, type AuthEnv } from "./auth";

type Env=AuthEnv & {DB?:any;ADMIN_EMAILS?:string;ADMIN_GOOGLE_SUBJECTS?:string};

function json(body:any,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}
function list(value?:string){return new Set(String(value||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean))}
function validDate(v:any){return typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+"T00:00:00Z"))}
async function adminSession(request:Request,env:Env){
  const s=await currentSession(request,env);if(!s)return null;
  const subjects=list(env.ADMIN_GOOGLE_SUBJECTS),emails=list(env.ADMIN_EMAILS);
  if(subjects.has(String(s.provider_subject||"").toLowerCase())||emails.has(String(s.email||"").toLowerCase()))return s;
  return null;
}
async function audit(env:Env,userId:string,action:string,target:string,payload:any){
  try{await env.DB.prepare("insert into admin_audit_log(id,user_id,action,target,payload) values(?1,?2,?3,?4,?5)").bind(crypto.randomUUID(),userId,action,target,JSON.stringify(payload??{})).run()}catch{}
}
async function communityOverride(request:Request,env:Env,s:any){
  const url=new URL(request.url);
  if(request.method==="GET"){
    const suite=url.searchParams.get("suite"),year=url.searchParams.get("year");
    let sql="select suite,festival_id,year,start_ad,end_ad,note,updated_by,updated_at from community_overrides",binds:any[]=[];
    const where:string[]=[];if(suite){where.push("suite=?"+(binds.length+1));binds.push(suite)}if(year){where.push("year=?"+(binds.length+1));binds.push(Number(year))}
    if(where.length)sql+=" where "+where.join(" and ");sql+=" order by year desc,suite,festival_id limit 500";
    let q=env.DB.prepare(sql);if(binds.length)q=q.bind(...binds);return json({ok:true,items:(await q.all()).results||[]});
  }
  let body:any;try{body=await parseBody(request,64*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
  const suite=String(body?.suite||""),festivalId=String(body?.festival_id||""),year=Number(body?.year),start=String(body?.start_ad||""),end=String(body?.end_ad||start),note=body?.note==null?null:String(body.note).slice(0,500);
  if(!["lhosar","tharu","mithila","kirat","hijri"].includes(suite)||!festivalId||!Number.isInteger(year)||year<2020||year>2050||!validDate(start)||!validDate(end)||end<start)return json({ok:false,error:"invalid_override"},400);
  if(request.method==="DELETE"){
    await env.DB.prepare("delete from community_overrides where suite=?1 and festival_id=?2 and year=?3").bind(suite,festivalId,year).run();await audit(env,s.user_id,"delete","community_override",{suite,festival_id:festivalId,year});return json({ok:true,deleted:true});
  }
  await env.DB.prepare("insert into community_overrides(suite,festival_id,year,start_ad,end_ad,note,updated_by,updated_at) values(?1,?2,?3,?4,?5,?6,?7,datetime('now')) on conflict(suite,festival_id,year) do update set start_ad=excluded.start_ad,end_ad=excluded.end_ad,note=excluded.note,updated_by=excluded.updated_by,updated_at=datetime('now')")
    .bind(suite,festivalId,year,start,end,note,s.user_id).run();
  await audit(env,s.user_id,"upsert","community_override",{suite,festival_id:festivalId,year,start_ad:start,end_ad:end,note});return json({ok:true,suite,festival_id:festivalId,year,start_ad:start,end_ad:end});
}
async function nsOverride(request:Request,env:Env,s:any){
  const url=new URL(request.url);
  if(request.method==="GET"){
    const year=url.searchParams.get("year");let q=year?env.DB.prepare("select * from ns_festival_overrides where ns_year=?1 order by start_ad").bind(Number(year)):env.DB.prepare("select * from ns_festival_overrides order by ns_year desc,start_ad limit 500");
    return json({ok:true,items:(await q.all()).results||[]});
  }
  let body:any;try{body=await parseBody(request,64*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
  const festivalId=String(body?.festival_id||""),year=Number(body?.ns_year),start=String(body?.start_ad||""),end=String(body?.end_ad||start),confidence=["confirmed","announced","expected","computed"].includes(String(body?.confidence))?String(body.confidence):"confirmed",note=body?.note==null?null:String(body.note).slice(0,500);
  if(!festivalId||!Number.isInteger(year)||year<1000||year>1300||!validDate(start)||!validDate(end)||end<start)return json({ok:false,error:"invalid_override"},400);
  if(request.method==="DELETE"){
    await env.DB.prepare("delete from ns_festival_overrides where festival_id=?1 and ns_year=?2").bind(festivalId,year).run();await audit(env,s.user_id,"delete","ns_festival_override",{festival_id:festivalId,ns_year:year});return json({ok:true,deleted:true});
  }
  await env.DB.prepare("insert into ns_festival_overrides(festival_id,ns_year,start_ad,end_ad,confidence,note,updated_by,updated_at) values(?1,?2,?3,?4,?5,?6,?7,datetime('now')) on conflict(festival_id,ns_year) do update set start_ad=excluded.start_ad,end_ad=excluded.end_ad,confidence=excluded.confidence,note=excluded.note,updated_by=excluded.updated_by,updated_at=datetime('now')")
    .bind(festivalId,year,start,end,confidence,note,s.user_id).run();
  await audit(env,s.user_id,"upsert","ns_festival_override",{festival_id:festivalId,ns_year:year,start_ad:start,end_ad:end,confidence,note});return json({ok:true,festival_id:festivalId,ns_year:year,start_ad:start,end_ad:end,confidence});
}
async function holidayOverride(request:Request,env:Env,s:any){
  const url=new URL(request.url);
  if(request.method==="GET"){
    const date=url.searchParams.get("date");let q=date?env.DB.prepare("select * from holiday_overrides where ad_date=?1 order by id").bind(date):env.DB.prepare("select * from holiday_overrides order by ad_date desc,id limit 500");
    return json({ok:true,items:(await q.all()).results||[]});
  }
  let body:any;try{body=await parseBody(request,96*1024)}catch{return json({ok:false,error:"invalid_json"},400)}
  const id=String(body?.id||crypto.randomUUID()),date=String(body?.ad_date||""),ne=String(body?.name_ne||"").trim().slice(0,180),en=body?.name_en==null?null:String(body.name_en).slice(0,180);
  if(!validDate(date)||!ne)return json({ok:false,error:"invalid_holiday"},400);
  if(request.method==="DELETE"){await env.DB.prepare("delete from holiday_overrides where id=?1").bind(id).run();await audit(env,s.user_id,"delete","holiday_override",{id});return json({ok:true,deleted:true})}
  const scope=String(body?.scope_type||"national").slice(0,60),effect=String(body?.effect||"closed").slice(0,40),status=String(body?.status||"announced").slice(0,40),sourceUrl=body?.source_url==null?null:String(body.source_url).slice(0,1000),sourceTitle=body?.source_title==null?null:String(body.source_title).slice(0,500),payload=body?.payload&&typeof body.payload==="object"?body.payload:{};
  await env.DB.prepare("insert into holiday_overrides(id,ad_date,name_ne,name_en,scope_type,effect,status,source_url,source_title,payload,updated_by,updated_at) values(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,datetime('now')) on conflict(id) do update set ad_date=excluded.ad_date,name_ne=excluded.name_ne,name_en=excluded.name_en,scope_type=excluded.scope_type,effect=excluded.effect,status=excluded.status,source_url=excluded.source_url,source_title=excluded.source_title,payload=excluded.payload,updated_by=excluded.updated_by,updated_at=datetime('now')")
    .bind(id,date,ne,en,scope,effect,status,sourceUrl,sourceTitle,JSON.stringify(payload),s.user_id).run();
  await audit(env,s.user_id,"upsert","holiday_override",{id,ad_date:date,name_ne:ne});return json({ok:true,id,ad_date:date});
}

export async function adminResponse(request:Request,env:Env):Promise<Response|null>{
  const path=new URL(request.url).pathname;
  if(!["/api/v1/admin/community-overrides","/api/v1/admin/ns-festival-dates","/api/admin/holidays"].includes(path))return null;
  if(!env.DB)return json({ok:false,error:"d1_unavailable"},503);
  const s=await adminSession(request,env);if(!s)return json({ok:false,error:"admin_auth_required"},403);
  if(!["GET","POST","PUT","DELETE"].includes(request.method))return json({ok:false,error:"method_not_allowed"},405);
  if(path==="/api/v1/admin/community-overrides")return communityOverride(request,env,s);
  if(path==="/api/v1/admin/ns-festival-dates")return nsOverride(request,env,s);
  return holidayOverride(request,env,s);
}
