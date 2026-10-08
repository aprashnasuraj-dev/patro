import {archiveDay,archiveYear,type ArchiveDay} from '../patro-tools-integration/staticCalendar';
import {dayPanchang} from '../patro-tools/core/astro';
import {KATHMANDU} from '../patro-tools/core/types';
export type BirthdayYear={year:number;ad:string;bs:string|null;tithi:string|null;alignment:boolean;note:string};
export function adAnniversary(birth:string,year:number){const suffix=birth.slice(4);const candidate=year+suffix;if(suffix==='-02-29'&&new Date(candidate+'T00:00Z').getUTCMonth()!==1)return`${year}-02-28`;return candidate;}
export function alignment(dates:Array<string|null>){if(dates.some(d=>!d))return false;const ms=dates.map(d=>Date.parse(d!));return Math.max(...ms)-Math.min(...ms)<=86400000;}
export async function threeBirthdays(birth:string,fromYear:number,count=10,source?:ArchiveDay):Promise<BirthdayYear[]> {
 const original=source||await archiveDay(birth),birthMonth=dayPanchang(birth,KATHMANDU).monthIndex,target=original.panchang.tithi.number;const result:BirthdayYear[]=[];
 for(let year=fromYear;year<fromYear+count;year++) { const ad=adAnniversary(birth,year);let bs:string|null=null,tithi:string|null=null,note=birth.endsWith('-02-29')&&!ad.endsWith('-02-29')?'AD leap-day anniversary shown on Feb 28. ':'';
 try {const rows=await archiveYear(year);const bsRows=rows.filter(r=>r.bs.month===original.bs.month);bs=bsRows.find(r=>r.bs.day===original.bs.day)?.ad||null;if(!bs&&bsRows.length){bs=bsRows.at(-1)!.ad;note+='Short BS month: last available day. ';}
 for(const row of rows.filter(r=>r.panchang?.tithi?.number===target)){const p=dayPanchang(row.ad,KATHMANDU);if(p.monthIndex===birthMonth&&!p.lunarMonth.adhik){tithi=row.ad;break;}}
 if(!tithi)note+='Archive has no matching sunrise tithi in this year; no date invented. ';}catch{note+='Outside available archive coverage. ';}
 result.push({year,ad,bs,tithi,alignment:alignment([ad,bs,tithi]),note});await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 return result;
}
export function daysUntil(date:string,today:string){return Math.round((Date.parse(date)-Date.parse(today))/86400000);}
