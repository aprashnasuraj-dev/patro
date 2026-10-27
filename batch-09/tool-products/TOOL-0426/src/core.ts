import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const basis=N(i,'purchase',0,1e10),land=N(i,'land',0,1e10),improve=N(i,'improvements',0,1e10),years=N(i,'years',0,27.5),sale=N(i,'sale',0,1e10);if(land>basis)throw Error('Land allocation exceeds total basis');
const building=basis-land+improve; const annual=building/27.5,acc=Math.min(building,annual*years),adjusted=basis+improve-acc,gain=sale-adjusted,potential=Math.min(acc,Math.max(gain,0));
return R([{label:'Full-year straight-line depreciation',value:M(annual)},{label:'Modeled accumulated depreciation',value:M(acc)},{label:'Adjusted modeled basis',value:M(adjusted)},{label:'Gain before other tax adjustments',value:M(gain)},{label:'Potential unrecaptured gain portion',value:M(potential)}],['US residential rental buildings use 27.5-year GDS and mid-month conventions; this is an equivalent-years scenario, NOT a tax-return schedule.','Recapture/unrecaptured §1250 tax liability cannot be calculated from the sale alone; entity, depreciation allowed/allowable, exclusions and other basis adjustments matter.'],[`Depreciable building basis = ${M(building)}; full-year allowance = basis / 27.5.`]);

}
