import { assertBoundedFiles } from '../_vendor/limits';
import { safeFilename, stem } from '../_vendor/files';
import { makeCanvas, canvasToBlob } from '../_vendor/image';
import { zipFiles } from '../_vendor/zip';

export async function convert(files:File[],quality=.9):Promise<Blob>{
  assertBoundedFiles(files,50); if(!(quality>=.4&&quality<=1)) throw new Error('Quality must be 0.4–1.0.');
  const mod=await import('libheif-js/wasm-bundle'); const lib=(mod as any).default??mod; const out:Record<string,Uint8Array>={};
  for(const f of files){ if(!/\.(hei[cf])$/i.test(f.name)&&!/heic|heif/i.test(f.type)) throw new Error(`${f.name}: expected HEIC/HEIF.`); const bytes=new Uint8Array(await f.arrayBuffer()); const decoder=new (lib as any).HeifDecoder(); const images=decoder.decode(bytes); if(!images?.length) throw new Error(`${f.name}: no decodable HEIF image.`); const image=images[0]; const width=image.get_width(),height=image.get_height(); if(width*height>40_000_000) throw new Error(`${f.name}: dimensions exceed safety limit.`); const rgba=new Uint8ClampedArray(width*height*4); await new Promise<void>((resolve,reject)=>image.display({data:rgba,width,height},(display:any)=>display?resolve():reject(new Error('HEIF decode failed.')))); const c=makeCanvas(width,height),ctx=c.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable.'); ctx.putImageData(new ImageData(rgba,width,height),0,0); const blob=await canvasToBlob(c,'image/jpeg',quality); out[`${stem(f.name)}.jpg`]=new Uint8Array(await blob.arrayBuffer()); image.free?.(); }
  return new Blob([await zipFiles(out)],{type:'application/zip'});
}

