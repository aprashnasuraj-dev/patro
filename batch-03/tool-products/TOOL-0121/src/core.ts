import { assertBoundedFiles } from '../_vendor/limits';
import { assertFileSize, safeFilename, stem } from '../_vendor/files';
import { decodeImage, bitmapSize, makeCanvas, canvasToBlob } from '../_vendor/image';
import { zipFiles } from '../_vendor/zip';

export type ExifRow={file:string,fields:Record<string,unknown>,gps:boolean};
export async function inspect(files:File[]):Promise<ExifRow[]> {
  assertBoundedFiles(files,50); const { default: exifr }=await import('exifr'); const out:ExifRow[]=[];
  for(const file of files){ assertFileSize(file,'image'); const fields=await exifr.parse(file,{tiff:true,exif:true,gps:true,icc:true,iptc:true,xmp:true}).catch(()=>({})); const keys=Object.keys(fields||{}); out.push({file:file.name,fields:fields||{},gps:keys.some(k=>/gps|latitude|longitude/i.test(k))}); }
  return out;
}
export async function strip(files:File[]):Promise<Blob>{
  assertBoundedFiles(files,50); const zipped:Record<string,Uint8Array>={};
  for(const file of files){ const bmp=await decodeImage(file); const {width,height}=bitmapSize(bmp); const c=makeCanvas(width,height); const ctx=c.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable.'); ctx.drawImage(bmp as CanvasImageSource,0,0,width,height); const type=/png/i.test(file.type)?'image/png':'image/jpeg'; const blob=await canvasToBlob(c,type,0.92); zipped[`${stem(file.name)}-stripped.${type==='image/png'?'png':'jpg'}`]=new Uint8Array(await blob.arrayBuffer()); }
  return new Blob([await zipFiles(zipped)],{type:'application/zip'});
}

