import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared calculation source; product tests have NOT been executed. */
export function calculate(i:Input):Result{
  const c=num(i,'compensation',0,1e8),e=num(i,'employee',0,72000),m=num(i,'employer',0,72000),o=num(i,'other',0,72000),plan=num(i,'planCap',0,72000);const cap=Math.min(c,72000),used=e+m+o,room=Math.max(0,cap-used),available=Math.min(room,plan);
  return output('2026 estimated available after-tax room: '+usd(available),[metric('IRS §415(c) annual-additions cap',usd(cap)),metric('Annual additions already used',usd(used)),metric('Remaining statutory room',usd(room)),metric('Plan-limited room',usd(available))],[...(used>cap?['Regular annual additions exceed the estimated statutory cap; reconcile plan records.']:[]),'Plan must specifically allow voluntary after-tax employee contributions and an in-plan Roth conversion or rollover; no plan permission is inferred.','Catch-up contributions are excluded from the §415(c) annual-additions amount, but cross-plan aggregation may matter.']);
}
