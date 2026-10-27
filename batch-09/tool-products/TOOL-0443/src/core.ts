import {N,S,Q,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const provider=S(i,'provider',40),stock=S(i,'stock',40),pages=N(i,'pages',24,1200),w=N(i,'trimW',1,12),h=N(i,'trimH',1,15),b=N(i,'bleed',0,.5);
if(!Number.isInteger(pages)||pages%2)throw Error('Final page count must be even');const factors:Record<string,number>={'white':.002252,'cream':.0025,'groundwood':.00235,'standard-color':.002252,'premium-color':.002347};
if(!Object.hasOwn(factors,stock))throw Error('Unknown paper option');if(!['KDP','IngramSpark — verified caliper'].includes(provider))throw Error('Unknown printer');
if(provider==='KDP'&&pages>828)throw Error('Pages above KDP 828 general maximum unsupported; actual max depends on stock and trim');
if(provider==='KDP'&&stock==='standard-color'&&pages<72)throw Error('Standard color KDP typically requires at least 72 pages');
const thickness=provider==='KDP'?factors[stock]:N(i,'caliper',.001,.01),spine=pages*thickness,cw=2*w+spine+2*b,ch=h+2*b;
return R([{label:'Calculated spine width',value:`${Q(spine,4)} in`},{label:'Full wrap width',value:`${Q(cw,4)} in`},{label:'Full wrap height',value:`${Q(ch,4)} in`},{label:'Spine text guidance',value:provider==='KDP'?(pages>79?'Page count allows evaluation':'KDP does not print spine text at ≤79 pages'):'Use vendor template'}],[provider==='KDP'?'KDP paper/trim-specific page caps and current stock availability must be checked against current help tables.':'IngramSpark caliper is a user-confirmed value, NOT a verified stock formula.', 'Real printer cover template, fold tolerance, barcode clear area and safe zones may override this SVG.'],[`Spine = ${pages} pages × ${Q(thickness,6)} in/page; width = 2×trim + spine + 2×bleed.`]);
}
