import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Pure, bounded calculations; no user-data storage or network. */
export function calculate(i:Record<string,unknown>):Result {
const L=N(i,'length',1,240),W=N(i,'width',1,240),H=N(i,'height',1,240),wt=N(i,'weight',.01,1000),div=N(i,'divisor',50,1000),maxL=N(i,'maxLongest',1,300),maxG=N(i,'maxGirth',1,500),charge=N(i,'handling',0,10000);const s=[L,W,H].sort((a,b)=>b-a),dim=Math.ceil((L*W*H)/div),girth=s[0]+2*(s[1]+s[2]),trigger=s[0]>maxL||girth>maxG;
return R([{label:'Billable weight estimate',value:`${Q(Math.max(wt,dim))} lb`},{label:'Rounded dimensional weight',value:`${dim} lb`},{label:'Length + girth',value:`${Q(girth)} in`},{label:'Over entered limits',value:trigger?'YES — verify carrier restrictions':'No based on entered limits'},{label:'User-entered oversize charge',value:trigger?M(charge):M(0)}],['This does not represent a current FedEx/UPS/USPS surcharge table; dimensional divisor, measurement rounding, special-handling and published maximums vary by product/account/date.','Over the maximum often means freight or refusal, not merely an added fee. Weight billing rounding differs among carriers.'],['DIM weight = ceil((L×W×H)/entered divisor); girth = longest side + 2×(other sides).']);
}
