import { decodeImage, bitmapSize, makeCanvas, canvasToBlob } from '../_vendor/image';
export type Preset={label:string,widthMm:number,heightMm:number,headMinMm?:number,headMaxMm?:number,notes:string,source:string};
export const PRESETS:Record<string,Preset>={
 US:{label:'United States passport',widthMm:50.8,heightMm:50.8,notes:'2×2 inch printed photo. Original photo must be unedited; use this only as a geometry guide.',source:'https://travel.state.gov/en/passports/apply/help/photos.html'},
 UK:{label:'United Kingdom printed passport',widthMm:35,heightMm:45,headMinMm:29,headMaxMm:34,notes:'Printed photo dimensions; digital applications have separate rules.',source:'https://www.gov.uk/photos-for-passports/photo-requirements'},
 CA:{label:'Canada printed passport',widthMm:50,heightMm:70,headMinMm:31,headMaxMm:36,notes:'Canada requires professional, unaltered photos; this cropper is only a measurement guide.',source:'https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html'},
 AU:{label:'Australia printed passport',widthMm:35,heightMm:45,headMinMm:32,headMaxMm:36,notes:'Official width range is 35–40 mm and height 45–50 mm; this preset uses 35×45 as the conservative minimum geometry.',source:'https://www.passports.gov.au/PhotoGuidelines'}
};
export function outputPixels(code:string,dpi:number,custom?:{widthMm:number,heightMm:number}){ const p=code==='CUSTOM'?custom:PRESETS[code]; if(!p) throw new Error('Unsupported preset.'); const widthMm=(p as any).widthMm,heightMm=(p as any).heightMm; if(!(dpi>=150&&dpi<=600)) throw new Error('DPI must be 150–600.'); return {width:Math.round(widthMm/25.4*dpi),height:Math.round(heightMm/25.4*dpi)}; }
export async function crop(file:File,code:string,dpi:number,box:{x:number,y:number,width:number,height:number},custom?:{widthMm:number,heightMm:number}):Promise<Blob>{
 const bmp=await decodeImage(file); const s=bitmapSize(bmp); if(box.x<0||box.y<0||box.width<=0||box.height<=0||box.x+box.width>s.width||box.y+box.height>s.height) throw new Error('Crop box is outside the image.'); const o=outputPixels(code,dpi,custom); const c=makeCanvas(o.width,o.height),ctx=c.getContext('2d'); if(!ctx) throw new Error('Canvas unavailable.'); ctx.drawImage(bmp as CanvasImageSource,box.x,box.y,box.width,box.height,0,0,o.width,o.height); return canvasToBlob(c,'image/jpeg',.95);
}

