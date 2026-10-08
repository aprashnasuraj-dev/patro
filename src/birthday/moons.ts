import * as A from 'astronomy-engine';
import {estimatedAgeDate,JANKU_RULES} from './traditions';
import {approved} from '../place/ritual-config';
export async function lifeMoons(birth:Date,until=new Date(),signal?:AbortSignal){let from=new Date(birth.getTime()+1),count=0,nextRound:Date|null=null,thousand:Date|null=null;const list:Date[]=[];
 for(let i=1;i<=Math.max(1000,Math.ceil((until.getTime()-birth.getTime())/(28*86400000))+100);i++){
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const moon=A.SearchMoonPhase(180,from,32);if(!moon)throw Error('Moon phase search unavailable');const date=moon.date;list.push(date);if(date<=until)count++;if(i===1000)thousand=date;if(date>until&&i%100===0&&!nextRound)nextRound=date;from=new Date(date.getTime()+86400000);if(i>=1000&&nextRound)break;if(i%20===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 return {count,nextRound,roundNumber:nextRound?list.findIndex(d=>d===nextRound)+1:null,thousand};
}
export function countArchiveDates(dates:string[],birth:string,today:string){return dates.filter(d=>d>=birth&&d<=today).length;}
export function jankuEstimates(birth:string){return JANKU_RULES.filter(r=>approved(r.reviewer)).map(r=>({...r,date:estimatedAgeDate(birth,r.years,r.months,r.days)}));}
