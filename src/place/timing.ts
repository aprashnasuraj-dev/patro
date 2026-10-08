import * as A from 'astronomy-engine';
import { dayPanchang, nextTithiStart, zonedMidnight, addDays } from '../patro-tools/core/astro';
import type { GeoLocation } from '../patro-tools/core/types';
export function placeTiming(date:string, place:GeoLocation) {
 const p=dayPanchang(date,place), observer=new A.Observer(place.lat,place.lon,place.height||0);
 const midnight=zonedMidnight(date,place.tz), end=zonedMidnight(addDays(date,1),place.tz);
 const moonrise=A.SearchRiseSet(A.Body.Moon,observer,1,midnight,(end.getTime()-midnight.getTime())/86400000)?.date||null;
 const tithiStart=nextTithiStart(p.tithi,new Date(p.sunrise.getTime()-3*86400000));
 return {...p,moonrise,tithiStart};
}
export function formatPlaceInstant(date:Date|null,tz:string) { return date?new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(date):'उदय हुँदैन / No rise in this local day'; }
