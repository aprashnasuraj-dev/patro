import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const hours=n(i,'duration',.25,24),target=n(i,'target',0,120),portion=n(i,'portion',1,150),every=integer(i,'every',5,120);const grams=hours*target,perFeed=target*every/60;const range=hours<1?'Short sessions often need little additional carbohydrate.':hours<=2.5?'Typical reference: 30–60 g/hour.':'Longer efforts may use 60–90 g/hour only if gut-trained.';const rows=[['Event total',f(grams,1)+' g'],['Per feeding',f(perFeed,1)+' g every '+every+' min'],['Product portions needed',f(grams/portion,2)],['Number of feedings (nominal)',f(hours*60/every,1)]];return res('Endurance carbohydrate delivery plan',[m('Total carbs',f(grams,1)+' g'),m('Grams per feeding',f(perFeed,1)+' g'),m('Portions',f(grams/portion,2))],[range,target>90?'Over 90g/h is beyond many typical guidelines; specialized gut training and care needed.':'Hydration and stomach tolerance are not estimated.'],rows);
}
