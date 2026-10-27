import {finite,roundTo} from '../_vendor/business';
export type Shift={date:string;start:string;end:string;breakMinutes:number};
function mins(v:string,label:string){if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v))throw new Error(`${label} must use HH:MM.`);const [h,m]=v.split(':').map(Number);return h*60+m}
function weekKey(iso:string){const d=new Date(`${iso}T00:00:00Z`);if(Number.isNaN(d.valueOf()))throw new Error('Invalid shift date.');const day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day);return d.toISOString().slice(0,10)}
export function timesheet(shifts:Shift[],dailyRaw:number,weeklyRaw:number,multRaw:number){
 if(!Array.isArray(shifts)||shifts.length<1||shifts.length>500)throw new Error('Use 1–500 shifts.');
 const daily=finite(dailyRaw,'Daily overtime threshold',0,24),weekly=finite(weeklyRaw,'Weekly overtime threshold',0,168),mult=finite(multRaw,'Overtime multiplier',1,10);
 const rows=shifts.map((s,i)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s.date))throw new Error(`Row ${i+1}: invalid date.`);const st=mins(s.start,`Row ${i+1} start`),en=mins(s.end,`Row ${i+1} end`);if(en===st)throw new Error(`Row ${i+1}: equal start/end times are ambiguous; split a 24-hour shift explicitly.`);const span=(en<st?en+1440:en)-st;const br=finite(s.breakMinutes,`Row ${i+1} break`,0,span);const worked=(span-br)/60;if(worked>24)throw new Error(`Row ${i+1}: worked hours exceed 24.`);const dailyOt=Math.max(0,worked-daily),regular=worked-dailyOt;return {index:i+1,date:s.date,start:s.start,end:s.end,breakMinutes:br,worked,regular,dailyOt,weeklyOt:0,week:weekKey(s.date)}}).sort((a,b)=>a.date.localeCompare(b.date)||a.index-b.index);
 const weeks=new Map<string,typeof rows>();for(const r of rows){const arr=weeks.get(r.week)||[];arr.push(r);weeks.set(r.week,arr)}
 for(const arr of weeks.values()){let regularSoFar=0;for(const r of arr){const room=Math.max(0,weekly-regularSoFar);const keep=Math.min(r.regular,room);r.weeklyOt=r.regular-keep;r.regular=keep;regularSoFar+=keep}}
 const out=rows.map(r=>({...r,worked:roundTo(r.worked,2),regular:roundTo(r.regular,2),dailyOt:roundTo(r.dailyOt,2),weeklyOt:roundTo(r.weeklyOt,2),weightedHours:roundTo(r.regular+(r.dailyOt+r.weeklyOt)*mult,2)}));
 const sum=(k:'worked'|'regular'|'dailyOt'|'weeklyOt'|'weightedHours')=>roundTo(out.reduce((s,r)=>s+r[k],0),2);
 return {rows:out,totalWorked:sum('worked'),regularHours:sum('regular'),dailyOvertimeHours:sum('dailyOt'),weeklyOvertimeHours:sum('weeklyOt'),weightedHours:sum('weightedHours'),overtimeMultiplier:mult};
}
