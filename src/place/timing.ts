import * as A from 'astronomy-engine';
import { panchangAt, lunarMonthAt, monthInSystem, tithiEndAfter, nextTithiStart, localDate } from '../patro-tools/core/astro';
import { civilBounds } from './civil';
import { approved, RITUAL_WINDOWS } from './ritual-config';
import { KATHMANDU } from '../patro-tools/core/types';
import type { GeoLocation } from '../patro-tools/core/types';
export function placeTiming(date:string, place:GeoLocation): import('../patro-tools/core/types').DayPanchang & {moonrise:Date|null;tithiStart:Date;polarFallback:boolean} {
 const observer=new A.Observer(place.lat,place.lon,place.height||0),bounds=civilBounds(date,place.tz),midnight=bounds.start,end=bounds.end,days=(end.getTime()-midnight.getTime())/86400000;
 const sunrise=A.SearchRiseSet(A.Body.Sun,observer,1,midnight,days)?.date,sunset=A.SearchRiseSet(A.Body.Sun,observer,-1,midnight,days)?.date;
 if(!sunrise||!sunset||localDate(sunrise,place.tz)!==date||localDate(sunset,place.tz)!==date) {
   if(approved(RITUAL_WINDOWS.reviewer)&&RITUAL_WINDOWS.polarFallback==='kathmandu'&&place.tz!=='Asia/Kathmandu')return {...placeTiming(date,KATHMANDU),polarFallback:true};
   throw Error('No sunrise/sunset in this civil day; unreviewed polar fallback is unavailable.');
 }
 const at=panchangAt(sunrise),lunarMonth=lunarMonthAt(sunrise);
 const p={...at,date,sunrise,sunset,lunarMonth,monthIndex:monthInSystem(lunarMonth.amantaIndex,at.paksha,'purnimanta'),weekday:new Date(date+'T00:00Z').getUTCDay(),tithiEnds:tithiEndAfter(sunrise)};
 const moonrise=A.SearchRiseSet(A.Body.Moon,observer,1,midnight,days)?.date||null;
 const tithiStart=nextTithiStart(p.tithi,new Date(p.sunrise.getTime()-3*86400000));
 return {...p,moonrise,tithiStart,polarFallback:false};
}
export function formatPlaceInstant(date:Date|null,tz:string) { return date?new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(date):'उदय हुँदैन / No rise in this local day'; }
