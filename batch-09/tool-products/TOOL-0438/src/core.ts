import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const gross=N(i,'gross',0,1e9),fees=N(i,'fees',0,1e9),mi=N(i,'miles',0,1e7),fuel=N(i,'fuel',0,10),wear=N(i,'wear',0,10),fixed=N(i,'fixed',0,1e9),hours=N(i,'hours',.1,1000),r=N(i,'reserve',0,80)/100;
const pre=gross-fees-mi*(fuel+wear)-fixed,tax=Math.max(0,pre)*r,after=pre-tax;
return R([{label:'Economic net after user tax reserve',value:M(after)},{label:'Before-reserve operating profit',value:M(pre)},{label:'Income per all-work hour',value:M(after/hours)},{label:'Net per business mile',value:mi?M(after/mi):'Unsupported: enter nonzero miles'}],['Taxes are only a cash reserve; no federal, state, employment or sales tax liability is computed.','Depreciation and maintenance are estimates and may not equal current cash outlays; deadhead mileage must be included.'],[`Economic operating cost = fees + miles × (energy + wear) + period fixed costs.`]);

}
