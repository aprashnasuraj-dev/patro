import { decodeImage, bitmapSize, makeCanvas, canvasToBlob, supportsCanvasEncoding } from '../_vendor/image';
export type CompareResult={type:string,blob:Blob,bytes:number,ratio:number,warnings:string[]};
export async function compare(file:File,webpQuality=.82,avifQuality=.55):Promise<CompareResult[]>{
  const bmp=await decodeImage(file); const {width,height}=bitmapSize(bmp); const c=makeCanvas(width,height); const ctx=c.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable.'); ctx.drawImage(bmp as CanvasImageSource,0,0,width,height); const out:CompareResult[]=[];
  const webp=await canvasToBlob(c,'image/webp',webpQuality); out.push({type:'image/webp',blob:webp,bytes:webp.size,ratio:webp.size/file.size,warnings:[]});
  if(await supportsCanvasEncoding('image/avif')){ const avif=await canvasToBlob(c,'image/avif',avifQuality); out.push({type:'image/avif',blob:avif,bytes:avif.size,ratio:avif.size/file.size,warnings:['AVIF quality values are not directly comparable to WebP quality values.']}); }
  else { const { encode }=await import('@jsquash/avif'); const rgba=ctx.getImageData(0,0,width,height); const buf=await encode(rgba,{cqLevel:Math.round((1-avifQuality)*63)} as any); const avif=new Blob([buf],{type:'image/avif'}); out.push({type:'image/avif',blob:avif,bytes:avif.size,ratio:avif.size/file.size,warnings:['Used a lazy-loaded local AVIF WASM codec.']}); }
  return out;
}

