import {nsFromAd,formatNs} from '../patro-tools/nepal-sambat/engine';
import {yeleYear} from '../patro-tools/communities/kirat/yele';
import {lhoFor} from '../patro-tools/communities/lhosar/lho';
import {devanagariToTirhuta} from '../patro-tools/communities/mithila/tirhuta';
import {hijriOf} from '../patro-tools/communities/hijri/calendar';
import type {BirthModel} from './birth-panchang';
export function communityCalendars(model:BirthModel){const date=model.profile.date,ns=nsFromAd(date),lho=lhoFor(date),hijri=hijriOf(date);
 const bs=model.row.bs,bsText=`${bs.year}-${bs.month}-${bs.day}`;
 // Mithila has a script converter, not an independent date converter; label its exact input.
 return [
 {id:'bs',label:'वि.सं. / BS',value:bsText},
 {id:'ns',label:'नेपाल संवत् / Nepal Sambat (existing Kathmandu converter)',value:formatNs(ns,'dev')+' · '+formatNs(ns,'newa')},
 {id:'saka',label:'शक / Saka',value:model.saka},
 {id:'kirat',label:'किरात येले / Kirat Yele',value:String(yeleYear(date))+' · existing new-year convention (review)'},
 {id:'tamang',label:'तामाङ ल्हो / Tamang lho',value:JSON.stringify(lho.tamang)},
 {id:'gurung',label:'गुरुङ ल्हो / Gurung lho',value:JSON.stringify(lho.gurung)},
 {id:'tibetan',label:'Tibetan / Sherpa lho & element',value:JSON.stringify(lho.tibetan)},
 {id:'mithila',label:'मिथिला / Tirhuta script (BS date transcription)',value:devanagariToTirhuta(bsText.replace(/\d/g,c=>'०१२३४५६७८९'[Number(c)]))},
 {id:'muslim',label:'Hijri — estimate, sighting can differ',value:`${hijri.year}-${hijri.month}-${hijri.day} (${hijri.basis})`}
 ];
}
export function orderCalendars<T extends {id:string}>(rows:T[],mode:string){return [...rows].sort((a,b)=>Number(b.id===mode)-Number(a.id===mode));}
