import { decodeImage, bitmapSize, makeCanvas, canvasToBlob } from '../_vendor/image';
import { assertFinite } from '../_vendor/limits';
export type CompressionResult={blob:Blob,quality:number,width:number,height:number,bytes:number,targetBytes:number,warning?:string};
async function encode(c:HTMLCanvasElement,q:number){return canvasToBlob(c,'image/jpeg',q)}
export async function compressToBudget(file:File,targetKb:number,minQuality=.35):Promise<CompressionResult>{
  assertFinite(targetKb,'Target KB',10,10000); assertFinite(minQuality,'Minimum quality',.1,.95); const target=Math.floor(targetKb*1024); const bmp=await decodeImage(file); let {width,height}=bitmapSize(bmp); let scale=1;
  for(let resizePass=0;resizePass<8;resizePass++){
    const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale)); const c=makeCanvas(w,h),ctx=c.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable.'); ctx.drawImage(bmp as CanvasImageSource,0,0,width,height,0,0,w,h);
    let lo=minQuality,hi=.96,best:Blob|null=null,bestQ=lo;
    for(let i=0;i<10;i++){ const q=(lo+hi)/2,blob=await encode(c,q); if(blob.size<=target){best=blob;bestQ=q;lo=q}else hi=q; }
    if(best) return {blob:best,quality:bestQ,width:w,height:h,bytes:best.size,targetBytes:target,warning:best.size<target*.75?'Encoder granularity produced a result well below the requested cap.':undefined};
    scale*=.85;
  }
  throw new Error('Target is too small for the configured minimum quality and safety bounds.');
}

