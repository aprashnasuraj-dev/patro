import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const a=integer(i,'t400',120,3600),b=integer(i,'t200',60,1800);if(a<=b||a>=2.5*b)throw new Error('Trial times are inconsistent; 400m should take longer than 200m with comparable effort.');const per100=(a-b)/2;return res('Critical swim speed based on 400m and 200m trials',[m('CSS / 100 m',duration(per100)),m('CSS / 50 m',duration(per100/2)),m('CSS speed',f(100/per100,2)+' m/s')],['Use maximum-effort, same-pool tests; time trials are not a medical assessment.'],[['200 m trial',duration(b)],['400 m trial',duration(a)],['Time difference',duration(a-b)]]);
}
