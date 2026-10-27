import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared offline calculation. Runtime QA has not executed. */
export function calculate(i:Input):Result {
  const j=choice(i,'jurisdiction',['NSW','VIC','QLD','WA','SA','TAS','ACT','NT','award-or-agreement']),yrs=num(i,'years',0,70),rate=num(i,'entitlementWeeks',0,3),taken=num(i,'alreadyTaken',0,150),pay=num(i,'weeklyPay',0,1e7),term=choice(i,'termination',['no','yes']);const accrual=yrs*rate,available=Math.max(0,accrual-taken);
  return output('Illustrative accrued leave balance: '+fmt(available,2)+' weeks',[metric('Gross accrued',fmt(accrual,2)+' weeks'),metric('Leave used',fmt(taken,2)+' weeks'),metric('Unused balance',fmt(available,2)+' weeks'),metric('Indicative ordinary pay value','A$'+fmt(available*pay,2))],['No entitlement or payout eligibility is asserted: state law, years-before-vesting, pro-rata termination conditions, award overrides and portable schemes differ.','The user-entered accrual rate MUST come from the applicable legal source; this tool does not select it for you.',...(term==='yes'?['On termination, service qualification and termination reason require independent assessment before any payout.']:[])]);
}
