import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const idx=N(i,'index',84,120);if(!Number.isInteger(idx))throw Error('Load index must be a whole number');const symbol=S(i,'speed',1);
const loads=[500,515,530,545,560,580,600,615,630,650,670,690,710,730,750,775,800,825,850,875,900,925,950,975,1000,1030,1060,1090,1120,1150,1180,1215,1250,1285,1320,1360,1400];
const speeds:Record<string,number>={Q:160,R:170,S:180,T:190,U:200,H:210,V:240,W:270,Y:300};if(!(symbol in speeds))throw Error('Unsupported speed rating symbol');
const kg=loads[idx-84];if(kg===undefined)throw Error('Unsupported load index');
return R([{label:'Nominal maximum load per tire',value:Q(kg,0)+' kg / '+Q(kg*2.20462262,0)+' lb'},{label:'Speed service symbol',value:symbol+' · '+Q(speeds[symbol],0)+' km/h'}],['Only a subset of passenger-car service descriptions is supported (84–120, Q–Y); no dual-load, ZR, LT or parentheses tire designations.','Ratings are not permission to drive at that speed, ignore vehicle placard, tire pressure or road limits.'],[`Index ${idx} maps to reference maximum ${Q(kg,0)} kg, subject to rating conditions.`]);

}
