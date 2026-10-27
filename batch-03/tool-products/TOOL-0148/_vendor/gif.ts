import { LIMITS } from './limits';
export type CompositedGifFrame={rgba:Uint8ClampedArray,delayMs:number};
export async function decodeCompositedGif(file:File):Promise<{width:number,height:number,frames:CompositedGifFrame[]}>{
  if(file.size>40*1024*1024) throw new Error('GIF exceeds 40 MB limit.');
  const {parseGIF,decompressFrames}=await import('gifuct-js');
  const parsed=parseGIF(await file.arrayBuffer());
  const frames=decompressFrames(parsed,true);
  if(!frames.length) throw new Error('No GIF frames found.');
  if(frames.length>LIMITS.maxAnimationFrames) throw new Error(`GIF exceeds ${LIMITS.maxAnimationFrames} frames.`);
  const width=parsed.lsd.width,height=parsed.lsd.height;
  if(width*height>LIMITS.maxPixels) throw new Error('GIF canvas exceeds pixel safety limit.');
  const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable.');
  let restore:ImageData|null=null,prev:any=null;
  const out:CompositedGifFrame[]=[];
  for(const f of frames){
    if(prev?.disposalType===2) ctx.clearRect(prev.dims.left,prev.dims.top,prev.dims.width,prev.dims.height);
    else if(prev?.disposalType===3&&restore){ ctx.putImageData(restore,0,0); restore=null; }
    if(f.disposalType===3) restore=ctx.getImageData(0,0,width,height);
    const patchCanvas=document.createElement('canvas'); patchCanvas.width=f.dims.width; patchCanvas.height=f.dims.height;
    const pc=patchCanvas.getContext('2d'); if(!pc) throw new Error('Canvas unavailable.');
    pc.putImageData(new ImageData(new Uint8ClampedArray(f.patch),f.dims.width,f.dims.height),0,0);
    ctx.drawImage(patchCanvas,f.dims.left,f.dims.top);
    out.push({rgba:new Uint8ClampedArray(ctx.getImageData(0,0,width,height).data),delayMs:Math.max(20,f.delay||100)});
    prev=f;
  }
  return {width,height,frames:out};
}
