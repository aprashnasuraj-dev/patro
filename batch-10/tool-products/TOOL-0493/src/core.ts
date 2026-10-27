import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared calculation source; product tests have NOT been executed. */
export function calculate(i:Input):Result{
  const h=num(i,'heads',1,100000),w=num(i,'weight',10,10000),pct=num(i,'intake',.1,10)/100,share=num(i,'share',0,100)/100,dm=num(i,'hayDM',.3,1),days=num(i,'days',1,3660),loss=num(i,'loss',0,80)/100;
  const perDay=h*w*pct*share/dm/(1-loss),total=perDay*days;
  return output('Plan '+fmt(total/2000,2)+' short tons of hay',[metric('As-fed hay per day',fmt(perDay,1)+' lb'),metric('Total hay',fmt(total,0)+' lb'),metric('Short tons',fmt(total/2000,2))],['Not a ration formulation: species, workload, gestation, hay tests, toxins, minerals and water must be reviewed by a veterinarian/nutritionist.','Dry-matter percentage refers to actual bale moisture, not crude protein.']);
}
