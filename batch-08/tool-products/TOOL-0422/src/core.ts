import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const annual=N(i,'salary',0,1e9)+N(i,'benefits',0,1e9)+N(i,'overhead',0,1e9);
const hours=N(i,'weeks',1,52)*N(i,'hours',1,100);const tax=N(i,'extraTaxPct',0,70)/100,buffer=N(i,'contingencyPct',0,60)/100;
const price=annual/(hours*(1-tax-buffer));return R([{label:'Minimum billed hourly rate',value:M(price)},{label:'Annual billable hours',value:Q(hours,0)},{label:'Target billed revenue',value:M(price*hours)}],['The tax differential is an input, not a statutory tax calculation. Employment classification cannot be selected simply by issuing a 1099.'],[`Combined annual replacement target: ${M(annual)}. Net-of-tax/reserve fraction: ${P(1-tax-buffer)}.`]);

}
