import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getAllDays, getFestivals, getHolidays } from "../lib/patro.mjs";

const root=process.cwd();
const LEGACY_DAYS=92;
const LEGACY_PAST_DAYS=40;
const STATIC_PAST_MONTHS=12;
const STATIC_FUTURE_MONTHS=12;
const MAX_LEGACY_BYTES=700000;
const MAX_MONTH_BYTES=350000;
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const rows=await getAllDays();
const todayIndex=rows.findIndex((row)=>row.ad===today);
if(todayIndex<0)throw new Error(`Offline calendar window cannot locate today ${today} in canonical archive`);

function slimDay(row){
  return {ad:row.ad,bs:row.bs,ns:row.ns||null,panchang:{
    tithi:row.panchang?.tithi||null,
    tithi_name_ne:row.panchang?.tithi_name_ne||row.panchang?.tithi_ne||null,
    tithi_transition:row.panchang?.tithi_transition||row.panchang?.tithiTransition||null,
    sunrise:row.panchang?.sunrise||null,
    sunset:row.panchang?.sunset||null
  }};
}
function shiftBsMonth(year,month,delta){
  const absolute=year*12+(month-1)+delta;
  return {year:Math.floor(absolute/12),month:(absolute%12+12)%12+1};
}
function monthKey(year,month){return `${year}-${String(month).padStart(2,"0")}`;}
async function eventsFor(days){
  const adYears=[...new Set(days.map((row)=>Number(String(row.ad).slice(0,4))).filter(Boolean))];
  const allowed=new Set(days.map((row)=>row.ad));
  const events=[];
  for(const year of adYears){
    for(const row of [...await getHolidays(year),...await getFestivals(year)]){
      const ad=String(row?.ad_date||row?.fact_date||row?.date||"").slice(0,10);
      if(!allowed.has(ad))continue;
      events.push({ad_date:ad,name_ne:row?.name_ne||row?.title_ne||row?.label_ne||row?.value?.label_ne||null,name_en:row?.name_en||row?.title||null,key:row?.key||row?.slug||null,effect:row?.effect||row?.status||null,status:row?.status||null,source_title:row?.source_title||row?.source||null,verified_at:row?.verified_at||row?.updated_at||null});
    }
  }
  return [...new Map(events.map((row)=>[`${row.ad_date}|${row.name_ne||row.name_en||row.key}|${row.effect||""}`,row])).values()];
}
async function writeBoth(relative,payload,maxBytes,label){
  const text=JSON.stringify(payload);const bytes=Buffer.byteLength(text);
  if(bytes>maxBytes)throw new Error(`${label} unexpectedly large: ${bytes} bytes`);
  for(const base of ["public","dist"]){const out=resolve(root,base,relative);await mkdir(dirname(out),{recursive:true});await writeFile(out,text,"utf8");}
  return bytes;
}

// Keep the legacy bounded payload for existing tests/tools while the PWA moves to month shards.
const legacyStart=Math.max(0,todayIndex-LEGACY_PAST_DAYS);
const legacyDays=rows.slice(legacyStart,legacyStart+LEGACY_DAYS).map(slimDay);
if(legacyDays.length!==LEGACY_DAYS)throw new Error(`Legacy offline window expected ${LEGACY_DAYS} days; got ${legacyDays.length}`);
const legacyEvents=await eventsFor(legacyDays);
await writeBoth("data/calendar/offline-window.json",{schema_version:4,generated_at:new Date().toISOString(),basis:"Canonical Aafnai Patro archive",max_days:LEGACY_DAYS,past_days:LEGACY_PAST_DAYS,start:legacyDays[0].ad,end:legacyDays.at(-1).ad,days:legacyDays,events:legacyEvents},MAX_LEGACY_BYTES,"Legacy offline calendar window");

// 25 BS months = previous 12 months + current month + next 12 months.
const current=rows[todayIndex];
const currentYear=Number(current?.bs?.year),currentMonth=Number(current?.bs?.month);
if(!Number.isInteger(currentYear)||!Number.isInteger(currentMonth))throw new Error(`Current BS date missing for ${today}`);
const months=Array.from({length:STATIC_PAST_MONTHS+STATIC_FUTURE_MONTHS+1},(_,i)=>shiftBsMonth(currentYear,currentMonth,i-STATIC_PAST_MONTHS));
const index=[];
for(const {year,month} of months){
  const days=rows.filter((row)=>Number(row?.bs?.year)===year&&Number(row?.bs?.month)===month).map(slimDay);
  if(days.length<28||days.length>32)throw new Error(`Static month ${year}/${month} has invalid day count ${days.length}`);
  const events=await eventsFor(days);
  const key=monthKey(year,month);
  const path=`/data/calendar/offline/${key}.json`;
  const payload={schema_version:4,generated_at:new Date().toISOString(),calendar:"bs",year,month,start:days[0].ad,end:days.at(-1).ad,days,events};
  const bytes=await writeBoth(`data/calendar/offline/${key}.json`,payload,MAX_MONTH_BYTES,`Static month ${key}`);
  index.push({year,month,path,start:payload.start,end:payload.end,days:days.length,bytes});
}
const indexPayload={schema_version:4,generated_at:new Date().toISOString(),basis:"Canonical Aafnai Patro archive",policy:"previous 12 BS months + current BS month + next 12 BS months",past_months:STATIC_PAST_MONTHS,future_months:STATIC_FUTURE_MONTHS,current:{year:currentYear,month:currentMonth},start:index[0].start,end:index.at(-1).end,months:index};
await writeBoth("data/calendar/offline/index.json",indexPayload,150000,"Static calendar index");
console.log(`Static calendar ready: ${index.length} BS months (${indexPayload.start}..${indexPayload.end}) plus legacy ${LEGACY_DAYS}-day window.`);

// Production dist/sw.js is generated by Vite before this script runs. Patch only the built copy;
// public/sw.js remains the development source and existing PWA checks stay stable.
await import("./patch-sw-calendar-static.mjs");
