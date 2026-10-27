import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const dose=n(i,'dose',0,1500),half=n(i,'halflife',2,12),elapsed=n(i,'elapsed',0,72);const rem=(hours:number)=>dose*Math.pow(2,-hours/half);return res('Estimated unmetabolized caffeine after '+f(elapsed,1)+' h',[m('Remaining',f(rem(elapsed),1)+' mg'),m('Share remaining',f(100*Math.pow(2,-elapsed/half),1)+'%')],['This is a simplified one-compartment decay estimate; actual elimination varies widely.','Do not use this estimate as medical safety guidance.'],[['Elapsed','Estimated remaining'],...[0,2,4,6,8,12,18,24].map(t=>[t+' h',f(rem(t),1)+' mg'])]);
}
