import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const price=N(i,'replacement',0,1e8),life=N(i,'life',.1,100),age=N(i,'age',0,100),repair=N(i,'repair',0,1e8),fault=N(i,'damagePct',0,100)/100;
const remain=Math.max(0,1-age/life),dep=price*remain,cap=Math.min(repair,dep)*fault;
return R([{label:'Remaining assumed item value',value:M(dep)},{label:'Modeled maximum charge',value:M(cap)},{label:'Remaining useful life share',value:P(remain)}],['Linear age depreciation is a negotiation aid—not a jurisdictionally mandated deposit formula.','Normal wear, pre-existing defects, betterment, evidence and allowable repair items must be decided independently.'],[`Replacement × max(0, 1 − age / useful life) × responsibility, capped by documented repair cost.`]);

}
