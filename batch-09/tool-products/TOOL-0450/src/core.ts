import {N,S,Q,M,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const species=S(i,'species',10),brand=S(i,'brand',100),kcal=N(i,'calories',1,10000),g=N(i,'gramsPerCup',1,1000),daily=N(i,'dailyKcal',1,10000),kg=N(i,'bagKg',.01,200),cost=N(i,'bagCost',0,10000),t=N(i,'treatPct',0,50)/100;if(!['dog','cat'].includes(species)||!brand)throw Error('Species and package formula are required');const foodKcal=daily*(1-t),cups=foodKcal/kcal,grams=cups*g,days=kg*1000/grams;
return R([{label:'Food servings per day',value:`${Q(cups)} cups`},{label:'Daily food mass',value:`${Q(grams)} g`},{label:'Estimated package duration',value:`${Q(days)} days`},{label:'Daily food cost',value:M(cost/days)},{label:'30-day food budget',value:M(30*cost/days)}],[`No brand database is contacted; calorie and gram values must be transcribed from the ${brand} package.`, 'Daily target kcal should come from your veterinarian or pet nutrition plan; formula and portions require adjustment for condition, age, growth and activity.','Treat allowance is a percentage of daily kcal, not a promise that the total diet meets nutritional requirements.'],[`Daily cups = daily target kcal × (1−treat allowance) ÷ kcal per cup.`]);
}
