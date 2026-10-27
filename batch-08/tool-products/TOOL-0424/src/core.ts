import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const where=S(i,'jurisdiction'),d=N(i,'deposit',0,1e9),damage=N(i,'damage',0,1e9),arrears=N(i,'arrears',0,1e9),other=N(i,'other',0,1e9),days=N(i,'days',0,366),date=D(i,'trigger');
const charges=damage+arrears+other;return R([{label:'Estimated amount to return',value:M(Math.max(0,d-charges))},{label:'Uncovered deductions (not collectible here)',value:M(Math.max(0,charges-d))},{label:'Calendar-day deadline',value:addDays(date,days)}],[`No deadline or deduction rules are verified for ${where}. Enter only legally permitted deductions and the correct trigger date.`,`The calculation does not determine whether cleaning, normal wear or fees are deductible.`],[`Deposit ${M(d)} less deductions ${M(charges)}.`]);

}
