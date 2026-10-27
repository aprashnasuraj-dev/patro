import {D} from './guard';
export function addYears(iso:string,years:number):string {
 D({date:iso},'date');
 if(!Number.isInteger(years)||years<0||years>100)throw Error('Invalid year increment');
 const y=Number(iso.slice(0,4))+years,m=Number(iso.slice(5,7)),d=Number(iso.slice(8,10));
 if(y>2100)throw Error('Anniversary beyond supported civil-date range');
 const last=new Date(Date.UTC(y,m,0)).getUTCDate();
 return `${y.toString().padStart(4,'0')}-${m.toString().padStart(2,'0')}-${Math.min(last,d).toString().padStart(2,'0')}`;
}
