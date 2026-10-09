import * as A from 'astronomy-engine';
import {adToBs,formatBsDate,bsDateMetadata} from '../../packages/core/src/bsDate.ts';
import cities from './cities.json' with {type:'json'};
export const ORIGIN='https://aafnaipatro.com', BASE='/atlas', DAYS=40000, START=Date.UTC(1927,9,9), DAY=86400000, TOTAL=cities.length*DAYS, SHARD=1000;
const bySlug=new Map(cities.map(c=>[c.slug,c]));
export const dateAt=i=>new Date(START+i*DAY).toISOString().slice(0,10);
export function dateIndex(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return -1;const t=Date.parse(s+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==s)return -1;const i=(t-START)/DAY;return i>=0&&i<DAYS?i:-1;}
export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pathFor=(c,d)=>`${BASE}/${c.slug}/${d}`;
export const dateParts=(t,tz)=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(t)).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
export function midnight(d,tz){let target=Date.parse(d+'T00:00:00Z'),t=target;for(let n=0;n<5;n++){const p=dateParts(t,tz);const v=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second),delta=target-v;t+=delta;if(!delta)return new Date(t);}throw new Error('Unsupported local midnight');}
export function facts(c,d){const start=midnight(d,c.tz),end=midnight(new Date(Date.parse(d+'T00:00:00Z')+DAY).toISOString().slice(0,10),c.tz);const limit=(end-start)/DAY,obs=new A.Observer(c.lat,c.lon,0);const event=dir=>{const t=A.SearchRiseSet(A.Body.Sun,obs,dir,start,limit);return t&&t.date<end?t.date:null;};const rise=event(1),set=event(-1),noon=new Date((start.getTime()+end.getTime())/2),phase=A.MoonPhase(noon),light=A.Illumination(A.Body.Moon,noon);const moonEvent=dir=>{const t=A.SearchRiseSet(A.Body.Moon,obs,dir,start,limit);return t&&t.date<end?t.date:null;};return {start,end,rise,set,noon,phase,moonrise:moonEvent(1),moonset:moonEvent(-1),moonDistanceKm:light.geo_dist*149597870.7,illumination:light.phase_fraction,daylight:rise&&set&&set>rise?(set-rise)/60000:null};}
export const clock=(d,c)=>d?new Intl.DateTimeFormat('en-GB',{timeZone:c.tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(Math.round(d.getTime()/60000)*60000)):'No event on this local date';
export const duration=m=>`${Math.floor(Math.round(m)/60)} h ${Math.round(m)%60} min`;
const phaseName=p=>p<22.5||p>=337.5?'New-moon phase':p<67.5?'Waxing crescent':p<112.5?'First-quarter phase':p<157.5?'Waxing gibbous':p<202.5?'Full-moon phase':p<247.5?'Waning gibbous':p<292.5?'Last-quarter phase':'Waning crescent';
