import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared calculation source; product tests have NOT been executed. */
export function calculate(i:Input):Result{
  const base=num(i,'fmv',0,1e10)*num(i,'share',.0001,100)/100+num(i,'improvement',0,1e10)+num(i,'adjust',-1e10,1e10),net=num(i,'sale',0,1e10)-num(i,'selling',0,1e9);if(base<0)throw new Error('Adjusted basis cannot be negative.');return output('Indicative taxable gain before exclusions: '+usd(net-base),[metric('Inherited interest basis',usd(base)),metric('Net amount realized',usd(net)),metric('Indicative capital gain / loss',usd(net-base))],['Date-of-death fair market value does not apply identically to every property; special-use, community property, joint ownership and alternate valuation rules may override.','Estate-tax consistency reporting on IRS Form 8971 and home-sale exclusion/depreciation recapture may change recognized gain.']);
}
