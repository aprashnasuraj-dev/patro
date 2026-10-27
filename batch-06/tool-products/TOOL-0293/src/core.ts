import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const start=n(i,'start',.5,500),weeks=integer(i,'weeks',1,52),growth=n(i,'increase',0,20),cut=integer(i,'cutback',0,12),drop=n(i,'drop',0,60);let q=start;const rows=[['Week 1',f(q,1)+' km','Baseline']];for(let j=2;j<=weeks;j++){const down=cut>0&&j%cut===0;q=q*(down?1-drop/100:1+growth/100);rows.push(['Week '+j,f(q,1)+' km',down?'Cutback':'Increase']);}return res('Progressive weekly distance plan',[m('Starting week',f(start,1)+' km'),m('Final week',f(q,1)+' km'),m('Highest week',f(Math.max(...rows.map(r=>Number(r[1].replace(' km','')))),1)+' km')],['Training adaptation cannot be reduced to mileage alone. Adjust for intensity, terrain and recent injuries.'],[['Week','Distance','Phase'],...rows]);
}
