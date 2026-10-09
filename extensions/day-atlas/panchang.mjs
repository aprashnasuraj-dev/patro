import * as A from 'astronomy-engine';

export const TITHIS = ['Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima'];
export const TITHIS_NE = ['प्रतिपदा','द्वितीया','तृतीया','चतुर्थी','पञ्चमी','षष्ठी','सप्तमी','अष्टमी','नवमी','दशमी','एकादशी','द्वादशी','त्रयोदशी','चतुर्दशी','पूर्णिमा'];
export function tithiAt(instant) {
  const phase = A.MoonPhase(instant);
  const index = Math.floor(phase / 12) + 1;
  const n = (index - 1) % 15;
  const end = A.SearchMoonPhase(index * 12 % 360, instant, 3)?.date;
  if (!end) throw Error('Tithi boundary search failed');
  return {index, phase, name:index === 30 ? 'Aunsi / Amavasya' : TITHIS[n], ne:index === 30 ? 'औंसी' : TITHIS_NE[n], paksha:index <= 15 ? 'Shukla' : 'Krishna', pakshaNe:index <= 15 ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष', end};
}
export function offsetMinutes(instant, tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(instant).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  return (Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second)-Math.floor(instant.getTime()/1000)*1000)/60000;
}
export function panchang(c, d, f) {
  // No invented polar-day anchor: a sunrise-based tithi is unavailable without sunrise.
  const tithi=f.rise ? tithiAt(f.rise) : null;
  const weekday=new Date(d+'T12:00:00Z').getUTCDay();
  const segment=[8,2,7,5,6,4,3][weekday];
  const eighth=f.rise&&f.set&&f.set>f.rise ? (f.set-f.rise)/8 : null;
  const rahu=eighth===null?null:{start:new Date(f.rise.getTime()+(segment-1)*eighth),end:new Date(f.rise.getTime()+segment*eighth),segment};
  const anchor=f.rise||f.noon;
  return {tithi,rahu,nepalDifferenceMinutes:offsetMinutes(anchor,c.tz)-offsetMinutes(anchor,'Asia/Kathmandu'),nepalAtSunrise:f.rise?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kathmandu',dateStyle:'medium',timeStyle:'short'}).format(f.rise):null};
}
