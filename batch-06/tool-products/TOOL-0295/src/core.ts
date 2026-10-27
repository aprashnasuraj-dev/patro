import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const pace=integer(i,'pace',120,1800),grade=n(i,'grade',-20,20),g=grade/100;const c=155.4*g**5-30.4*g**4-43.3*g**3+46.3*g*g+19.5*g+3.6;if(c<=0)throw new Error('Unsupported grade for this cost model');const flat=pace*3.6/c;return res('Model-based flat equivalent pace',[m('Observed',duration(pace)+' /km'),m('Flat-equivalent',duration(flat)+' /km'),m('Grade cost multiplier',f(c/3.6,3)+'×')],['Minetti energy-cost polynomial is a generic model, not measured individual running economy.','Downhill technical terrain may not follow metabolic equivalence.'],[['Grade',f(grade,1)+'%'],['Modeled cost',f(c,3)+' J/kg/m'],['Flat reference','3.600 J/kg/m']]);
}
