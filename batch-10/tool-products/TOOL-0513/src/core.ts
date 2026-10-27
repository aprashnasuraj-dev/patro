import {num,decimal,positiveDecimal,restricted,choice,iso,addDays,addMonths,endOfMonth,dayDifference,csv,fmt,usd,gbp,cad,metric,output} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Prepared offline calculation. Runtime QA has not executed. */
export function calculate(i:Input):Result {
  const j=choice(i,'jurisdiction',['federal','ontario']),years=num(i,'serviceYears',0,80),w=num(i,'vacWages',0,1e8),hw=num(i,'holidayWages',0,1e8),hv=num(i,'holidayVacation',0,1e8),hours=num(i,'worked',0,24),rate=num(i,'hourly',0,100000);
  const pct=j==='federal'?(years>=10?.08:years>=5?.06:.04):(years>=5?.06:.04);const hol=j==='federal'?hw/20:(hw+hv)/20;const premium=hours*rate*1.5;
  return output('Estimated vacation pay: '+cad(w*pct),[metric('Annual vacation percentage',String(Math.round(pct*100))+'%'),metric('Annual vacation pay',cad(w*pct)),metric('Statutory holiday pay',cad(hol)),metric('Holiday worked premium scenario',cad(premium)),metric('Holiday pay + worked premium',cad(hol+premium))],['Federal holiday wages base and Ontario previous-four-workweek calculation have different inclusions.','Worked-holiday premium is a scenario only: some employees can instead receive regular wages plus a substitute paid day; eligibility, notice, agreements and exceptions matter.','Do not mix federal Canada Labour Code rules with provincial jurisdiction; Ontario statutory holiday eligibility and workplace-specific exceptions require verification.']);
}
