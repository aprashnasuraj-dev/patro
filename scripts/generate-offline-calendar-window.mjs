import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getAllDays, getFestivals, getHolidays } from "../lib/patro.mjs";

const root=process.cwd();
const offlineOutputs=[
  resolve(root,"public/data/calendar/offline-window.json"),
  resolve(root,"dist/data/calendar/offline-window.json")
];
const twelveMonthOutputs=[
  resolve(root,"public/data/calendar/current-12-months.json"),
  resolve(root,"dist/data/calendar/current-12-months.json")
];
const MAX_DAYS=92;
const PAST_DAYS=40;
const MAX_OFFLINE_BYTES=700000;
const MAX_TWELVE_MONTH_BYTES=2500000;
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
async function eventsFor(days){
  const years=[...new Set(days.map((row)=>Number(row.bs?.year)).filter(Boolean))];
  const allowedDates=new Set(days.map((row)=>row.ad));
  const events=[];
  for(const year of years){
    for(const row of [...await getHolidays(year),...await getFestivals(year)]){
      const ad=String(row?.ad_date||row?.fact_date||row?.date||"").slice(0,10);
      if(!allowedDates.has(ad))continue;
      events.push({ad_date:ad,name_ne:row?.name_ne||row?.title_ne||row?.label_ne||row?.value?.label_ne||null,name_en:row?.name_en||row?.title||null,key:row?.key||row?.slug||null,effect:row?.effect||row?.status||null,status:row?.status||null,source_title:row?.source_title||row?.source||null,verified_at:row?.verified_at||row?.updated_at||null});
    }
  }
  return [...new Map(events.map((row)=>[`${row.ad_date}|${row.name_ne||row.name_en||row.key}|${row.effect||""}`,row])).values()];
}
async function writePayload(outputs,payload,maxBytes,label){
  const text=JSON.stringify(payload);const bytes=Buffer.byteLength(text);
  if(bytes>maxBytes)throw new Error(`${label} unexpectedly large: ${bytes} bytes`);
  for(const out of outputs){await mkdir(dirname(out),{recursive:true});await writeFile(out,text,"utf8");}
  return bytes;
}

const offlineStart=Math.max(0,todayIndex-PAST_DAYS);
const offlineDays=rows.slice(offlineStart,offlineStart+MAX_DAYS).map(slimDay);
if(offlineDays.length!==MAX_DAYS)throw new Error(`Offline calendar window must be exactly ${MAX_DAYS} days; got ${offlineDays.length}`);
const offlineEvents=await eventsFor(offlineDays);
const offlinePayload={schema_version:3,generated_at:new Date().toISOString(),basis:"Canonical Aafnai Patro archive; bounded static fallback for current calendar availability",max_days:MAX_DAYS,past_days:PAST_DAYS,start:offlineDays[0].ad,end:offlineDays.at(-1).ad,days:offlineDays,events:offlineEvents};
const offlineBytes=await writePayload(offlineOutputs,offlinePayload,MAX_OFFLINE_BYTES,"Offline calendar window");

// Previous BS month + current BS month + next 10 BS months = 12 months available from static assets.
// Routine calendar browsing inside this window therefore performs zero D1/R2 reads.
const currentRow=rows[todayIndex];
const currentYear=Number(currentRow?.bs?.year),currentMonth=Number(currentRow?.bs?.month);
if(!Number.isInteger(currentYear)||!Number.isInteger(currentMonth))throw new Error(`Current BS date missing for ${today}`);
const months=Array.from({length:12},(_,index)=>shiftBsMonth(currentYear,currentMonth,index-1));
const monthKeys=new Set(months.map(({year,month})=>`${year}-${month}`));
const twelveMonthDays=rows.filter(row=>monthKeys.has(`${Number(row.bs?.year)}-${Number(row.bs?.month)}`)).map(slimDay);
const presentMonths=new Set(twelveMonthDays.map(row=>`${row.bs?.year}-${row.bs?.month}`));
if(months.some(({year,month})=>!presentMonths.has(`${year}-${month}`)))throw new Error("12-month frontend bundle has a missing BS month");
if(twelveMonthDays.length<350||twelveMonthDays.length>380)throw new Error(`12-month frontend bundle expected about one year of days; got ${twelveMonthDays.length}`);
const twelveMonthEvents=await eventsFor(twelveMonthDays);
const twelveMonthPayload={schema_version:1,generated_at:new Date().toISOString(),basis:"Canonical Aafnai Patro archive; static 12-BS-month frontend bundle",policy:"previous month + current month + next 10 months",months,start:twelveMonthDays[0].ad,end:twelveMonthDays.at(-1).ad,days:twelveMonthDays,events:twelveMonthEvents};
const twelveMonthBytes=await writePayload(twelveMonthOutputs,twelveMonthPayload,MAX_TWELVE_MONTH_BYTES,"12-month frontend bundle");

console.log(`Bounded offline calendar window: ${offlineDays.length} days, ${offlineEvents.length} events, ${offlinePayload.start}..${offlinePayload.end}, ${offlineBytes} bytes.`);
console.log(`Static 12-month frontend calendar: ${months.length} BS months, ${twelveMonthDays.length} days, ${twelveMonthEvents.length} events, ${twelveMonthPayload.start}..${twelveMonthPayload.end}, ${twelveMonthBytes} bytes.`);
