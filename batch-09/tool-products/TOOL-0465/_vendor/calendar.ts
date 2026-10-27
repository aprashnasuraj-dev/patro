import {D} from './guard';
export function addMonthsClamped(iso:string, months:number):string {
 D({v:iso},'v');if(!Number.isInteger(months)||months<0||months>1200)throw Error('Unsupported period');
 const y=+iso.slice(0,4),m=+iso.slice(5,7)-1,d=+iso.slice(8,10);
 const destY=y+Math.floor((m+months)/12),destM=(m+months)%12;
 if(destY>2100)throw Error('Result exceeds supported calendar');
 const last=new Date(Date.UTC(destY,destM+1,0)).getUTCDate();return `${destY.toString().padStart(4,'0')}-${String(destM+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;
}
export function addDaysExt(iso:string, days:number):string {
 D({v:iso},'v');if(!Number.isInteger(days)||days<0||days>4000)throw Error('Unsupported day interval');
 const t=new Date(Date.parse(iso+'T00:00:00Z')+days*86400000);
 if(t.getUTCFullYear()>2100)throw Error('Result exceeds supported calendar');return t.toISOString().slice(0,10);
}
