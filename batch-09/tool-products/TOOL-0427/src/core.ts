import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const rent=N(i,'monthly',0,1e9),months=N(i,'months',0,240),fee=N(i,'fee',0,1e9),re=N(i,'reletting',0,1e9),deposit=N(i,'deposit',0,1e9),credit=N(i,'concessions',0,1e9);
const stay=rent*months,exit=Math.max(0,fee+re+deposit-credit);return R([{label:'Remaining scheduled rent',value:M(stay)},{label:'Modeled early-exit cash cost',value:M(exit)},{label:'Difference (stay minus exit)',value:M(stay-exit)}],['The number is NOT an enforceable landlord claim. Mitigation, acceleration, notice and deposit rules vary.','Do not double-count retained deposit if it is credited against rent or fees.'],[`Exit model = fee + reletting + retained deposit – agreed credits.`]);

}
