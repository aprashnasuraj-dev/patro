import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared calculation source; product tests have NOT been executed. */
export function calculate(i:Input):Result{
  const qty=num(i,'shares',1,1e9),fmv=num(i,'fmv',0,1e8),income=qty*fmv;const w=(num(i,'federalW',0,100)+num(i,'stateW',0,100)+num(i,'ficaW',0,100))/100,t=(num(i,'fedTrue',0,100)+num(i,'stateTrue',0,100)+num(i,'otherTrue',0,100))/100;const withheld=income*w,est=income*t;
  return output('Estimated withholding gap: '+usd(est-withheld),[metric('W-2 compensation at vest',usd(income)),metric('Estimated payroll withholding',usd(withheld)),metric('Estimated tax on vest income',usd(est)),metric('Additional tax / (surplus)',usd(est-withheld))],['Illustrative marginal-rate estimate; federal supplemental wage rates, Social Security wage base, additional Medicare tax, locality, state residency sourcing and other wages are not calculated.','Selling RSUs creates a separate capital-gain/loss event using vest-date basis; that sale is not included.']);
}
