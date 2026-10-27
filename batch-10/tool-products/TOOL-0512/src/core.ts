import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared offline calculation. Runtime QA has not executed. */
export function calculate(i:Input):Result {
  const years=num(i,'yearsOpen',1,15),contributed=num(i,'contributed',0,100000),unused=num(i,'unusedLast',0,8000),thisYear=num(i,'thisYear',0,50000),prior=num(i,'hbpPrior',0,60000),planned=num(i,'hbpPlanned',0,60000);
  if(!Number.isInteger(years))throw new Error('Years open must be whole calendar years.');
  const grossRoom=Math.min(8000+Math.min(unused,8000),Math.max(0,40000-contributed));const remaining=Math.max(0,grossRoom-thisYear);const hbpRoom=60000-prior;
  return output('Remaining FHSA contribution room: '+cad(remaining),[metric('Illustrative current-year FHSA room',cad(grossRoom)),metric('Remaining after entered current-year deposits',cad(remaining)),metric('Remaining HBP withdrawal ceiling',cad(hbpRoom)),metric('HBP planned',cad(planned)),metric('Indicative annual HBP repayment (15-year)',cad(planned/15))],[...(planned>hbpRoom?['Proposed HBP withdrawal exceeds unused HBP capacity.']:[]),'FHSA and HBP eligibility, qualifying home, account-opening restrictions, tax residency and spousal history must be independently verified.','This simplified tool assumes prior excess-designation and recontribution events do not exist; get official CRA participation records if they do.','HBP repayment commencement can be deferred or modified under transitional rules.']);
}
