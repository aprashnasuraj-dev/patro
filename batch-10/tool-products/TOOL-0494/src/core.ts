import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared calculation source; product tests have NOT been executed. */
export function calculate(i:Input):Result{
  const birds=num(i,'birds',1,100000),coop=num(i,'coop',.5,100),run=num(i,'run',1,500),feed=num(i,'feed',.01,5),days=num(i,'days',1,365),w=num(i,'waste',0,80)/100;
  return output('Plan '+fmt(birds*coop,0)+' sq ft indoors',[metric('Coop floor',fmt(birds*coop,1)+' sq ft'),metric('Run',fmt(birds*run,1)+' sq ft'),metric('Feed',fmt(birds*feed*days/(1-w),1)+' lb')],['Space allowances are editable husbandry planning choices, not building or welfare code certifications.','Ventilation, temperature, perches, predator control and breed/age-specific feed remain critical.']);
}
