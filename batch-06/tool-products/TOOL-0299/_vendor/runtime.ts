export type Input=Record<string,unknown>;
export type Metric={label:string;value:string};
export type Result={summary:string;metrics:Metric[];warnings:string[];rows?:string[][];csv?:string};
export function n(i:Input,key:string,min:number,max:number):number{const s=String(i[key]??'').trim();if(!/^[+-]?(?:\d{1,12})(?:\.\d{1,8})?$/.test(s))throw new Error('Invalid numeric input: '+key);const v=Number(s);if(!Number.isFinite(v)||v<min||v>max)throw new Error(key+' must be in '+min+'–'+max);return v;}
export function integer(i:Input,key:string,min:number,max:number){let v=n(i,key,min,max);if(!Number.isSafeInteger(v))throw new Error(key+' must be a whole number');return v;}
export function opt(i:Input,key:string,values:string[]):string{const s=String(i[key]??'');if(!values.includes(s))throw new Error('Unsupported '+key);return s;}
export function str(i:Input,key:string,max=120):string{const s=String(i[key]??'').trim();if(!s||s.length>max||/[\u0000-\u001f<>]/.test(s))throw new Error(key+' is empty, unsafe or oversized');return s;}
export function clock(i:Input,key:string):number{const s=String(i[key]??'');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))throw new Error('Invalid 24-hour time '+key);return Number(s.slice(0,2))*60+Number(s.slice(3));}
export function minutesToClock(v:number):string{const t=(Math.round(v)%1440+1440)%1440;return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
export const f=(x:number,d=2):string=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
export const m=(label:string,value:string):Metric=>({label,value});
export function res(summary:string,metrics:Metric[],warnings:string[]=[],rows?:string[][],csv?:string):Result{
 if(!summary||metrics.some(x=>!x.label||!x.value||/NaN|Infinity|undefined/.test(x.value))||rows?.some(r=>r.some(x=>/NaN|Infinity/.test(x))))throw new Error('Result is not finite or complete');
 return {summary,metrics,warnings,rows,csv};
}
export function duration(s:number):string{if(!Number.isFinite(s)||s<0||s>10**9)throw new Error('Time unsupported');let t=Math.round(s);return [Math.floor(t/3600),Math.floor(t%3600/60),t%60].map((n,j)=>String(n).padStart(j?2:1,'0')).join(':');}
export const csvSafe=(a:string[][])=>a.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
