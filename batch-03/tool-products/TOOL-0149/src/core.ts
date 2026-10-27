import { loadPdfLib } from '../_vendor/pdf';
function pt(v:number,unit:'mm'|'pt'|'in'){if(!Number.isFinite(v)||v<0)throw new Error('Crop margins must be non-negative numbers.');return unit==='mm'?v*72/25.4:unit==='in'?v*72:v}
export async function cropMargins(file:File,m:{top:number,right:number,bottom:number,left:number},unit:'mm'|'pt'|'in'='mm'):Promise<Blob>{const {doc}=await loadPdfLib(file);for(const p of doc.getPages()){const box=p.getCropBox(),l=pt(m.left,unit),r=pt(m.right,unit),t=pt(m.top,unit),b=pt(m.bottom,unit),w=box.width-l-r,h=box.height-t-b;if(w<=0||h<=0)throw new Error('Margins would produce an empty crop box.');p.setCropBox(box.x+l,box.y+b,w,h)}return new Blob([await doc.save()],{type:'application/pdf'});}

