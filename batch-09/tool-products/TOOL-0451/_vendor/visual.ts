import type {Result} from './guard';
// Structured, browser-only preview. Every user string is escaped into inert SVG text.
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c] as string));
function numeric(i:Record<string,unknown>,k:string):number {const n=Number(i[k]);if(!Number.isFinite(n))throw Error(`Bad visual input: ${k}`);return n;}
function svgStart(w:number,h:number,units='px'):string {
 if(w<=0||h<=0||w>20000||h>20000)throw Error('SVG outside supported dimensions');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}${units}" height="${h}${units}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Dimensioned tool template"><rect width="${w}" height="${h}" fill="#f6f9fc"/>`;
}
function label(x:number,y:number,t:string,size=12):string{return `<text x="${x}" y="${y}" font-family="system-ui,Arial,sans-serif" font-size="${size}" fill="#17233a">${esc(t)}</text>`}
const box=(x:number,y:number,w:number,h:number,stroke:string,dash='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${stroke}" stroke-width="${Math.min(1.2,Math.max(.005,w/1000))}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
export function renderSvg(tool:string,i:Record<string,unknown>,_result:Result):string|null {
 let s='',w=0,h=0;
 if(tool==='TOOL-0441') {
  w=numeric(i,'w');h=numeric(i,'h');const left=numeric(i,'left')/100,top=numeric(i,'top')/100,right=numeric(i,'right')/100,bottom=numeric(i,'bottom')/100;
  const x=w*left,y=h*top,cw=w*(1-left-right),ch=h*(1-top-bottom);
  s=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  s+=`<path d="M0 0H${w}V${h}H0Z M${x} ${y}V${y+ch}H${x+cw}V${y}Z" fill="#b94a4a" fill-opacity=".43" fill-rule="evenodd"/>`+box(x,y,cw,ch,'#80ebcc','6 4');
  s+=`<text x="${x+cw/2}" y="${y+ch/2}" dominant-baseline="middle" text-anchor="middle" font-size="${Math.min(48,cw/Math.max(4,String(i.message).length))}" fill="white" font-family="system-ui,Arial,sans-serif">${esc(String(i.message).slice(0,100))}</text></svg>`;
 } else if(tool==='TOOL-0442') {
  const trimW=numeric(i,'width'),trimH=numeric(i,'height'),b=numeric(i,'bleed'),safe=numeric(i,'safe');w=trimW+b*2;h=trimH+b*2;
  s=svgStart(w,h,'mm')+box(b,b,trimW,trimH,'#158278')+box(b+safe,b+safe,trimW-2*safe,trimH-2*safe,'#b45309','3 3')+label(4,8,'Bleed | trim | safe',Math.min(7,w/25))+'</svg>';
 }else if(tool==='TOOL-0443'){
  const tw=numeric(i,'trimW'),th=numeric(i,'trimH'),b=numeric(i,'bleed'),pages=numeric(i,'pages');const stock=String(i.stock),provider=String(i.provider);const fs:{[k:string]:number}={white:.002252,cream:.0025,groundwood:.00235,'standard-color':.002252,'premium-color':.002347};const spine=pages*(provider==='KDP'?fs[stock]:numeric(i,'caliper'));
  w=tw*2+spine+b*2;h=th+b*2;s=svgStart(w,h,'in')+box(b,b,tw,th,'#3273c7')+box(b+tw,b,spine,th,'#c16e19')+box(b+tw+spine,b,tw,th,'#3273c7');
  s+=`<title>Back cover, spine ${spine.toFixed(4)} inches, front cover. Artwork bleed ${b} inches.</title>`+'</svg>';
 }else if(tool==='TOOL-0446'){
  w=numeric(i,'sheetW');h=numeric(i,'sheetH');const cols=numeric(i,'cols'),rows=numeric(i,'rows'),lw=numeric(i,'labelW'),lh=numeric(i,'labelH'),x0=numeric(i,'left')+numeric(i,'offsetX'),y0=numeric(i,'top')+numeric(i,'offsetY'),dx=lw+numeric(i,'gapX'),dy=lh+numeric(i,'gapY');
  s=svgStart(w,h,'mm');for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)s+=box(x0+col*dx,y0+row*dy,lw,lh,'#176a76');s+='</svg>';
 }else if(tool==='TOOL-0447'){
  w=800;h=500;const count=numeric(i,'count'),over=numeric(i,'over'),stitchedW=numeric(i,'stitchesW')*over/count,stitchedH=numeric(i,'stitchesH')*over/count,b=numeric(i,'border');const cW=stitchedW+2*b,cH=stitchedH+2*b;
  const f=Math.min(750/cW,450/cH),cw=cW*f,ch=cH*f,ox=(w-cw)/2,oy=(h-ch)/2;
  s=svgStart(w,h)+`<rect x="${ox}" y="${oy}" width="${cw}" height="${ch}" fill="#ead7ad" stroke="#a58c62"/>`+box(ox+b*f,oy+b*f,stitchedW*f,stitchedH*f,'#3558a5','8 4')+label(20,25,'Cut fabric / stitched design',17)+'</svg>';
 }else if(tool==='TOOL-0451'){
  w=640;h=380;const change=numeric(i,'change'),displacement=numeric(i,'displacement');const wet=270*(1-displacement/100);
  s=svgStart(w,h)+`<rect x="80" y="45" width="480" height="280" fill="none" stroke="#224d71" stroke-width="8"/><rect x="86" y="${325-wet}" width="468" height="${wet}" fill="#86c9e9"/>`+`<rect x="86" y="${325-wet*change/100}" width="468" height="${wet*change/100}" fill="#f5c261" opacity=".75"/>`+label(90,26,'Blue: retain · amber: water-change volume',15)+'</svg>';
 }else if(tool==='TOOL-0452'){
  w=640;h=240;const old=numeric(i,'current'),target=numeric(i,'target');s=svgStart(w,h)+label(20,35,`Free chlorine ${old} ppm → ${target} ppm`,24);
  s+=`<rect x="20" y="65" width="600" height="44" rx="8" fill="#d5e1e8"/><rect x="20" y="65" width="${Math.min(600,old/30*600)}" height="44" fill="#2f7cb9"/><line x1="${20+target/30*600}" y1="53" x2="${20+target/30*600}" y2="121" stroke="#bb4f2e" stroke-width="4"/>`+label(20,165,'Blue = measured · red line = target (0–30 ppm)',16)+'</svg>';
 }
 return s||null;
}
export function attachVisual(id:string,calc:(v:Record<string,unknown>)=>Result):void {
 const root=document.getElementById('tool-app');const form=root?.querySelector('form');const column=root?.querySelector('.output-column');if(!form||!column)return;
 const section=document.createElement('section');section.className='visual-workbench';const head=document.createElement('h3');head.textContent='Scale-aware visual guide';section.append(head);
 const image=document.createElement('img');image.className='visual-preview';image.alt='Computed illustration of the current tool dimensions';section.append(image);
 let stage:HTMLDivElement|null=null;let mediaUrl:string|null=null;let mediaEl:HTMLElement|null=null;
 if(id==='TOOL-0441') {
  const choose=document.createElement('label');choose.className='field';choose.textContent='Optional local video or still image · never uploaded';
  const file=document.createElement('input');file.type='file';file.accept='video/*,image/*';choose.append(file);section.insertBefore(choose,image);
  stage=document.createElement('div');stage.className='media-stage';stage.style.aspectRatio='1080 / 1920';section.replaceChild(stage,image);stage.append(image);
  const mediaStatus=document.createElement('p');mediaStatus.className='field-hint';stage.after(mediaStatus);
  file.addEventListener('change',()=>{
   if(mediaUrl)URL.revokeObjectURL(mediaUrl);mediaUrl=null;mediaEl?.remove();mediaEl=null;mediaStatus.textContent='';
   const selected=file.files?.[0];if(!selected)return;
   if(!/^(image|video)\//.test(selected.type)||selected.size>200_000_000){mediaStatus.textContent='Select an image or video smaller than 200 MB.';file.value='';return;}
   mediaUrl=URL.createObjectURL(selected);
   const isVideo=selected.type.startsWith('video/');const el=isVideo?document.createElement('video'):document.createElement('img');
   el.className='local-media';el.setAttribute('aria-label','Private local preview media');
   if(el instanceof HTMLVideoElement){el.controls=true;el.muted=true;el.playsInline=true;el.preload='metadata';}
   el.setAttribute('src',mediaUrl);stage?.prepend(el);mediaEl=el;
   mediaStatus.textContent='Local preview only. Match the frame size/aspect ratio to the entered width and height; otherwise the overlay position may not align.';
  });
 }

 const download=document.createElement('button');download.type='button';download.className='secondary-action';download.textContent='Download SVG guide';download.disabled=true;section.append(download);
 const notice=document.createElement('p');notice.className='field-hint';notice.textContent='Visual planning aid only. Confirm output requirements before manufacture or publishing.';section.append(notice);column.append(section);
 let url:string|null=null,svg:string|null=null;
 form.addEventListener('submit',()=>{
  const i:Record<string,unknown>={};for(const el of Array.from(form.elements)){if(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement||el instanceof HTMLSelectElement){if(el.id.startsWith('input-'+id+'-'))i[el.id.slice(('input-'+id+'-').length)]=el.value;}}
  try {const r=calc(i);svg=renderSvg(id,i,r);if(!svg)throw Error('Unsupported visual');if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));image.src=url;download.disabled=false;if(stage)stage.style.aspectRatio=`${Number(i.w)} / ${Number(i.h)}`;}catch{svg=null;download.disabled=true;image.removeAttribute('src');if(url)URL.revokeObjectURL(url);url=null;}
 });
 download.addEventListener('click',()=>{if(!svg)return;const target=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=target;a.download=`${id}-guide.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(target),1000);});
 window.addEventListener('pagehide',()=>{if(url)URL.revokeObjectURL(url);if(mediaUrl)URL.revokeObjectURL(mediaUrl)},{once:true});
}
