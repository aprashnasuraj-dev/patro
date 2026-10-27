import {N,Q,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const mins=N(i,'minutes',0,50000),sec=N(i,'seconds',0,59.999),v=N(i,'videoMbps',.001,5000),a=N(i,'audioKbps',0,5000),ov=N(i,'overhead',0,30)/100,target=N(i,'targetMB',.01,1e9);const t=mins*60+sec;if(t<=0)throw Error('Duration must be positive');
const bits=(v*1e6+a*1000)*t*(1+ov),bytes=bits/8,available=(target*1e6*8/t/(1+ov)-a*1000)/1e6;
return R([{label:'Estimated decimal file size',value:`${Q(bytes/1e6)} MB`},{label:'Estimated binary size',value:`${Q(bytes/1048576)} MiB`},{label:'Estimated raw bytes',value:Q(bytes,0)},{label:'Video Mbps for target MB',value:available>0?`${Q(available)} Mb/s`:'Unsupported: target too small for audio'}],['Average bitrate varies with VBR encoding. GOP overhead, metadata and audio tracks can affect actual output size.','Mb/s means decimal megabits per second (10⁶ bits/s); MB means 10⁶ bytes, MiB means 2²⁰ bytes.'],[`Bytes ≈ duration × (video bits/s + audio bits/s) × (1+overhead) ÷ 8.`]);
}
