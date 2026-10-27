// Dedicated local-only file workbench. Never sends user image bytes to a service.
import {calculate} from './core';
export function mountImageWorkbench():void {
 const root=document.getElementById('tool-app');if(!root)return;
 const out=root.querySelector('.output-column');if(!out)return;
 const sec=document.createElement('section');sec.className='special-panel';
 const title=document.createElement('h3');title.textContent='Inspect and resize a local raster image';
 const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.setAttribute('aria-label','Choose private source image');
 const preview=document.createElement('img');preview.alt='Local raster preview';preview.className='image-workbench-preview';
 const go=document.createElement('button');go.type='button';go.textContent='Generate resized image';go.className='primary-action';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 sec.append(title,file,go,status,preview);out.append(sec);let url:string|null=null;
 const value=(k:string):string=>(root.querySelector('#input-TOOL-0476-'+k) as HTMLInputElement|HTMLSelectElement|null)?.value||'';
 go.addEventListener('click',async()=>{go.disabled=true;status.textContent='';try{
 const f=file.files?.[0];if(!f||f.size>15_000_000||f.size<1||!['image/jpeg','image/png','image/webp'].includes(f.type))throw Error('Choose a JPEG, PNG or WebP under 15 MB');
 const inp={maxPixels:value('maxPixels'),targetW:value('targetW'),targetH:value('targetH'),mode:value('mode'),format:value('format')};calculate(inp);
 const bitmap=await createImageBitmap(f,{imageOrientation:'from-image'});try{
 const max=Number(inp.maxPixels),w=Number(inp.targetW),h=Number(inp.targetH);if(bitmap.width*bitmap.height>max||bitmap.width>12000||bitmap.height>12000)throw Error('Decoded source exceeds pixel budget');
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);
 const scale=inp.mode==='contain'?Math.min(w/bitmap.width,h/bitmap.height):Math.max(w/bitmap.width,h/bitmap.height);const dw=bitmap.width*scale,dh=bitmap.height*scale;ctx.drawImage(bitmap,(w-dw)/2,(h-dh)/2,dw,dh);
 const blob=await new Promise<Blob>((res,rej)=>canvas.toBlob(b=>b?res(b):rej(Error('Unable to encode image')),inp.format==='image/jpeg'?'image/jpeg':'image/png',.9));if(!blob||blob.size>30_000_000)throw Error('Output too large');
 if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);preview.src=url;const a=document.createElement('a');a.href=url;a.download='marketplace-resized.'+(inp.format==='image/jpeg'?'jpg':'png');a.click();status.textContent=`Resized ${bitmap.width}×${bitmap.height} → ${w}×${h}px; ${blob.size} bytes, local only.`;
 }finally{bitmap.close()}
 }catch(e){status.textContent=e instanceof Error?e.message:'Unsupported image'}finally{go.disabled=false}});
 window.addEventListener('pagehide',()=>{if(url)URL.revokeObjectURL(url)},{once:true});
}
