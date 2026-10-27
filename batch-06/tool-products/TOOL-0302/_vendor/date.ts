export const DAY_MS=86_400_000;
export type Civil={y:number,m:number,d:number};
export function leap(y:number){return y%4===0&&(y%100!==0||y%400===0)}
export function dim(y:number,m:number){if(!Number.isInteger(y)||y<1||y>9999||!Number.isInteger(m)||m<1||m>12)throw new Error('Date is out of supported range.');return [31,leap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m-1]}
export function civil(s:string,label='Date'):Civil{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);if(!m)throw new Error(`${label} must use YYYY-MM-DD.`);const y=+m[1],mo=+m[2],d=+m[3];if(y<1||y>9999||mo<1||mo>12||d<1||d>dim(y,mo))throw new Error(`${label} is invalid.`);return{y,m:mo,d}}
export function iso(c:Civil){return `${String(c.y).padStart(4,'0')}-${String(c.m).padStart(2,'0')}-${String(c.d).padStart(2,'0')}`}
export function utcMs(c:Civil){const x=new Date(0);x.setUTCFullYear(c.y,c.m-1,c.d);x.setUTCHours(0,0,0,0);return x.valueOf()}
export function fromMs(ms:number):Civil{const x=new Date(ms);return{y:x.getUTCFullYear(),m:x.getUTCMonth()+1,d:x.getUTCDate()}}
export function cmp(a:Civil,b:Civil){return a.y!==b.y?a.y-b.y:a.m!==b.m?a.m-b.m:a.d-b.d}
export function addDays(s:string,n:number){if(!Number.isInteger(n)||Math.abs(n)>200000)throw new Error('Day offset is outside the supported range.');return iso(fromMs(utcMs(civil(s))+n*DAY_MS))}
export function addMonthsClamped(s:string,n:number){if(!Number.isInteger(n)||Math.abs(n)>120000)throw new Error('Month offset is outside the supported range.');const c=civil(s);const k=(c.y*12+(c.m-1))+n;const y=Math.floor(k/12),m=((k%12)+12)%12+1;if(y<1||y>9999)throw new Error('Result is outside supported years.');return iso({y,m,d:Math.min(c.d,dim(y,m))})}
export function addYearsClamped(s:string,n:number){if(!Number.isInteger(n)||Math.abs(n)>9998)throw new Error('Year offset is outside the supported range.');const c=civil(s),y=c.y+n;if(y<1||y>9999)throw new Error('Result is outside supported years.');return iso({y,m:c.m,d:Math.min(c.d,dim(y,c.m))})}
export function diffDays(a:string,b:string){return Math.round((utcMs(civil(b))-utcMs(civil(a)))/DAY_MS)}
export function dayOfYear(s:string){const c=civil(s);return diffDays(`${String(c.y).padStart(4,'0')}-01-01`,s)+1}
export function weekday(s:string){return new Date(utcMs(civil(s))).getUTCDay()}
export function isoWeek(s:string){const c=civil(s);const d=new Date(utcMs(c));const wd=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-wd+3);const wy=d.getUTCFullYear();const jan4=new Date(Date.UTC(wy,0,4));const jan4wd=(jan4.getUTCDay()+6)%7;jan4.setUTCDate(jan4.getUTCDate()-jan4wd);const week=1+Math.round((d.valueOf()-jan4.valueOf())/(7*DAY_MS));return{weekYear:wy,week,isoWeekday:((new Date(utcMs(c)).getUTCDay()+6)%7)+1}}
export function weeksInIsoYear(y:number){return isoWeek(`${y}-12-28`).week}
export function calendarDiff(a:string,b:string){let sign=1,start=a,end=b;if(diffDays(a,b)<0){sign=-1;start=b;end=a}let years=0,cur=start;while(true){const nx=addYearsClamped(cur,1);if(diffDays(nx,end)>0||nx===end){years++;cur=nx;if(cur===end)break}else break}let months=0;while(cur!==end){const nx=addMonthsClamped(cur,1);if(diffDays(nx,end)>0||nx===end){months++;cur=nx;if(cur===end)break}else break}const days=Math.max(0,diffDays(cur,end));return{sign,years,months,days,totalDays:Math.abs(diffDays(a,b))}}
