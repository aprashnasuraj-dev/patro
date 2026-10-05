export type StaticCalendarDay={ad:string;bs?:{year?:number;month?:number;day?:number};ns?:unknown;nepal_sambat?:unknown;panchang?:any};
export type StaticCalendarEvent={ad_date?:string;fact_date?:string;date?:string;[key:string]:unknown};
export type StaticCalendarBundle={schema_version?:number;months?:Array<{year:number;month:number}>;start?:string;end?:string;days?:StaticCalendarDay[];events?:StaticCalendarEvent[]};

const BUNDLE_URL="/data/calendar/current-12-months.json";
let bundlePromise:Promise<StaticCalendarBundle|null>|null=null;

export function loadCurrentCalendarBundle(signal?:AbortSignal){
  if(!bundlePromise){
    bundlePromise=fetch(BUNDLE_URL,{headers:{accept:"application/json"},credentials:"same-origin",cache:"force-cache"})
      .then(async response=>response.ok?await response.json() as StaticCalendarBundle:null)
      .then(bundle=>bundle&&Array.isArray(bundle.days)?bundle:null)
      .catch(()=>null);
  }
  if(!signal)return bundlePromise;
  if(signal.aborted)return Promise.resolve(null);
  return Promise.race([
    bundlePromise,
    new Promise<null>(resolve=>signal.addEventListener("abort",()=>resolve(null),{once:true}))
  ]);
}

export async function staticCalendarMonth(year:number,month:number,signal?:AbortSignal){
  const bundle=await loadCurrentCalendarBundle(signal);if(!bundle?.days)return[];
  return bundle.days.filter(row=>Number(row?.bs?.year)===year&&Number(row?.bs?.month)===month);
}

export async function staticCalendarDay(ad:string,signal?:AbortSignal){
  const bundle=await loadCurrentCalendarBundle(signal);return bundle?.days?.find(row=>row?.ad===ad)||null;
}

export async function staticCalendarEventsForDays(days:Array<{ad:string}>,signal?:AbortSignal){
  const bundle=await loadCurrentCalendarBundle(signal);if(!bundle?.events?.length||!days.length)return[];
  const dates=new Set(days.map(day=>day.ad));
  return bundle.events.filter(event=>dates.has(String(event.ad_date||event.fact_date||event.date||"")));
}

export async function staticCalendarCoversDays(days:Array<{ad:string}>,signal?:AbortSignal){
  const bundle=await loadCurrentCalendarBundle(signal);if(!bundle?.days?.length||!days.length)return false;
  const available=new Set(bundle.days.map(row=>row.ad));return days.every(day=>available.has(day.ad));
}
