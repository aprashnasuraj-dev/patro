// Shared, network-free UI orchestration. Every route imports this only when visited.
export async function boot(compute){
 const form=document.querySelector('#tool-form'), result=document.querySelector('#result'), status=document.querySelector('#run-status'), action=document.querySelector('#primary-action'), copy=document.querySelector('#copy-result'), save=document.querySelector('#save-result'), cancel=document.querySelector('#cancel-action');
 const gather=()=>{const data={};for(const el of form.querySelectorAll('[name]')){if(el.type==='checkbox')data[el.name]=el.checked;else if(el.type==='file')data[el.name]=el.files?.[0]??null;else data[el.name]=el.value;}return data;};
 let current='',running=false,controller=null;
 cancel?.addEventListener('click',()=>controller?.abort());
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(running)return;running=true;controller=new AbortController();action.disabled=true;cancel.hidden=false;copy.disabled=true;save.disabled=true;current='';status.textContent='Processing in this browser…';result.textContent='';
  try{const output=await compute(gather(),{signal:controller.signal,notify:s=>{status.textContent=String(s).slice(0,150);}});if(controller.signal.aborted)throw Error('Operation cancelled.');
   const record=typeof output==='string'?{text:output}:output;current=String(record.text??JSON.stringify(record.data??record,null,2));if(current.length>1500000)throw Error('Result exceeds safe display size.');
   if(record.summary){const p=document.createElement('p');p.className='result-summary';p.textContent=record.summary;result.append(p);}
   for(const w of (record.warnings??[])){const p=document.createElement('p');p.className='warning';p.textContent='Notice: '+w;result.append(p);}
   const pre=document.createElement('pre');pre.textContent=current;pre.tabIndex=0;result.append(pre);status.textContent=`Complete · ${new TextEncoder().encode(current).length.toLocaleString()} output bytes`;copy.disabled=false;save.disabled=false;
  }catch(error){status.textContent='Not completed';const p=document.createElement('p');p.className='error';p.textContent=error instanceof Error?error.message:'Unexpected input error';result.replaceChildren(p);}finally{action.disabled=false;cancel.hidden=true;running=false;controller=null;}
 });
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(current);status.textContent='Copied result.';}catch{status.textContent='Clipboard unavailable; select and copy from the output.';}});
 save.addEventListener('click',()=>{if(!current)return;const mime=document.body.dataset.exportMime??'text/plain',ext=document.body.dataset.exportExtension??'txt',blob=new Blob([current],{type:mime+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(document.body.dataset.exportBase??'result')+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
}
