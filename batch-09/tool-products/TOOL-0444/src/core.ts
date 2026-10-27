import {N,Q,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const w=N(i,'w',1,200000),h=N(i,'h',1,200000),ppi=N(i,'ppi',36,2400),b=N(i,'bleed',0,20),wi=w/ppi,hi=h/ppi;
if(wi*25.4<=2*b||hi*25.4<=2*b)throw Error('Image cannot accommodate the entered bleed');return R([{label:'Maximum canvas at entered PPI',value:`${Q(wi)} × ${Q(hi)} in`},{label:'Same dimensions',value:`${Q(wi*2.54)} × ${Q(hi*2.54)} cm`},{label:'Trim size after bleed allowance',value:`${Q(wi*25.4-2*b)} × ${Q(hi*25.4-2*b)} mm`},{label:'Source pixel count',value:`${Q(w*h/1e6)} MP`}],['Physical size is limited by effective pixel density, not metadata DPI tags alone. Fine-art viewing distance and printer screening can justify a different chosen PPI.'],[`Width in inches = ${w} / ${ppi}; height = ${h} / ${ppi}.`]);
}
