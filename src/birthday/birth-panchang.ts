import * as A from 'astronomy-engine';
import {archiveDay} from '../patro-tools-integration/staticCalendar';
import {panchangAt,lunarMonthAt,monthInSystem,tithiEndAfter,nextTithiStart} from '../patro-tools/core/astro';
import {KATHMANDU,type GeoLocation} from '../patro-tools/core/types';
import {placeTiming} from '../place/timing';
import {civilBounds,zonedInstant} from '../place/civil';
import {PADA_SYLLABLES} from '../patro-tools/baby/nakshatra-names';
import type {BirthdayProfile} from './storage';
export async function birthPanchang(profile:BirthdayProfile) {
 const row=await archiveDay(profile.date),place:GeoLocation=profile.place||KATHMANDU;let sunrise:Date|null=null,sunset:Date|null=null;
 try {const timing=placeTiming(profile.date,place);sunrise=timing.sunrise;sunset=timing.sunset;}catch{if(!profile.time)throw Error('No local sunrise: provide a birth time, or use Kathmandu reference.');}
 const time=profile.time?zonedInstant(profile.date,profile.time,place.tz):{instant:sunrise!,ambiguous:false},p=panchangAt(time.instant),lunar=lunarMonthAt(time.instant),bounds=civilBounds(profile.date,place.tz),obs=new A.Observer(place.lat,place.lon,place.height||0),days=(bounds.end.getTime()-bounds.start.getTime())/86400000;
 const moonrise=A.SearchRiseSet(A.Body.Moon,obs,1,bounds.start,days)?.date||null,moonset=A.SearchRiseSet(A.Body.Moon,obs,-1,bounds.start,days)?.date||null;
 const saka=new Intl.DateTimeFormat('en-u-ca-indian',{timeZone:place.tz,year:'numeric',month:'long',day:'numeric'}).format(time.instant);
 return {profile,row,place,instant:time.instant,ambiguous:time.ambiguous,p,lunar,month:monthInSystem(lunar.amantaIndex,p.paksha,'purnimanta'),amantaMonth:lunar.amantaIndex,sunrise,sunset,moonrise,moonset,tithiStart:nextTithiStart(p.tithi,new Date(time.instant.getTime()-3*86400000)),tithiEnd:tithiEndAfter(time.instant),illumination:(1-Math.cos(p.moonPhaseAngle*Math.PI/180))/2,syllable:PADA_SYLLABLES[p.nakshatra]?.[p.nakshatraPada-1]||'—',ritu:['वसन्त','ग्रीष्म','वर्षा','शरद्','हेमन्त','शिशिर'][Math.floor(p.sunRashi/2)],ayana:[9,10,11,0,1,2].includes(p.sunRashi)?'उत्तरायण':'दक्षिणायन',saka};
}
export type BirthModel=Awaited<ReturnType<typeof birthPanchang>>;
