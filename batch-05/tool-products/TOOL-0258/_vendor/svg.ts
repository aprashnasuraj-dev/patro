export const SVG_NS='http://www.w3.org/2000/svg';
export function el<K extends keyof SVGElementTagNameMap>(name:K,attrs:Record<string,string|number>={},text=''){
 const n=document.createElementNS(SVG_NS,name); for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v)); if(text)n.textContent=text; return n;
}
export const serializeSvg=(svg:SVGSVGElement)=>new XMLSerializer().serializeToString(svg);
export function downloadBlob(blob:Blob,name:string){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
export function downloadSvg(svg:SVGSVGElement,name:string){downloadBlob(new Blob([serializeSvg(svg)],{type:'image/svg+xml;charset=utf-8'}),name)}
export async function downloadPng(svg:SVGSVGElement,name:string,scale=2){
 const xml=serializeSvg(svg); const blob=new Blob([xml],{type:'image/svg+xml'}); const url=URL.createObjectURL(blob);
 try{const img=await new Promise<HTMLImageElement>((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('SVG could not be rasterized.'));i.src=url});
 const w=Math.min(8192,Math.max(1,(svg.viewBox.baseVal.width||svg.clientWidth||800)*scale)),h=Math.min(8192,Math.max(1,(svg.viewBox.baseVal.height||svg.clientHeight||500)*scale));
 const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas unavailable.');ctx.drawImage(img,0,0,w,h);
 const png=await new Promise<Blob>((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG export failed.')),'image/png'));downloadBlob(png,name);
 }finally{URL.revokeObjectURL(url)}
}
