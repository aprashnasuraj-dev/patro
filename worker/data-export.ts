type R2ObjectLike={text():Promise<string>};
type R2Like={get(key:string):Promise<R2ObjectLike|null>};
type Env=Record<string,unknown>&{ARCHIVE?:R2Like};
const PREFIX="datasets/calendar/v1";
const csvCell=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
const tithi=(row:any)=>{const t=row?.panchang?.tithi;return typeof t==="string"?t:String(t?.ne||t?.name_ne||t?.tithi_name_ne||row?.panchang?.tithi_name_ne||"");};
const ns=(row:any)=>String(row?.ns?.formatted_ne||row?.ns?.formatted||"");

async function yearRows(env:Env,year:number){
  if(!env.ARCHIVE)return null;
  try{
    const object=await env.ARCHIVE.get(`${PREFIX}/bs/${year}.json`);if(!object)return null;
    const doc=JSON.parse(await object.text());
    if(Number(doc?.schema)!==1||doc?.calendar!=="bs"||Number(doc?.year)!==year||!Array.isArray(doc?.rows))return null;
    return {rows:doc.rows,sourceVersion:String(doc?.source_version||"")};
  }catch{return null;}
}

export async function dataExportResponse(request:Request,env:Env):Promise<Response|null>{
  if(request.method!=="GET"&&request.method!=="HEAD")return null;
  const path=new URL(request.url).pathname.replace(/\/+$/,"")||"/";
  const match=path.match(/^\/data\/calendar\/(\d{4})\.(csv|json)$/);if(!match)return null;
  const year=Number(match[1]),format=match[2];
  if(!Number.isInteger(year)||year<1800||year>2200)return new Response("Invalid BS year",{status:400});
  const source=await yearRows(env,year);
  if(!source)return new Response("Calendar R2 archive unavailable",{status:503,headers:{"cache-control":"no-store","x-robots-tag":"noindex, nofollow","x-patro-backend":"r2-required"}});
  const days=source.rows;if(!days.length)return new Response("Calendar year unavailable",{status:404});
  const headers={"cache-control":"public, max-age=3600, s-maxage=86400","x-content-type-options":"nosniff","x-robots-tag":"noindex, nofollow","x-patro-backend":"cloudflare-r2-calendar"};
  if(format==="json"){
    const body=JSON.stringify({schema_version:1,calendar:"bikram-sambat",year,count:days.length,source_version:source.sourceVersion,days});
    return new Response(request.method==="HEAD"?null:body,{status:200,headers:{...headers,"content-type":"application/json; charset=utf-8"}});
  }
  const lines=["bs_year,bs_month,bs_day,ad_date,nepal_sambat,tithi"];
  for(const row of days)lines.push([row.bs?.year,row.bs?.month,row.bs?.day,row.ad,ns(row),tithi(row)].map(csvCell).join(","));
  const body=lines.join("\n")+"\n";
  return new Response(request.method==="HEAD"?null:body,{status:200,headers:{...headers,"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="aafnai-patro-${year}.csv"`}});
}
