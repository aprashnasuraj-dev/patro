import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getAllDays, getFestivals, getHolidays } from "../lib/patro.mjs";

const root=process.cwd();
const outputs=[
  resolve(root,"public/data/calendar/offline-window.json"),
  resolve(root,"dist/data/calendar/offline-window.json")
];
const MAX_DAYS=64;
const PAST_DAYS=7;
const MAX_BYTES=300000;
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const rows=await getAllDays();
const todayIndex=rows.findIndex((row)=>row.ad===today);
if(todayIndex<0)throw new Error(`Offline calendar window cannot locate today ${today} in canonical archive`);
const current=rows[todayIndex].bs;
const monthIndices=rows.map((row,index)=>row.bs?.year===current.year&&row.bs?.month===current.month?index:-1).filter(index=>index>=0);
const start=Math.max(0,monthIndices[0]-PAST_DAYS);
const end=Math.min(rows.length,monthIndices.at(-1)+PAST_DAYS+1);
const days=rows.slice(start,end).map((row)=>({
  ad:row.ad,
  bs:row.bs,
  ns:row.ns||null,
  panchang:{
    tithi:row.panchang?.tithi||null,
    tithi_name_ne:row.panchang?.tithi_name_ne||row.panchang?.tithi_ne||null,
    tithi_transition:row.panchang?.tithi_transition||row.panchang?.tithiTransition||null,
    sunrise:row.panchang?.sunrise||null,
    sunset:row.panchang?.sunset||null
  }
}));
if(days.length>MAX_DAYS||days.length<monthIndices.length)throw new Error(`Offline calendar window must contain the whole BS month and stay bounded; got ${days.length}`);
const years=[...new Set(days.map((row)=>Number(row.bs?.year)).filter(Boolean))];
const allowedDates=new Set(days.map((row)=>row.ad));
const events=[];
for(const year of years){
  for(const row of [...await getHolidays(year),...await getFestivals(year)]){
    const ad=String(row?.ad_date||row?.fact_date||row?.date||"").slice(0,10);
    if(!allowedDates.has(ad))continue;
    events.push({
      ad_date:ad,
      name_ne:row?.name_ne||row?.title_ne||row?.label_ne||row?.value?.label_ne||null,
      name_en:row?.name_en||row?.title||null,
      key:row?.key||row?.slug||null,
      effect:row?.effect||row?.status||null,
      source_title:row?.source_title||row?.source||null,
      verified_at:row?.verified_at||row?.updated_at||null
    });
  }
}
const uniqueEvents=[...new Map(events.map((row)=>[`${row.ad_date}|${row.name_ne||row.name_en||row.key}|${row.effect||""}`,row])).values()];
const payload={
  schema_version:1,
  generated_at:new Date().toISOString(),
  basis:"Canonical Aafnai Patro archive; bounded offline/PWA window only",
  max_days:MAX_DAYS,
  month_days:monthIndices.length,
  start:days[0].ad,
  end:days.at(-1).ad,
  days,
  events:uniqueEvents
};
const text=JSON.stringify(payload);
const bytes=Buffer.byteLength(text);
if(bytes>MAX_BYTES)throw new Error(`Offline calendar window unexpectedly large: ${bytes} bytes`);
for(const out of outputs){await mkdir(dirname(out),{recursive:true});await writeFile(out,text,"utf8");}
console.log(`Bounded offline calendar window: ${days.length} days, ${uniqueEvents.length} events, ${payload.start}..${payload.end}, ${bytes} bytes.`);
