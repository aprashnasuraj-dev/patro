import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const pattern=opt(i,'pattern',['box','478']),cycles=integer(i,'cycles',1,30);const phase=pattern==='box'?[['Inhale',4],['Hold',4],['Exhale',4],['Hold',4]]:[['Inhale',4],['Hold',7],['Exhale',8]];const total=phase.reduce((sum,p)=>sum+Number(p[1]),0)*cycles;return res(pattern==='box'?'Box breathing: 4–4–4–4':'4–7–8 breathing: inhale, hold, exhale',[m('Session duration',duration(total)),m('Breathing cycles',String(cycles))],['Stop at any point if dizzy or short of breath.','This breathing aid is not a medical treatment.'],[['Phase','Seconds'],...phase.map(p=>[String(p[0]),String(p[1])])]);
}
