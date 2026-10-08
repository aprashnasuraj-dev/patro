import * as A from 'astronomy-engine';
import type { GeoLocation } from '../patro-tools/core/types';
import { approved,RITUAL_WINDOWS } from './ritual-config';
export type EclipseContact={name:string;time:Date;aboveHorizon:boolean};
export function localSolarEclipse(from:Date,place:GeoLocation) {
 const result=A.SearchLocalSolarEclipse(from,new A.Observer(place.lat,place.lon,place.height||0));
 const events=[['Partial start',result.partial_begin],['Total/annular start',result.total_begin],['Maximum',result.peak],['Total/annular end',result.total_end],['Partial end',result.partial_end]] as const;
 return {type:'solar',kind:result.kind,coverage:result.obscuration,visible:true,contacts:events.filter(([,v])=>v).map(([name,v])=>({name,time:v!.time.date,aboveHorizon:v!.altitude>0})),sutak:approved(RITUAL_WINDOWS.reviewer)?{start:new Date(result.partial_begin.time.date.getTime()-RITUAL_WINDOWS.solarSutakHours*3600000),end:result.partial_end.time.date}:null};
}
export function localLunarEclipse(from:Date,place:GeoLocation) {
 const e=A.SearchLunarEclipse(from),observer=new A.Observer(place.lat,place.lon,place.height||0),peak=e.peak.date.getTime();
 const times=[['Penumbral start',-e.sd_penum],['Partial start',-e.sd_partial],['Total start',-e.sd_total],['Maximum',0],['Total end',e.sd_total],['Partial end',e.sd_partial],['Penumbral end',e.sd_penum]] as const;
 const altitude=(time:Date)=>{const eq=A.Equator(A.Body.Moon,time,observer,true,true);return A.Horizon(time,observer,eq.ra,eq.dec,'normal').altitude;};
 const contacts=times.filter(([name,n])=>name==='Maximum'||n!==0).map(([name,n])=>{const time=new Date(peak+n*60000);return{name,time,aboveHorizon:altitude(time)>0};});
 const start=contacts[0].time,end=contacts.at(-1)!.time;let visible=contacts.some(c=>c.aboveHorizon);if(!visible)visible=!!A.SearchRiseSet(A.Body.Moon,observer,1,start,(end.getTime()-start.getTime())/86400000);
 return {type:'lunar',kind:e.kind,coverage:e.obscuration,visible,contacts,sutak:approved(RITUAL_WINDOWS.reviewer)?{start:new Date(start.getTime()-RITUAL_WINDOWS.lunarSutakHours*3600000),end}:null};
}
