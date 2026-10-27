import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
import {addDaysExt,addMonthsClamped} from '../_vendor/calendar';
/** Pure, bounded calculations; no user-data storage or network. */
export function calculate(i:Record<string,unknown>):Result {
const jurisdiction=S(i,'jurisdiction',100),start=D(i,'accrual'),y=N(i,'years',0,100),mo=N(i,'months',0,119),d=N(i,'days',0,365),t=N(i,'tolling',0,3650),rule=S(i,'filingRule',50);if(!jurisdiction||![y,mo,d,t].every(Number.isInteger)||y+mo+d===0)throw Error('Name jurisdiction and enter a nonzero whole calendar period');if(!['none','next-weekday illustrative'].includes(rule))throw Error('Invalid calendar adjustment');
const totalMonths=y*12+mo,deadline=addDaysExt(addMonthsClamped(start,totalMonths),d+t);const weekday=new Date(deadline+'T12:00:00Z').getUTCDay();let adjusted=deadline;if(rule==='next-weekday illustrative')adjusted=addDaysExt(deadline,weekday===6?2:weekday===0?1:0);
return R([{label:'Unadjusted civil-date estimate',value:deadline},{label:'Illustrative weekday-adjusted date',value:adjusted},{label:'Verified tolling added',value:`${t} days`},{label:'Legal start date',value:start}],[`NO statutory period was looked up for ${jurisdiction}. The user must verify accrual, discovery, tolling, service, court and jurisdiction-specific computations.`, 'Weekday adjustment ignores public holidays and may be prohibited or calculated differently by controlling law. Inclusive-count, anniversary and end-of-day filing rules can move the due date.'],['Start date + calendar months (clamped if invalid target day) + entered days + verified tolling.']);
}
