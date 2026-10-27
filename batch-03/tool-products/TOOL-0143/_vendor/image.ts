import { LIMITS } from './limits';
import { assertFileSize } from './files';

export type BitmapLike = ImageBitmap | HTMLImageElement;

export async function decodeImage(file: File): Promise<BitmapLike> {
  assertFileSize(file, 'image');
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally { URL.revokeObjectURL(url); }
}

export function bitmapSize(bitmap: BitmapLike): {width:number;height:number} {
  const width = 'width' in bitmap ? bitmap.width : 0;
  const height = 'height' in bitmap ? bitmap.height : 0;
  if (!width || !height) throw new Error('Decoded image has invalid dimensions.');
  if (width * height > LIMITS.maxPixels) throw new Error(`Image exceeds the ${LIMITS.maxPixels.toLocaleString()} pixel safety limit.`);
  if (width > LIMITS.maxCanvasSide || height > LIMITS.maxCanvasSide) throw new Error(`Image side exceeds ${LIMITS.maxCanvasSide}px canvas safety limit.`);
  return {width, height};
}

export function makeCanvas(width: number, height: number): HTMLCanvasElement {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error('Invalid canvas size.');
  if (width * height > LIMITS.maxPixels || width > LIMITS.maxCanvasSide || height > LIMITS.maxCanvasSide) throw new Error('Requested canvas is too large for safe browser processing.');
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}

export function drawContain(ctx: CanvasRenderingContext2D, image: CanvasImageSource, sw: number, sh: number, dw: number, dh: number, background?: string): {x:number;y:number;width:number;height:number} {
  if (background) { ctx.fillStyle = background; ctx.fillRect(0,0,dw,dh); }
  const scale = Math.min(dw/sw, dh/sh);
  const width = Math.round(sw*scale), height = Math.round(sh*scale);
  const x = Math.floor((dw-width)/2), y = Math.floor((dh-height)/2);
  ctx.drawImage(image, 0,0,sw,sh,x,y,width,height);
  return {x,y,width,height};
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob ? resolve(blob) : reject(new Error(`This browser could not encode ${type}.`)), type, quality));
}

export async function supportsCanvasEncoding(type: string): Promise<boolean> {
  const canvas = makeCanvas(1,1);
  const blob = await canvasToBlob(canvas, type, 0.8).catch(()=>null);
  return !!blob && blob.type === type;
}
