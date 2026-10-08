import * as A from 'astronomy-engine';
import { addDays, dayPanchang, sunriseSunset, tithiEndAfter, zonedMidnight, sunSidereal } from '../patro-tools/core/astro';
import { occurrences } from '../patro-tools/tithi-events/engine';
import type { GeoLocation } from '../patro-tools/core/types';
import { approved, RITUAL_CONFIG, RITUAL_WINDOWS } from './ritual-config';
export type LocalWindow = { title:string;date:string;start:Date;end:Date;source:string;fallback?:boolean };
export function officialSait(date:string,clock:string,place:GeoLocation) { if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))throw Error('Invalid official time');const [h,m]=clock.split(':').map(Number);const instant=new Date(zonedMidnight(date,'Asia/Kathmandu').getTime()+(h*60+m)*60000);return {instant,local:new Intl.DateTimeFormat('en-GB',{timeZone:place.tz,dateStyle:'medium',timeStyle:'short'}).format(instant)}; }
export function festivalWindows(slug:string,year:number,place:GeoLocation,config=RITUAL_CONFIG,windows=RITUAL_WINDOWS):LocalWindow[] {
 const entry=config[slug];if(!entry||!approved(entry.reviewer)||!approved(windows.reviewer))return [];
 const recurring=['ekadashi','purnima','aunsi','chaturthi'].includes(slug);
 const rules=recurring?Array.from({length:12},(_,month)=>({...entry.rule,month})): [entry.rule];if(slug==='ekadashi')rules.push(...rules.map(rule=>({...rule,paksha:'krishna' as const})));
 return rules.flatMap(rule=>occurrences(rule,`${year}-01-01`,`${year}-12-31`,place).flatMap(o=>{
 const p=dayPanchang(o.date,place),next=sunriseSunset(addDays(o.date,1),place).sunrise,r=p.sunrise.getTime(),s=p.sunset.getTime(),night=next.getTime()-s,day=s-r;
 let start=o.tithiStart,end=o.tithiEnd;
 switch(entry.window){case'aparahna':start=new Date(r+day*3/5);end=new Date(r+day*4/5);break;case'pradosh':start=p.sunset;end=new Date(s+night*windows.pradoshNightFraction);break;case'nishitha':start=new Date(s+night/2-night*windows.nishithaHalfNightFraction);end=new Date(s+night/2+night*windows.nishithaHalfNightFraction);break;
 case'chhath':return [{title:'सन्ध्या अर्घ्य / Sunset arghya',date:o.date,start:p.sunset,end:p.sunset,source:entry.source},{title:'उषा अर्घ्य / Sunrise arghya',date:addDays(o.date,1),start:next,end:next,source:entry.source}];
 case'parana':{const dwadashiEnd=tithiEndAfter(new Date(o.tithiEnd.getTime()+1000));start=new Date(Math.max(next.getTime(),o.tithiEnd.getTime()+(dwadashiEnd.getTime()-o.tithiEnd.getTime())*windows.hariVasaraFraction));end=new Date(Math.min(dwadashiEnd.getTime(),next.getTime()+day/3));break;}
 case'moonrise':{const moon=A.SearchRiseSet(A.Body.Moon,new A.Observer(place.lat,place.lon,place.height||0),1,zonedMidnight(o.date,place.tz),1);if(!moon)return [];start=moon.date;end=moon.date;break;}
 case'sunrise':start=p.sunrise;end=o.tithiEnd;break;case'official':return [];
 }
 if(!['interval','parana','moonrise','sunrise'].includes(entry.window)){start=new Date(Math.max(start.getTime(),o.tithiStart.getTime()));end=new Date(Math.min(end.getTime(),o.tithiEnd.getTime()));}
 return end>=start?[{title:entry.name,date:o.date,start,end,source:entry.source,fallback:o.fallback}]:[];
 } )).sort((a,b)=>a.start.getTime()-b.start.getTime());
}
export function sankrantiAfter(from:Date) { const sign=Math.floor(sunSidereal(from)/30),target=(sign+1)*30;let lo=from.getTime(),hi=lo+35*86400000;for(let i=0;i<45;i++){const mid=(lo+hi)/2;let lon=sunSidereal(new Date(mid));if(sign===11&&lon<330)lon+=360;if(lon<target)lo=mid;else hi=mid;}return new Date((lo+hi)/2); }
