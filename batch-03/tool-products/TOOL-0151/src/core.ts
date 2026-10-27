import { loadPdfLib } from '../_vendor/pdf-local';
export type PageSize='A4'|'LETTER'|'LEGAL'|'CUSTOM'; export type Fit='contain'|'cover';
const sizes:Record<string,[number,number]>={A4:[595.2756,841.8898],LETTER:[612,792],LEGAL:[612,1008]};
export async function imagesToPdf(files:File[],o:{pageSize:PageSize,customWidthPt?:number,customHeightPt?:number,landscape?:boolean,marginPt:number,fit:Fit}){
 if(!files.length||files.length>80) throw new Error('Choose 1–80 images.'); const total=files.reduce((a,f)=>a+f.size,0); if(total>200*1024*1024) throw new Error('Combined image size exceeds 200 MB.');
 if(!Number.isFinite(o.marginPt)||o.marginPt<0||o.marginPt>144) throw new Error('Margin must be 0–144 pt.');
 const {PDFDocument}=await loadPdfLib(); const pdf=await PDFDocument.create();
 for(const f of files){ if(f.size>40*1024*1024) throw new Error(`${f.name} exceeds 40 MB.`); if(!/^image\/(png|jpeg|webp)$/i.test(f.type)) throw new Error(`${f.name}: PNG, JPEG or WebP only.`);
   const bmp=await createImageBitmap(f); let [pw,ph]=o.pageSize==='CUSTOM'?[o.customWidthPt||0,o.customHeightPt||0]:sizes[o.pageSize]; if(!(pw>=72&&ph>=72&&pw<=2880&&ph<=2880)) throw new Error('Custom page dimensions must be 72–2880 pt.'); if(o.landscape&&ph>pw)[pw,ph]=[ph,pw];
   const page=pdf.addPage([pw,ph]); const maxW=pw-2*o.marginPt,maxH=ph-2*o.marginPt; if(maxW<=0||maxH<=0) throw new Error('Margins leave no drawable page area.');
   let bytes=new Uint8Array(await f.arrayBuffer()), img:any; if(f.type==='image/png') img=await pdf.embedPng(bytes); else if(f.type==='image/jpeg') img=await pdf.embedJpg(bytes); else { const c=document.createElement('canvas'); c.width=bmp.width;c.height=bmp.height;c.getContext('2d')!.drawImage(bmp,0,0); const b=await new Promise<Blob>((res,rej)=>c.toBlob(x=>x?res(x):rej(new Error('WebP decode failed.')),'image/png')); img=await pdf.embedPng(new Uint8Array(await b.arrayBuffer())); }
   const s=o.fit==='cover'?Math.max(maxW/img.width,maxH/img.height):Math.min(maxW/img.width,maxH/img.height); const w=img.width*s,h=img.height*s; page.drawImage(img,{x:(pw-w)/2,y:(ph-h)/2,width:w,height:h}); bmp.close();
 }
 return await pdf.save({useObjectStreams:true});
}