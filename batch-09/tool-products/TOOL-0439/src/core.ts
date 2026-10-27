import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const cap=N(i,'cap',0,1e8),res=N(i,'residual',0,1e8),factor=N(i,'factor',0,.1),months=N(i,'months',1,120),tax=N(i,'taxPct',0,50)/100,up=N(i,'upfront',0,1e8),fee=N(i,'endFee',0,1e8);
if(!Number.isInteger(months))throw Error('Lease term must be whole months');const dep=(cap-res)/months,rent=(cap+res)*factor,base=dep+rent,withTax=base*(1+tax);return R([{label:'Approximate APR equivalent',value:Q(factor*2400)+'%'},{label:'Modeled monthly including sales tax',value:M(withTax)},{label:'Monthly depreciation portion',value:M(dep)},{label:'Monthly money/rent charge',value:M(rent)},{label:'Modeled total cash outlay',value:M(up+months*withTax+fee)}],['Money factor × 2400 is an approximation, not an actuarial APR or guaranteed lender-disclosed annual rate.','Upfront cash excludes amounts already reflected in adjusted capitalized cost; avoid double counting. Taxes may be calculated at signing rather than monthly.'],[`Monthly base = (cap − residual)/months + (cap + residual) × money factor.`]);

}
