import {N,Q,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const w=N(i,'sheetW',20,1000),h=N(i,'sheetH',20,1000),cols=N(i,'cols',1,30),rows=N(i,'rows',1,40),lw=N(i,'labelW',1,500),lh=N(i,'labelH',1,500),left=N(i,'left',0,300),top=N(i,'top',0,300),gx=N(i,'gapX',0,100),gy=N(i,'gapY',0,100),x=N(i,'offsetX',-20,20),y=N(i,'offsetY',-20,20);
if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols*rows>300)throw Error('Label count must be whole and ≤300');const endX=left+x+cols*lw+(cols-1)*gx,endY=top+y+rows*lh+(rows-1)*gy;
if(left+x<0||top+y<0||endX>w||endY>h)throw Error('Calibrated label grid would be clipped by sheet boundaries');
return R([{label:'Total labels per sheet',value:Q(cols*rows,0)},{label:'Occupied grid X boundary',value:`${Q(left+x)}–${Q(endX)} mm`},{label:'Occupied grid Y boundary',value:`${Q(top+y)}–${Q(endY)} mm`},{label:'Printer adjustment',value:`Δx ${Q(x)} mm · Δy ${Q(y)} mm`}],['Verify exact commercial label SKU dimensions including side margins and pitch. Test on plain paper before printing on label stock.','Print at 100% scale: disable fit-to-page, shrink and borderless overrides.'],[`Final X = left margin + calibration offset + column × (label width + horizontal gap).`]);
}
