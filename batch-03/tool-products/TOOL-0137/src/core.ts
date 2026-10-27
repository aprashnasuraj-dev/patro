import { decodeCompositedGif } from '../_vendor/gif';
export async function transform(file:File,speed=1.5,reverse=false):Promise<Blob>{
  if(!(speed>=.1&&speed<=10)) throw new Error('Speed must be 0.1–10×.');
  const decoded=await decodeCompositedGif(file); const gifenc=await import('gifenc'); const frames=reverse?[...decoded.frames].reverse():decoded.frames; const enc=gifenc.GIFEncoder();
  for(const f of frames){ const palette=gifenc.quantize(f.rgba,256),idx=gifenc.applyPalette(f.rgba,palette); enc.writeFrame(idx,decoded.width,decoded.height,{palette,delay:Math.max(20,Math.round(f.delayMs/speed)),repeat:0}); }
  enc.finish(); return new Blob([enc.bytes()],{type:'image/gif'});
}
