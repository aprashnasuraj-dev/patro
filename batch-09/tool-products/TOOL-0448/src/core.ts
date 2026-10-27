import {N,Q,M,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const count=N(i,'originalSkeins',1,5000),om=N(i,'originalMeters',1,10000),rm=N(i,'replacementMeters',1,10000),w=N(i,'waste',0,60)/100,price=N(i,'price',0,1e5);if(!Number.isInteger(count))throw Error('Skein count must be whole');const need=count*om*(1+w),buy=Math.ceil(need/rm);
return R([{label:'Substitute skeins to purchase',value:Q(buy,0)},{label:'Adjusted meterage needed',value:`${Q(need)} m`},{label:'Purchased total meterage',value:`${Q(buy*rm)} m`},{label:'Unallocated yarn',value:`${Q(buy*rm-need)} m`},{label:'Cost at entered unit price',value:M(buy*price)}],['Length equivalence does NOT establish stitch gauge, yarn weight compatibility, fiber stretch or fabric drape. Swatch and compare gauge before substitution.','Price currency is selected implicitly by your data; no currency conversion is performed.'],[`Skeins = ceiling(original skeins × original metres × (1+waste) / substitute metres).`]);
}
