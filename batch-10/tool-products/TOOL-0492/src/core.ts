import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared calculation source; product tests have NOT been executed. */
export function calculate(i:Input):Result{
  const mode=choice(i,'mode',['battery','generator']),load=num(i,'load',1,100000);
  if(mode==='battery'){const wh=num(i,'capacity',1,1e7),d=num(i,'discharge',.1,1),eff=num(i,'inverter',.4,1),usable=wh*d*eff,h=usable/load;return output('Battery runtime: '+fmt(h,2)+' hours',[metric('Usable AC energy',fmt(usable,1)+' Wh'),metric('Estimated runtime',fmt(h,2)+' hours'),metric('AC load',fmt(load,0)+' W')],['Peak/inrush currents, standby draw, aging and temperature may shorten runtime.','Check inverter continuous/surge power rating separately.']);}
  const fuel=num(i,'fuel',.01,1e6),rate=num(i,'burn',.01,1000);return output('Generator runtime: '+fmt(fuel/rate,2)+' hours',[metric('Estimated runtime',fmt(fuel/rate,2)+' hours'),metric('Fuel consumption',fmt(rate,2)+' US gal/h')],['Enter manufacturer-measured consumption at this exact load; interpolating linearly is not valid.','Never operate combustion generators indoors or in garages.']);
}
