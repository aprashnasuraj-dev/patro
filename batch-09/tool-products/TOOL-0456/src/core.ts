import {N,S,Q,M,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const program=S(i,'program',100),weekly=N(i,'weekly',0,100000),rate=N(i,'rate',0,100)/100,cap=N(i,'cap',0,100000),weeks=N(i,'weeks',0,52),waiting=N(i,'waiting',0,8),employer=N(i,'employerPay',0,100000);if(!program||waiting>weeks)throw Error('Provide the program and use waiting ≤ approved weeks');const paid=weeks-waiting,publicWeekly=Math.min(weekly*rate,cap),benefit=publicWeekly*paid;
return R([{label:'Estimated public benefit',value:M(benefit)},{label:'Per payable week before employer pay',value:M(publicWeekly)},{label:'Payable weeks',value:Q(paid)},{label:'Modeled employer supplement',value:M(employer*paid)},{label:'Modeled total before tax',value:M(benefit+employer*paid)}],[`Rules for ${program} are manually entered and NOT verified for the given effective date. State eligibility, qualifying reasons, sliding replacement rates and coordination with employer leave are outside this model.`, 'Employer supplements may be offset, restricted or disallowed. Tax withholding and federal/state program interactions are not applied.'],[`Public benefit = max(0, weeks−waiting) × min(weekly wages × replacement rate, verified program cap).`]);
}
