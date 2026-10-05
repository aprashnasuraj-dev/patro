export type CalendarBackupEnv={CALENDAR_BACKUP?:any};
type IndexMonth={year:number;month:number;path?:string;start:string;end:string};
type IndexPayload={start?:string;end?:string;months?:IndexMonth[]};
export const R2_CALENDAR_INDEX_KEY="calendar/offline-24-months/index.json";
const objectCache=new Map<string,Promise<any|null>>();
async function objectJson(env:CalendarBackupEnv,key:string){
  if(!env.CALENDAR_BACKUP?.get)return null;
  let pending=objectCache.get(key);if(!pending){pending=(async()=>{try{const object=await env.CALENDAR_BACKUP.get(key);if(!object)return null;if(typeof object.json==="function")return await object.json();if(typeof object.text==="function")return JSON.parse(await object.text());return null}catch{return null}})();objectCache.set(key,pending)}return pending;
}
async function index(env:CalendarBackupEnv){const value=await objectJson(env,R2_CALENDAR_INDEX_KEY) as IndexPayload|null;return value&&Array.isArray(value.months)?value:null}
function keyFor(meta:IndexMonth){return String(meta.path||`/data/calendar/offline-24-months/${meta.year}-${String(meta.month).padStart(2,"0")}.json`).replace(/^\/data\//,"")}
async function monthByMeta(env:CalendarBackupEnv,meta:IndexMonth){const value=await objectJson(env,keyFor(meta));return value&&Array.isArray(value.days)?value:null}
export async function r2CalendarByAd(env:CalendarBackupEnv,date:string){const ix=await index(env);const meta=ix?.months?.find(m=>m.start<=date&&m.end>=date);if(!meta)return null;const month=await monthByMeta(env,meta);return month?.days?.find((d:any)=>String(d.ad)===date)||null}
export async function r2CalendarByBs(env:CalendarBackupEnv,year:number,month:number,day?:number){const ix=await index(env);const meta=ix?.months?.find(m=>Number(m.year)===year&&Number(m.month)===month);if(!meta)return null;const data=await monthByMeta(env,meta);const rows=data?.days||[];return day==null?rows:rows.find((d:any)=>Number(d?.bs?.day)===day)||null}
export async function r2CalendarMonth(env:CalendarBackupEnv,mode:"bs"|"ad",year:number,month:number){
  const ix=await index(env);if(!ix)return[];
  if(mode==="bs"){const meta=ix.months?.find(m=>Number(m.year)===year&&Number(m.month)===month);if(!meta)return[];return (await monthByMeta(env,meta))?.days||[]}
  const prefix=`${year}-${String(month).padStart(2,"0")}-`;
  const nextYear=month===12?year+1:year,nextMonth=month===12?1:month+1,next=`${nextYear}-${String(nextMonth).padStart(2,"0")}-01`;
  const metas=ix.months?.filter(m=>m.end>=`${prefix}01`&&m.start<next)||[];const rows=[];
  for(const meta of metas){for(const row of (await monthByMeta(env,meta))?.days||[])if(String(row.ad).startsWith(prefix))rows.push(row)}
  return rows.sort((a:any,b:any)=>String(a.ad).localeCompare(String(b.ad)));
}
export async function r2CalendarRange(env:CalendarBackupEnv,start:string,end:string){const ix=await index(env);if(!ix)return[];const metas=ix.months?.filter(m=>m.end>=start&&m.start<=end)||[];const rows=[];for(const meta of metas){for(const row of (await monthByMeta(env,meta))?.days||[])if(row.ad>=start&&row.ad<=end)rows.push(row)}return rows.sort((a:any,b:any)=>String(a.ad).localeCompare(String(b.ad)))}
export function clearR2CalendarObjectCache(){objectCache.clear()}
