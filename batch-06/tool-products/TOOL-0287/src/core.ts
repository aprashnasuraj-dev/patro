import {n,integer,opt,str,clock,minutesToClock,f,m,res,duration,csvSafe} from '../_vendor/runtime.js';
import type {Input,Result} from '../_vendor/runtime.js';
/** Source prepared for later integration. Tests are TEST_PENDING, not PASS. */
export function calculate(i:Input):Result{
const ftp=integer(i,'ftp',20,1500),mass=n(i,'mass',20,300);const bounds=[.55,.75,.90,1.05,1.20],labels=['Z1 Recovery','Z2 Endurance','Z3 Tempo','Z4 Threshold','Z5 VO₂max','Z6 Anaerobic'];let lo=0;const rows=labels.map((name,j)=>{const hi=j<bounds.length?Math.round(ftp*bounds[j]):undefined;const s=[name,j===5?'> '+(lo-1)+' W':lo+'–'+hi+' W'];if(hi!==undefined)lo=hi+1;return s;});return res('FTP training power bands',[m('FTP',ftp+' W'),m('Power-to-weight',f(ftp/mass,2)+' W/kg')],['Zone 7 sprint power is not defined as a fixed percentage of FTP.','FTP estimates vary by testing method, fatigue and training status.'],[['Zone','Target watts'],...rows]);
}
