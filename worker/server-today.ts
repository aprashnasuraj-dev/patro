import { loadCalendarShard, type CalendarArchiveEnv } from "./calendar-archive";
type Env=Record<string,unknown>&CalendarArchiveEnv&{ASSETS?:{fetch(request:Request):Promise<Response>}};
function nsLabel(ns:any){return typeof ns==="string"?ns:String(ns?.formatted_ne||ns?.formatted||"");}
async function assetJson(request:Request,env:Env,path:string){if(!env.ASSETS)return null;const u=new URL(request.url);u.pathname=path;u.search="";const r=await env.ASSETS.fetch(new Request(u));return r.ok?r.json():null;}
export async function serverToday(request:Request,env:Env,date:string){
 const source=await loadCalendarShard(request,env,"ad",Number(date.slice(0,4)));const row=source?.doc.rows.find((r:any)=>String(r.ad||r.ad_date).slice(0,10)===date);if(!row)return null;
 const index:any=await assetJson(request,env,"/data/festival-index.json").catch(()=>null);const events:any[]=[];
 for(const f of Object.values(index?.festivals||{}) as any[])for(const occurrence of Object.values(f.years||{}) as any[])if(occurrence.dates?.includes(date)){
  const record=occurrence.records?.find((r:any)=>r.date===date);events.push({ad_date:date,name_ne:record?.name_ne||record?.name||f.name,name_en:record?.name_en||f.name_en,effect:record?.effect||""});
 }
 const p=row.panchang||{},t=p.tithi||{};return {date,events,view:{bs:row.bs,ns:nsLabel(row.ns||row.nepal_sambat),tithi:t.ne||t.name_ne||"",sunrise:p.sunrise||"",sunset:p.sunset||"",panchang:p},row};
}
