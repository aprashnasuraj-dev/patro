import {N,S,Q,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const w=N(i,'w',240,8192),h=N(i,'h',240,8192); const top=N(i,'top',0,49),bottom=N(i,'bottom',0,49),left=N(i,'left',0,49),right=N(i,'right',0,49);
const prof=S(i,'platform',60),msg=S(i,'message',100);if(!['Custom','YouTube Shorts illustrative','Instagram/Facebook Reels illustrative','TikTok illustrative'].includes(prof))throw Error('Unrecognized preview profile');if(!msg)throw Error('Caption is required');if(top+bottom>=95||left+right>=95)throw Error('Safe area has insufficient space');
const box={x:w*left/100,y:h*top/100,w:w*(1-(left+right)/100),h:h*(1-(top+bottom)/100)};
return R([{label:'Safe rectangle',value:`${Q(box.w,0)} × ${Q(box.h,0)} px`},{label:'Safe origin',value:`x ${Q(box.x,0)} · y ${Q(box.y,0)} px`},{label:'Usable canvas share',value:P(box.w*box.h/(w*h))},{label:'Canvas orientation',value:w<h?'Portrait':w===h?'Square':'Landscape'}],[`The ${prof} profile is an editable illustration, NOT an official pixel-exact platform overlay. Platform UI changes with app version, placement, captions and device.`,'Do not treat text inside this area as guaranteed visible on every device.'],[`Safe bounds: x=${Q(box.x,0)}, y=${Q(box.y,0)}, width=${Q(box.w,0)}, height=${Q(box.h,0)}.`]);
}
