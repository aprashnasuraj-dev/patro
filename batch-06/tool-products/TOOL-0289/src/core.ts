import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const wake=clock(i,'wake'),lag=integer(i,'latency',0,120),rows=[7,8,9].map(h=>[h+' hours sleeping',minutesToClock(wake-h*60-lag),minutesToClock(wake-h*60),h+' h']);return res('Bedtime options for your target wake-up',[m('Wake-up',minutesToClock(wake)),m('Sleep latency',lag+' min')],['Durations reflect estimated total sleep, not exact 90-minute cycles.','Most adults need at least 7 hours; individual needs vary.'],[['Sleep duration','Get into bed','Estimated sleep start','Duration'],...rows]);
}
