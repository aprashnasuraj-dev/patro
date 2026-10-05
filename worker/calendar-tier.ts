import { r2CalendarByAd, r2CalendarByBs, r2CalendarMonth, r2CalendarRange, type CalendarBackupEnv } from "./calendar-backup";

type TierEnv=CalendarBackupEnv&{DB?:any;CALENDAR_COVERAGE_START?:string;CALENDAR_COVERAGE_END?:string;CALENDAR_SOURCE_VERSION?:string};
const CACHE="public, max-age=60, s-maxage=3600, stale-while-revalidate=86400";
const LONG="public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";

function json(body:any,status=200,cache=CACHE,source?:string){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":cache,"x-content-type-options":"nosniff","x-patro-backend":"calendar-tier",...(source?{"x-patro-calendar-source":source}:{})}})}
function validDate(value:any):value is string{if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const[y,m,d]=value.split("-").map(Number),date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d}
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function unwrap(row:any){
  if(!row)return null;let value=row.payload??row;if(typeof value==="string"){try{value=JSON.parse(value)}catch{return null}}
  if(value&&typeof value==="object"&&value.payload&&typeof value.payload==="object"&&(value.payload.ad||value.payload.bs))return {...value.payload,ad:value.payload.ad||value.ad_date};
  return value;
}
function sourceRow(row:any,source:"d1"|"r2"){const value=unwrap(row);return value?{...value,__source:source}:null}
async function d1First(env:TierEnv,sql:string,bindings:any[]=[]){
  if(!env.DB)return[];try{const out=await env.DB.prepare(sql).bind(...bindings).all();return(out.results||[]).map((row:any)=>sourceRow(row,"d1")).filter(Boolean)}catch{return[]}
}
async function byAd(env:TierEnv,date:string){
  const rows=await d1First(env,"select payload from content_records where table_name='astronomy_calendar_map' and record_key=?1 limit 1",[date]);if(rows[0])return rows[0];const row=await r2CalendarByAd(env,date);return row?sourceRow(row,"r2"):null;
}
async function byBs(env:TierEnv,year:number,month:number,day:number){
  const rows=await d1First(env,"select payload from content_records where table_name='astronomy_calendar_map' and coalesce(json_extract(payload,'$.payload.bs.year'),json_extract(payload,'$.bs.year'))=?1 and coalesce(json_extract(payload,'$.payload.bs.month'),json_extract(payload,'$.bs.month'))=?2 and coalesce(json_extract(payload,'$.payload.bs.day'),json_extract(payload,'$.bs.day'))=?3 limit 1",[year,month,day]);if(rows[0])return rows[0];const row=await r2CalendarByBs(env,year,month,day);return row?sourceRow(row,"r2"):null;
}
async function monthRows(env:TierEnv,mode:"bs"|"ad",year:number,month:number){
  let rows:any[]=[];
  if(mode==="bs")rows=await d1First(env,"select payload from content_records where table_name='astronomy_calendar_map' and coalesce(json_extract(payload,'$.payload.bs.year'),json_extract(payload,'$.bs.year'))=?1 and coalesce(json_extract(payload,'$.payload.bs.month'),json_extract(payload,'$.bs.month'))=?2 order by record_key",[year,month]);
  else{const mm=String(month).padStart(2,"0"),nextMonth=month===12?1:month+1,nextYear=month===12?year+1:year;rows=await d1First(env,"select payload from content_records where table_name='astronomy_calendar_map' and record_key>=?1 and record_key<?2 order by record_key",[`${year}-${mm}-01`,`${nextYear}-${String(nextMonth).padStart(2,"0")}-01`])}
  if(rows.length)return rows;return(await r2CalendarMonth(env,mode,year,month)).map(row=>sourceRow(row,"r2")).filter(Boolean);
}
async function rangeRows(env:TierEnv,start:string,end:string){
  const rows=await d1First(env,"select payload from content_records where table_name='astronomy_calendar_map' and record_key>=?1 and record_key<=?2 order by record_key limit 62",[start,end]);if(rows.length)return rows;return(await r2CalendarRange(env,start,end)).map(row=>sourceRow(row,"r2")).filter(Boolean);
}
function sourceOf(rows:any[]|any){const row=Array.isArray(rows)?rows[0]:rows;return row?.__source==="r2"?"r2":"d1"}
function calendarShape(calendar:any){return{ad:calendar.ad,bs:calendar.bs,nepal_sambat:calendar.ns,panchang:calendar.panchang,source:sourceOf(calendar)==="r2"?"Cloudflare R2 calendar backup":"Cloudflare D1 astronomy archive"}}
function syncShape(date:string,calendar:any){return{success:true,query_date:date,calendars:{gregorian_ad:date,bikram_sambat:calendar.bs?.formatted||"",nepal_sambat:calendar.ns?.formatted||"",bikram_sambat_detail:calendar.bs||null,nepal_sambat_detail:calendar.ns||null},tithi:calendar.panchang?.tithi||null,archive_panchang:calendar.panchang||null,calendar_source:sourceOf(calendar)}}
async function holidayRows(env:TierEnv,date:string){return d1First(env,"select payload from content_records where table_name='holidays' and ad_date=?1 order by record_key",[date])}

export async function calendarTierResponse(request:Request,env:TierEnv):Promise<Response|null>{
  if(request.method!=="GET")return null;const url=new URL(request.url),path=url.pathname;
  if(path==="/api/v1/sync"){
    const start=url.searchParams.get("start"),end=url.searchParams.get("end");
    if(start!=null||end!=null){if(!validDate(start)||!validDate(end))return json({success:false,error:"invalid_range"},400);const requested=Math.floor((Date.parse(end+"T00:00:00Z")-Date.parse(start+"T00:00:00Z"))/86400000)+1;if(requested<1||requested>62)return json({success:false,error:"range_limit_exceeded",max_days:62},400);const rows=await rangeRows(env,start,end);if(!rows.length)return null;const days=rows.map(row=>syncShape(row.ad,row));return json({success:true,start_date:start,end_date:end,requested_days:requested,returned_days:days.length,days,coverage:{ad_start:env.CALENDAR_COVERAGE_START||"1826-04-11",ad_end:env.CALENDAR_COVERAGE_END||"2037-04-13",source_version:env.CALENDAR_SOURCE_VERSION||"patro-archive-v79",rows:77070}},200,CACHE,sourceOf(rows))}
    const date=url.searchParams.get("date")||today();if(!validDate(date))return json({success:false,error:"invalid_date"},400);const row=await byAd(env,date);return row?json(syncShape(date,row),200,CACHE,sourceOf(row)):null;
  }
  const month=path.match(/^\/api\/v1\/calendar\/(\d{4})\/(\d{1,2})$/);
  if(month){const year=Number(month[1]),m=Number(month[2]);if(m<1||m>12)return json({ok:false,error:"invalid_month"},400);const mode=(url.searchParams.get("calendar")||((year>2050)?"bs":"ad")) as "bs"|"ad";if(mode!=="bs"&&mode!=="ad")return json({ok:false,error:"invalid_calendar"},400);const rows=await monthRows(env,mode,year,m);if(!rows.length)return null;return json({ok:true,calendar:mode,year,month:m,count:rows.length,days:rows.map(calendarShape)},200,LONG,sourceOf(rows))}
  if(path==="/api/v1/today"){const date=url.searchParams.get("date")||today();if(!validDate(date))return json({ok:false,error:"invalid_date"},400);const row=await byAd(env,date);if(!row)return null;return json({ok:true,date,...calendarShape(row),holidays:await holidayRows(env,date)},200,CACHE,sourceOf(row))}
  if(path==="/api/v1/panchang"){const date=url.searchParams.get("date")||today();if(!validDate(date))return json({ok:false,error:"invalid_date"},400);const row=await byAd(env,date);if(!row)return null;return json({ok:true,date,bs:row.bs,nepal_sambat:row.ns,panchang:row.panchang,provenance:{source:sourceOf(row)==="r2"?"r2-backup":"patro-archive",version:env.CALENDAR_SOURCE_VERSION||"migrated"}},200,CACHE,sourceOf(row))}
  if(path==="/api/v1/convert"){
    const ad=url.searchParams.get("ad"),bs=url.searchParams.get("bs");let row:any=null;
    if(ad){if(!validDate(ad))return json({ok:false,error:"invalid_ad"},400);row=await byAd(env,ad)}
    else if(bs){const match=bs.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(!match)return json({ok:false,error:"invalid_bs"},400);row=await byBs(env,Number(match[1]),Number(match[2]),Number(match[3]))}
    else return null;
    return row?json({ok:true,...calendarShape(row)},200,CACHE,sourceOf(row)):null;
  }
  return null;
}
