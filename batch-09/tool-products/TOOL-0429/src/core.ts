import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const dep=N(i,'deposit',0,1e8),rec=D(i,'received'),protectedDate=ODate(i,'protected'),due=addDays(rec,30);
const late=protectedDate?protectedDate>due:true;
return R([{label:'30-day protection date',value:due},{label:'Illustrative minimum award (1×)',value:M(dep,'£')},{label:'Illustrative maximum award (3×)',value:M(3*dep,'£')},{label:'Protection timing indicator',value:late?'Missing or late under entered dates':'Within 30 calendar days under entered dates'}],['Applies only where UK tenancy deposit-protection law actually imposes a protection duty; scheme and jurisdiction matter.','Court, not calculator, determines liability, relief and any compensation. Compensation is distinct from returning the principal deposit.'],[`One-to-three-times-deposit range: ${M(dep,'£')}–${M(3*dep,'£')}.`]);

}
