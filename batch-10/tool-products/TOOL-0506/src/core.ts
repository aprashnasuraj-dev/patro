import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared calculation source; product tests have NOT been executed. */
export function calculate(i:Input):Result{
  const rent=num(i,'rent',0,1e8),loan=num(i,'loan',1,1e9),rate=num(i,'stress',.01,40)/100,target=num(i,'target',100,300)/100,monthlyInterest=loan*rate/12,icr=rent/monthlyInterest,maximum=rent*12/(rate*target);return output('Stressed ICR: '+fmt(icr*100,1)+'%',[metric('Monthly stressed interest',gbp(monthlyInterest)),metric('Stressed ICR',fmt(icr*100,1)+'%'),metric('Maximum loan at target',gbp(maximum)),metric('Loan headroom / shortfall',gbp(maximum-loan))],[...(icr<target?['The entered borrowing fails the selected ICR threshold.']:[]),'Lenders may apply different ICR, stress rates, tax brackets, personal income support, fees and product rules.','This is interest coverage only, not actual affordability or an offer of lending.']);
}
