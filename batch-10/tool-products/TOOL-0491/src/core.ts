import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared calculation source; product tests have NOT been executed. */
export function calculate(i:Input):Result{
  const q=num(i,'demand',1,5000000),electric=num(i,'electric',0,100),cop=num(i,'cop',.5,10);
  const therm=num(i,'gas',0,500),afue=num(i,'afue',.1,1),prop=num(i,'propane',0,500),pe=num(i,'propEff',.1,1),wood=num(i,'wood',0,100000),wBTU=num(i,'woodMBtu',1,40),we=num(i,'woodEff',.1,1);
  const options=[['Electric resistance',q*electric],['Heat pump',q/cop*electric],['Natural gas',q/(29.307107*afue)*therm],['Propane',q/(26.8*pe)*prop],['Firewood',q/(wBTU*293.07107*we)*wood]] as [string,number][];options.sort((a,b)=>a[1]-b[1]);
  return output('Cheapest estimated fuel: '+options[0][0],options.map(([label,val])=>metric(label,usd(val))),['Delivered space heat excludes installation, fixed connection charges, maintenance and regional taxes.','Seasonal COP and real wood moisture/heat content strongly influence ranking.'],options.map(([label,val])=>[label,usd(val),usd(val/q)+'/delivered kWh']));
}
