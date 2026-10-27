import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Pure, bounded calculations; no user-data storage or network. */
export function calculate(i:Record<string,unknown>):Result {
const board=S(i,'jurisdiction',100),target=N(i,'target',0,10000),earned=N(i,'earned',0,10000),renew=D(i,'renewal'),asof=D(i,'asof'),monthly=N(i,'monthly',0,1000);if(!board||renew<asof)throw Error('Board required; renewal date cannot be earlier than tracking date');const rem=Math.max(0,target-earned),days=(Date.parse(renew+'T00:00:00Z')-Date.parse(asof+'T00:00:00Z'))/86400000,months=days/30.436875,planned=monthly*months;
return R([{label:'Accepted credit deficit',value:`${Q(rem)} credits`},{label:'Days until renewal',value:String(days)},{label:'Projected additional credits',value:`${Q(planned)} credits`},{label:'Projected gap after plan',value:`${Q(Math.max(0,rem-planned))} credits`}],[`Current ${board} approved-provider lists, category caps, rolling periods, carryover and audit rules are NOT loaded.`, 'Calendar months are estimated from average month length only for planning cadence; submissions may be due earlier than renewal.'],['Remaining = max(0, required − accepted); forecast = monthly pace × days/30.436875.']);
}
