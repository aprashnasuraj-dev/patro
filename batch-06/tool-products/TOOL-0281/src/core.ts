import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const w=n(i,'weight',1,1000),r=integer(i,'reps',1,15);const models=[['Epley',r===1?w:w*(1+r/30)],['Brzycki',r===1?w:36*w/(37-r)],['Lombardi',r===1?w:w*Math.pow(r,.1)]] as [string,number][];const values=models.map(v=>v[1]);const mid=values.reduce((a,b)=>a+b,0)/3;return res('Estimated 1RM range: '+f(Math.min(...values),1)+'–'+f(Math.max(...values),1)+' kg',[m('Mean estimate',f(mid,1)+' kg'),m('Spread',f(Math.max(...values)-Math.min(...values),1)+' kg'),m('Completed reps',String(r))],r>10?['More than ten repetitions increases extrapolation error.']:['Maximum lifts require proper technique, spotting and appropriate supervision.'],models.map(([name,val])=>[name,f(val,2)+' kg']));
}
