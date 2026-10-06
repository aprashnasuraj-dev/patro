import { calendarArchiveUnavailable, loadCalendarShard, type CalendarArchiveEnv } from "./calendar-archive";

type Env=Record<string,unknown>&CalendarArchiveEnv;
const csvCell=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
const tithi=(row:any)=>{const t=row?.panchang?.tithi;return typeof t==="string"?t:String(t?.ne||t?.name_ne||t?.tithi_name_ne||row?.panchang?.tithi_name_ne||"");};
const ns=(row:any)=>String(row?.ns?.formatted_ne||row?.ns?.formatted||"");

async function yearRows(request:Request,env:Env,year:number){
  const source=await loadCalendarShard(request,env,"bs",year);
  if(!source)return null;
  return {rows:source.doc.rows,sourceVersion:String(source.doc.source_version||""),backend:source.backend};
}

export async function dataExportResponse(request:Request,env:Env):Promise<Response|null>{
  if(request.method!=="GET"&&request.method!=="HEAD")return null;
  const path=new URL(request.url).pathname.replace(/\/+$/,"")||"/";
  const match=path.match(/^\/data\/calendar\/(\d{4})\.(csv|json)$/);if(!match)return null;
  const year=Number(match[1]),format=match[2];
  if(!Number.isInteger(year)||year<1800||year>2200)return new Response("Invalid BS year",{status:400});
  const source=await yearRows(request,env,year);
  if(!source)return calendarArchiveUnavailable("Calendar archive unavailable");
  const days=source.rows;if(!days.length)return new Response("Calendar year unavailable",{status:404});
  const headers={"cache-control":"public, max-age=3600, s-maxage=86400","x-content-type-options":"nosniff","x-robots-tag":"noindex, nofollow","x-patro-backend":source.backend};
  if(format==="json"){
    const body=JSON.stringify({schema_version:1,calendar:"bikram-sambat",year,count:days.length,source_version:source.sourceVersion,days});
    return new Response(request.method==="HEAD"?null:body,{status:200,headers:{...headers,"content-type":"application/json; charset=utf-8"}});
  }
  const lines=["bs_year,bs_month,bs_day,ad_date,nepal_sambat,tithi"];
  for(const row of days)lines.push([row.bs?.year,row.bs?.month,row.bs?.day,row.ad,ns(row),tithi(row)].map(csvCell).join(","));
  const body=lines.join("\n")+"\n";
  return new Response(request.method==="HEAD"?null:body,{status:200,headers:{...headers,"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="aafnai-patro-${year}.csv"`}});
}
