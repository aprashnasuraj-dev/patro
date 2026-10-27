import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Pure, bounded calculations; no user-data storage or network. */
export function calculate(i:Record<string,unknown>):Result {
const mx=N(i,'maxPixels',1000000,40000000),w=N(i,'targetW',64,8192),h=N(i,'targetH',64,8192),mode=S(i,'mode',20),format=S(i,'format',20);if(![w,h,mx].every(Number.isInteger)||w*h>mx)throw Error('Output exceeds pixel budget');if(!['contain','cover'].includes(mode)||!['image/jpeg','image/png'].includes(format))throw Error('Unsupported mode or encoding');return R([{label:'Output canvas',value:`${w} × ${h} px`},{label:'Requested fit',value:mode},{label:'Encoder',value:format}],[`Platform photo content rules, required main-image backgrounds, crop compliance and CMYK handling are not verified; ${format==='image/jpeg'?'transparency is flattened for JPEG.':'transparent pixels may remain.'}`,'Browsers can discard EXIF/GPS metadata during canvas encoding; check orientation and published output before use.'],['Previewed dimensions are checked before loading the local source image into a bounded canvas.']);
}
