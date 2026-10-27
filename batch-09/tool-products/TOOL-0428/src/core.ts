import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const old=N(i,'assessed',0,1e10),neo=N(i,'proposed',0,1e10),rate=N(i,'rate',0,1000),p=N(i,'success',0,100)/100,fee=N(i,'filing',0,1e8);if(neo>old)throw Error('Appealed assessment must not exceed current assessment for savings model');const saved=(old-neo)*rate/1000;
return R([{label:'Best-case annual tax difference',value:M(saved)},{label:'One-year probability-weighted net',value:M(saved*p-fee)},{label:'Filed reduction request',value:M(old-neo)}],['Probability is user-provided, not an outcome prediction; equalization, millage, caps, deadlines and multi-year persistence are excluded.'],[`Annual savings = (${M(old)} – ${M(neo)}) × ${Q(rate)}/1000.`]);

}
