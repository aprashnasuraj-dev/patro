// pdf-lib is imported lazily only when user chooses to process a PDF.
// The app's build step must bundle the pinned pdf-lib dependency: no CDN/network use.
import {calculate} from './core';
export function mountPdfCropper():void {
 const root=document.getElementById('tool-app');if(!root)return;const out=root.querySelector('.output-column');if(!out)return;
 const sec=document.createElement('section');sec.className='special-panel';const h=document.createElement('h3');h.textContent='Local PDF crop and 4×6 output';
 const file=document.createElement('input');file.type='file';file.accept='application/pdf';file.setAttribute('aria-label','Select PDF to crop locally');
 const go=document.createElement('button');go.type='button';go.className='primary-action';go.textContent='Create 4×6-inch PDF';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');sec.append(h,file,go,status);out.append(sec);
 const value=(k:string):string=>(root.querySelector('#input-TOOL-0478-'+k) as HTMLInputElement|HTMLSelectElement|null)?.value||'';
 go.addEventListener('click',async()=>{go.disabled=true;status.textContent='';try{
 const f=file.files?.[0];if(!f||f.size<1||f.size>15_000_000||f.type!=='application/pdf')throw Error('Choose a local PDF under 15 MB');
 const params={x:value('x'),y:value('y'),width:value('width'),height:value('height'),page:value('page'),rotate:value('rotate')};calculate(params);
 const {PDFDocument}=await import('pdf-lib');const source=await PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:false});if(source.getPageCount()>100)throw Error('Limit: 100 source pages');const idx=Number(params.page)-1;if(idx<0||idx>=source.getPageCount())throw Error('Selected source page not found');
 const src=source.getPage(idx);const box=src.getMediaBox();const x=Number(params.x),y=Number(params.y),w=Number(params.width),h=Number(params.height);if(x<box.x||y<box.y||x+w>box.x+box.width||y+h>box.y+box.height)throw Error('Crop must fit within source MediaBox; rotated pages require manual orientation verification');
 const output=await PDFDocument.create();const embedded=await output.embedPage(src,{left:x,bottom:y,right:x+w,top:y+h});const landscape=params.rotate==='landscape';const W=landscape?432:288,H=landscape?288:432;
 const dest=output.addPage([W,H]);dest.drawPage(embedded,{x:0,y:0,width:W,height:H});const data=await output.save();if(data.length>25_000_000)throw Error('Output larger than 25 MB');
 const url=URL.createObjectURL(new Blob([new Uint8Array(data)],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download='thermal-label-4x6.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=`Generated one ${landscape?'landscape':'portrait'} page, 4×6 inches. Verify barcode before shipping.`;
 }catch(e){status.textContent=e instanceof Error?e.message:'Cannot process PDF'}finally{go.disabled=false}});
}
