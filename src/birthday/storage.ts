import { validPlace,type SavedPlace } from '../place/place';
export const BIRTHDAY_KEY='patro.birthday.v1';
export type BirthdayProfile={name:string;date:string;time?:string;place?:SavedPlace;mode:'full'|'buddhist'|'kirat'|'tamang'|'gurung'|'tibetan'|'muslim'|'calendar-only'};
export function validProfile(p:unknown):p is BirthdayProfile {if(!p||typeof p!=='object')return false;const v=p as BirthdayProfile;return typeof v.name==='string'&&v.name.length<=80&&/^\d{4}-\d{2}-\d{2}$/.test(v.date)&&new Date(v.date+'T00:00Z').toISOString().slice(0,10)===v.date&&(!v.time||/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time))&&(!v.place||validPlace(v.place))&&['full','buddhist','kirat','tamang','gurung','tibetan','muslim','calendar-only'].includes(v.mode);}
export function readBirthday():BirthdayProfile|null {try{const p=JSON.parse(localStorage.getItem(BIRTHDAY_KEY)||'null');return validProfile(p)?p:null;}catch{return null;}}
export function saveBirthday(p:BirthdayProfile) {if(!validProfile(p))throw Error('Invalid birthday');localStorage.setItem(BIRTHDAY_KEY,JSON.stringify(p));}
