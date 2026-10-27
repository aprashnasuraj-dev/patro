import {N,Q,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const w=N(i,'width',1,1500),h=N(i,'height',1,1500),b=N(i,'bleed',0,50),s=N(i,'safe',0,100),dpi=N(i,'dpi',72,1200);if(s*2>=Math.min(w,h))throw Error('Safe inset consumes entire trim');
const ow=w+2*b,oh=h+2*b, sw=w-2*s,sh=h-2*s;
return R([{label:'Full artwork canvas',value:`${Q(ow)} × ${Q(oh)} mm`},{label:'Trim dimensions',value:`${Q(w)} × ${Q(h)} mm`},{label:'Inner safe text area',value:`${Q(sw)} × ${Q(sh)} mm`},{label:'Raster guide at entered DPI',value:`${Q(ow/25.4*dpi,0)} × ${Q(oh/25.4*dpi,0)} px`}],['Bleed and safe margins are printer-specific input parameters, not default specifications for every press or product.','SVG guide uses real millimeters; verify print scaling at 100% and vendor export specifications.'],[`Outer=trim+2×bleed; safe=trim−2×inset.`]);
}
