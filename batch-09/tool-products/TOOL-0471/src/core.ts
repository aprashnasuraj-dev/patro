import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Pure, bounded calculations; no user-data storage or network. */
export function calculate(i:Record<string,unknown>):Result {
const dir=S(i,'direction',25),c=N(i,'credits',0,100000),ratio=N(i,'ratio',.1,10),dp=N(i,'round',0,4);if(!Number.isInteger(dp)||!['quarter → semester','semester → quarter'].includes(dir))throw Error('Invalid direction or decimal count');const converted=dir==='quarter → semester'?c*ratio:c/ratio;
return R([{label:'Converted credits',value:Q(converted,dp)},{label:'Unrounded model value',value:String(converted)},{label:'Original units',value:dir.split(' → ')[0]},{label:'Receiving credit type',value:dir.split(' → ')[1]}],[`Exact 2/3 is a commonly used planning ratio, but institutions such as UW–Madison may publish 0.67 and round each transferred course separately.`, 'Do not round a combined total when the recipient rounds each course independently. Foreign academic systems require distinct evaluation.'],['Quarter credits × entered multiplier = semester credits; reverse conversion divides by that multiplier.']);
}
