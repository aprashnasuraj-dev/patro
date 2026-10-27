import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const a=n(i,'knownDistance',.4,100),s=integer(i,'knownSeconds',60,86400),b=n(i,'targetDistance',.4,100);const r=s*Math.pow(b/a,1.06);const fn=(metres:number)=>13.49681-.000030363*metres+835.7114/Math.pow(metres,.7905);const v1=fn(a*1000),v2=fn(b*1000);if(v1<=0||v2<=0)throw new Error('Cameron model invalid at these distances');const c=s/a*b*v1/v2;return res('Two model forecasts for '+f(b,2)+' km',[m('Riegel',duration(r)),m('Cameron',duration(c)),m('Model spread',duration(Math.abs(c-r)))],['These estimates are not race-time guarantees. Distance ratio '+f(b/a,2)+'×; longer extrapolation has more uncertainty.'],[['Riegel','T₂=T₁×(D₂/D₁)^1.06',duration(r)],['Cameron','Distance-dependent coefficient',duration(c)]]);
}
