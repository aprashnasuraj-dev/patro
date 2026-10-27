import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const c=S(i,'country'); const area=N(i,'officeSqFt',1,100000), home=N(i,'homeSqFt',1,1e6); if(area>home)throw Error('Workspace cannot exceed dwelling area');
const costs=N(i,'annualCosts',0,1e8),time=N(i,'businessTimePct',0,100)/100,months=N(i,'months',1,12),income=N(i,'businessIncome',0,1e9);
if(!Number.isInteger(months))throw Error('Eligible months must be an integer');const actual=costs*(area/home)*time*months/12;let alternate=0; let label='Comparison method'; let note='';
if(c==='US'){alternate=Math.min(5*Math.min(area,300)*months/12,income);label='US simplified estimate (USD)';note='IRS $5/ft², max 300 ft²; assumes qualified use and full-month periods. Compare against actual costs; eligibility and income limitations apply.';}
else if(c==='AU'){alternate=N(i,'auRate',0,10)*N(i,'auHours',0,8760);label='AU fixed-rate estimate (AUD)';note='Hourly rate is supplied by you, not validated for the income year; covered actual costs cannot also be claimed.';}
else if(c==='CA'){alternate=Math.min(actual,income);label='CA income-limited estimated amount (CAD)';note='Carryforward and precise eligibility need separate evaluation; no duplicate claims.';}
else if(c==='UK'){alternate=actual;label='UK apportioned expense estimate (GBP)';note='No UK flat-rate method inferred: expenses and usage must be allowable.';}
else throw Error('Unsupported tax location');
const symbols:Record<string,string>={US:'$',UK:'£',CA:'C$',AU:'A$'}; const sym=symbols[c];
return R([{label:'Actual-cost allocation',value:M(actual,sym)},{label,value:M(alternate,sym)}],[note,'Illustrative estimate, not an eligibility determination; currency inputs must match the country.'],[`Workspace share: ${P(area/home)}; time-weighted: ${P(time)}; active months: ${months}/12.`]);

}
