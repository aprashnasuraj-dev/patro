import {isoDate,finite} from '../_vendor/business';
export type Task={task:string;start:string;end:string;group:string;progress:number};
export function gantt(tasks:Task[]){
 if(!Array.isArray(tasks)||tasks.length<1||tasks.length>500)throw new Error('Use 1–500 tasks.');
 const rows=tasks.map((t,i)=>{const start=isoDate(t.start,`Task ${i+1} start`),end=isoDate(t.end,`Task ${i+1} end`);if(end.valueOf()<start.valueOf())throw new Error(`Task ${i+1}: end date precedes start date.`);return {task:String(t.task||'').trim().slice(0,160)||`Task ${i+1}`,start:t.start,end:t.end,group:String(t.group||'').slice(0,80),progress:finite(t.progress,`Task ${i+1} progress`,0,100),startMs:start.valueOf(),endMs:end.valueOf()}}).sort((a,b)=>a.startMs-b.startMs||a.endMs-b.endMs);
 const min=Math.min(...rows.map(r=>r.startMs)),max=Math.max(...rows.map(r=>r.endMs)),span=Math.floor((max-min)/86400000)+1;if(span>3660)throw new Error('Schedule span is limited to 10 years.');
 return {start:new Date(min).toISOString().slice(0,10),end:new Date(max).toISOString().slice(0,10),spanDays:span,tasks:rows.map(r=>({...r,startOffset:Math.floor((r.startMs-min)/86400000),durationDays:Math.floor((r.endMs-r.startMs)/86400000)+1}))};
}
