import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const where=S(i,'jurisdiction',100),cur=N(i,'current',0,1e9),pro=N(i,'proposed',0,1e9);if(cur<=0)throw Error('Current rent must be positive');
const cap=N(i,'capPct',0,200),days=N(i,'minDays',0,366),served=D(i,'served'),starts=D(i,'starts');
const last=addDays(served,days),max=cur*(1+cap/100),actual=(pro/cur-1)*100;
return R([{label:'Rule-entered maximum rent',value:M(max)},{label:'Proposed increase',value:P(actual/100)},{label:'Earliest day from calendar notice',value:last},{label:'Illustrative check',value:pro<=max&&starts>=last?'Within entered thresholds':'Outside one or more thresholds'}],[`Rules are NOT supplied for ${where}. The entered cap and notice period may not apply to the tenancy, date or exemption.`,`No legal treatment of weekends, holidays, delivery/service rules or rent-controlled exemptions.`],[`Proposed increase exceeds entered cap: ${pro>max?'yes':'no'}; start is before entered notice deadline: ${starts<last?'yes':'no'}.`]);

}
