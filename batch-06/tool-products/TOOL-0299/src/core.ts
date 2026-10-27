import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const pace=integer(i,'pace',120,1800),alt=n(i,'altitude',0,6000),ref=n(i,'reference',0,6000),rate=n(i,'effect',0,15);if(alt<ref)throw new Error('Target altitude must be at or above baseline for this model.');const climb=(alt-ref)/1000,adj=pace*(1+rate/100*climb);return res('Sensitivity estimate using your altitude penalty',[m('Baseline pace',duration(pace)+' /km'),m('Estimated target pace',duration(adj)+' /km'),m('Difference',f(adj-pace,1)+' s/km')],['The assumed slowdown percentage is user-selected, NOT a measured universal altitude adjustment.','Acclimatization, altitude illness, exertion and event duration are not modeled.'],[['Assumed % per 1000m','Target pace'],...[Math.max(0,rate-1),rate,Math.min(15,rate+1)].map(x=>[f(x,1)+'%',duration(pace*(1+x/100*climb))])]);
}
