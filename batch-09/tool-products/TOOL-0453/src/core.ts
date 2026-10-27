import {N,Q,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const sp=N(i,'sphere',-30,30),cyl=N(i,'cyl',-12,12),axis=N(i,'axis',1,180),d=N(i,'vertex',0,30)/1000;if(!Number.isInteger(axis))throw Error('Axis must be an integer in degrees');const one=1-d*sp,two=1-d*(sp+cyl);if(one<=0||two<=0)throw Error('Singular or non-physical conversion for entered vertex and powers');const fs=sp/one,fc=(sp+cyl)/two-fs;
return R([{label:'Theoretical corneal-plane sphere',value:`${Q(fs)} D`},{label:'Theoretical corneal-plane cylinder',value:`${Q(fc)} D`},{label:'Unchanged geometric axis',value:`${axis}°`},{label:'Original meridional powers',value:`${Q(sp)} D / ${Q(sp+cyl)} D`}],['Not a contact lens prescription. Actual contact lens power, axis, material, base curve, diameter and fit require professional eye examination and trial fitting.','Rounded 0.25-D equivalents may not be stocked, and the actual toric lens may rotate on-eye. Never order or use contacts from this result alone.'],[`For each principal meridian: Fnew = Fold / (1 − ${Q(d,3)} × Fold). Cylinder is converted meridian difference.`]);
}
