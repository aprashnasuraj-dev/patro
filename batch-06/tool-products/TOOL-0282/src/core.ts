import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const distance=n(i,'distance',.1,500),seconds=integer(i,'seconds',1,172800),segment=n(i,'segment',.1,42.195);const k=seconds/distance, count=Math.ceil(distance/segment);if(count>250)throw new Error('Choose a longer split distance (max 250 splits).');const rows:string[][]=[];let last=0;for(let j=1;j<=count;j++){const at=Math.min(distance,j*segment),split=at-last;rows.push([String(j),f(at,3)+' km',duration(split*k),duration(at*k)]);last=at;}const tab=[['Split','At distance','Segment time','Elapsed time'],...rows];return res('Even-pace schedule for '+f(distance,2)+' km',[m('Pace per km',duration(k)),m('Speed',f(3600/k,2)+' km/h'),m('Pace per mile',duration(k*1.609344)),m('Target finish',duration(seconds))],['The final partial split uses its actual distance.'],rows,csvSafe(tab));
}
