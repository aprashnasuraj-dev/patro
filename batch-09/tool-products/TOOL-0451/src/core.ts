import {N,S,Q,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const shape=S(i,'shape',20),l=N(i,'length',10,600),w=N(i,'width',10,600),h=N(i,'height',1,400),disp=N(i,'displacement',0,70)/100,ch=N(i,'change',0,95)/100,dose=N(i,'dosePer100',0,100000),scope=S(i,'doseScope',20);
if(!['rectangular','cylinder'].includes(shape)||!['new-water','whole-tank'].includes(scope))throw Error('Unsupported tank geometry or dose scope');const gross=(shape==='rectangular'?l*w*h:Math.PI*(l/2)**2*h)/1000,actual=gross*(1-disp),newWater=actual*ch,ml=(scope==='new-water'?newWater:actual)*dose/100;
return R([{label:'Estimated actual water volume',value:`${Q(actual)} L`},{label:'Water to replace',value:`${Q(newWater)} L`},{label:'Label-based liquid dose',value:`${Q(ml)} mL`},{label:'US gallons in tank',value:`${Q(actual/3.785411784)} US gal`}],[`The ${Q(disp*100)}% displacement estimate is supplied by you; internal water volume can differ from glass dimensions.`, 'Dose is strictly the manufacturer-supplied mL per 100 L and specified treatment scope. NOT suitable for medication, antibiotic or copper therapeutic dosing.','Check dechlorination and species-sensitive temperature, pH and salinity before adding water.'],[`Actual litres = geometric cm³ / 1000 × (1−displacement).`]);
}
