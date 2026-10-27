import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const where=S(i,'jurisdiction',100),date=D(i,'served'),lag=N(i,'serviceLag',0,60),days=N(i,'noticeDays',0,730),prop=D(i,'proposed');const effective=addDays(date,lag),earliest=addDays(effective,days);
return R([{label:'Assumed legal service date',value:effective},{label:'Computed minimum expiry date',value:earliest},{label:'Date comparison',value:prop>=earliest?'Meets entered duration':'Earlier than entered duration'}],[`Notice process for ${where} is NOT verified. England changed on 1 May 2026: possession grounds and prescribed forms are critical.`,`Mail, electronic service, bank holidays and exact period conventions are not automated.`],[`Effective service = sent date + ${lag} day(s); assumed expiry = effective service + ${days} calendar day(s).`]);

}
