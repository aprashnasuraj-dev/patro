import { decodeCompositedGif } from '../_vendor/gif';
import { zipFiles } from '../_vendor/zip';
export async function extract(file:File,selection:'all'|'every10'='all'):Promise<{zip:Blob,frames:{index:number,delayMs:number}[]}>{
  const decoded=await decodeCompositedGif(file); const out:Record<string,Uint8Array>={}; const meta=[] as {index:number,delayMs:number}[];
  for(let i=0;i<decoded.frames.length;i++){ const f=decoded.frames[i]; meta.push({index:i+1,delayMs:f.delayMs}); if(selection!=='all'&&i%10!==0) continue; const c=document.createElement('canvas'); c.width=decoded.width;c.height=decoded.height; const ctx=c.getContext('2d'); if(!ctx)throw new Error('Canvas unavailable.'); ctx.putImageData(new ImageData(f.rgba,decoded.width,decoded.height),0,0); const blob=await new Promise<Blob>((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed.')),'image/png')); out[`frame-${String(i+1).padStart(4,'0')}.png`]=new Uint8Array(await blob.arrayBuffer()); }
  return {zip:new Blob([await zipFiles(out)],{type:'application/zip'}),frames:meta};
}
