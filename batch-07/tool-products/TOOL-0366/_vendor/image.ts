export async function decodeImage(file:File,maxBytes=60*1024*1024,maxPixels=120_000_000){
  if(!file.type.startsWith('image/'))throw new Error('Choose an image file.');
  if(file.size>maxBytes)throw new Error(`Image exceeds ${Math.floor(maxBytes/1024/1024)} MiB.`);
  const bmp=await createImageBitmap(file,{imageOrientation:'from-image'} as any);
  if(bmp.width<1||bmp.height<1||bmp.width*bmp.height>maxPixels){bmp.close();throw new Error('Decoded image dimensions are outside the supported range.');}
  return bmp;
}
export function canvas(w:number,h:number){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>120_000_000)throw new Error('Canvas dimensions are outside the supported range.');const c=document.createElement('canvas');c.width=w;c.height=h;return c}
export function fitRect(sw:number,sh:number,dw:number,dh:number,mode:'cover'|'contain'='cover',fx=.5,fy=.5){const s=mode==='cover'?Math.max(dw/sw,dh/sh):Math.min(dw/sw,dh/sh),w=sw*s,h=sh*s;return{x:(dw-w)*Math.min(1,Math.max(0,fx)),y:(dh-h)*Math.min(1,Math.max(0,fy)),w,h}}
export function downloadCanvas(c:HTMLCanvasElement,name:string,type='image/png',quality=.92){c.toBlob(b=>{if(!b)throw new Error('Image encoding failed.');const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),700)},type,quality)}
export function escapeHtml(s:string){return s.replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]!))}
