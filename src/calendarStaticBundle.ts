import { adToBs } from "../packages/core/src";

export type StaticCalendarDay={ad:string;bs:{year:number;month:number;day:number;formatted?:string};ns?:any;panchang?:any};
export type StaticCalendarEvent={ad_date?:string;fact_date?:string;date?:string;[key:string]:unknown};
type MonthMeta={year:number;month:number;path:string;start:string;end:string;days:number};
type IndexPayload={start:string;end:string;months:MonthMeta[]};
type MonthPayload={year:number;month:number;days:StaticCalendarDay[];events:StaticCalendarEvent[]};

const INDEX_URL="/data/calendar/offline/index.json";
let indexPromise:Promise<IndexPayload|null>|null=null;
const monthPromises=new Map<string,Promise<MonthPayload|null>>();

async function json<T>(url:string,signal?:AbortSignal):Promise<T|null>{
  try{const response=await fetch(url,{signal,headers:{accept:"application/json"},credentials:"same-origin",cache:"force-cache"});return response.ok?await response.json() as T:null}catch{return null}
}
export function staticCalendarIndex(signal?:AbortSignal){
  if(!indexPromise)indexPromise=json<IndexPayload>(INDEX_URL).then(value=>value&&Array.isArray(value.months)?value:null);
  if(!signal)return indexPromise;
  if(signal.aborted)return Promise.resolve(null);
  return Promise.race([indexPromise,new Promise<null>(resolve=>signal.addEventListener("abort",()=>resolve(null),{once:true}))]);
}
export async function staticCalendarMonthBundle(year:number,month:number,signal?:AbortSignal){
  const index=await staticCalendarIndex(signal);const meta=index?.months?.find(item=>item.year===year&&item.month===month);if(!meta)return null;
  const key=`${year}-${month}`;let pending=monthPromises.get(key);if(!pending){pending=json<MonthPayload>(meta.path).then(value=>value&&Array.isArray(value.days)?value:null);monthPromises.set(key,pending)}
  if(!signal)return pending;if(signal.aborted)return null;
  return Promise.race([pending,new Promise<null>(resolve=>signal.addEventListener("abort",()=>resolve(null),{once:true}))]);
}
export async function staticCalendarDay(ad:string,signal?:AbortSignal){
  try{const bs=adToBs(ad);const month=await staticCalendarMonthBundle(bs.year,bs.month,signal);return month?.days?.find(day=>day.ad===ad)||null}catch{return null}
}
export async function staticCalendarEventsForDays(days:Array<{ad:string;bs?:{year?:number;month?:number}}>,signal?:AbortSignal){
  if(!days.length)return null;const first=days[0];let year=Number(first.bs?.year),month=Number(first.bs?.month);
  if(!year||!month){try{const bs=adToBs(first.ad);year=bs.year;month=bs.month}catch{return null}}
  const bundle=await staticCalendarMonthBundle(year,month,signal);if(!bundle)return null;
  const allowed=new Set(days.map(day=>day.ad));return (bundle.events||[]).filter(event=>allowed.has(String(event.ad_date||event.fact_date||event.date||"")));
}
