import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared offline calculation. Runtime QA has not executed. */
export function calculate(i:Input):Result {
  const yr=choice(i,'incomeYear',['2025','2026']),threshold=yr==='2025'?93454:95323,other=num(i,'otherIncome',0,1e8),rrif=num(i,'rrif',0,1e8),oas=num(i,'annualOas',0,100000),balance=num(i,'openingRrif',0,1e9);
  if(rrif>balance)throw new Error('Proposed RRIF withdrawal exceeds entered balance.');
  const claw=(v:number)=>Math.min(oas,Math.max(0,v-threshold)*.15);const before=claw(other),after=claw(other+rrif);
  return output('Estimated OAS recovery: '+cad(after),[metric('Income-year threshold',cad(threshold)),metric('OAS recovery before RRIF',cad(before)),metric('After RRIF',cad(after)),metric('Incremental recovery',cad(after-before)),metric('Remaining RRIF',cad(balance-rrif))],['2026 income threshold is published for the July 2027–June 2028 recovery period; verify any provisional upper limits.','RRIF minimum withdrawals, RRIF tax withholding, taxation of OAS itself, pension splitting and marginal income tax are NOT calculated.','The 15% recovery is capped at actual OAS received; this is not a complete tax return or retirement withdrawal recommendation.']);
}
