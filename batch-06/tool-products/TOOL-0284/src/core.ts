import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const age=integer(i,'age',18,100),rest=integer(i,'resting',30,130),measured=integer(i,'measuredMax',0,240),max=measured||208-.7*age;if(rest>=max)throw new Error('Resting heart rate must be below maximum');const bands=[['Easy',.50,.60],['Moderate',.60,.70],['Steady',.70,.80],['Hard',.80,.85]] as const;const rows=bands.map(([label,lo,hi])=>[label,Math.round(rest+(max-rest)*lo)+'–'+Math.round(rest+(max-rest)*hi)+' bpm',Math.round(max*lo)+'–'+Math.round(max*hi)+' bpm']);return res('Heart-rate reserve versus % of maximum',[m('Maximum used',f(max,0)+' bpm'),m('Heart-rate reserve',f(max-rest,0)+' bpm')],[measured?'Maximum is user-measured; ensure protocol was suitable.':'Maximum derived from age; individual error can be substantial.','Medication and cardiac conditions can invalidate standard targets.'],[['Training band','Karvonen (HR reserve)','% of max HR'],...rows]);
}
