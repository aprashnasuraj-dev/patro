import {N,Q,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const w=N(i,'stitchesW',1,30000),h=N(i,'stitchesH',1,30000),count=N(i,'count',6,100),over=N(i,'over',1,4),border=N(i,'border',0,20),waste=N(i,'waste',0,30)/100;for(const v of [w,h,over])if(!Number.isInteger(v))throw Error('Stitch counts and over-threads must be whole numbers');
const stitchedW=w*over/count,stitchedH=h*over/count,cutW=(stitchedW+2*border)*(1+waste),cutH=(stitchedH+2*border)*(1+waste);
return R([{label:'Finished stitched motif',value:`${Q(stitchedW)} × ${Q(stitchedH)} in`},{label:'Recommended cut fabric',value:`${Q(cutW)} × ${Q(cutH)} in`},{label:'Metric cut dimensions',value:`${Q(cutW*2.54)} × ${Q(cutH*2.54)} cm`},{label:'Effective stitches per inch',value:Q(count/over)}],['Fabric count must be measured after laundering if shrinkage matters. Allowance is per outer edge before optional waste percentage.'],[`Stitched width = ${w} stitches × ${over} threads ÷ ${Q(count)} threads/in.`]);
}
