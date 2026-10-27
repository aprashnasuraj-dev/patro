import {transform, type ChainResult} from './core.js';
const form=document.querySelector<HTMLFormElement>('#tool-form')!;
const output=document.querySelector<HTMLElement>('#result')!;
const warnings=document.querySelector<HTMLElement>('#warnings')!;
const copy=document.querySelector<HTMLButtonElement>('#copy')!;
const download=document.querySelector<HTMLButtonElement>('#download')!;
const submit=form.querySelector<HTMLButtonElement>('button[type=submit]')!;
const visual=document.querySelector<HTMLElement>('#chain-visual')!;
let current='';let active=0;
form.addEventListener('submit',async e=>{e.preventDefault();const ticket=++active;current='';copy.disabled=true;download.disabled=true;submit.disabled=true;submit.textContent='Verifying signatures…';output.textContent='Processing certificates and signatures locally…';warnings.textContent='';visual.replaceChildren();
 try{const fd=new FormData(form),input=String(fd.get('chain')??'');if(input.length>512000)throw Error('Maximum 512,000 characters');const date=String(fd.get('at')??'');const result=await transform({chain:input,at:date});if(ticket!==active)return;
 current=result.text+'\n\nWarnings:\n'+result.warnings.join('\n');output.textContent=result.text;warnings.textContent=result.warnings.join('\n');copy.disabled=false;download.disabled=false;render(result);
 }catch(err){if(ticket!==active)return;output.textContent=err instanceof Error?err.message:'Unknown certificate error';warnings.textContent='No valid chain result generated.';}
 finally{if(ticket===active){submit.disabled=false;submit.textContent='Verify certificate order';}}});
function render(r:ChainResult){const head=document.createElement('p');head.className='status';head.textContent=r.status.replaceAll('_',' ');visual.append(head);
 for(const c of r.certificates){const card=document.createElement('article');card.className='cert-card';const h=document.createElement('h3');h.textContent=`#${c.position} ${c.subject}`;const meta=document.createElement('p');meta.textContent=`Issuer: ${c.issuer} · CA: ${c.isCA?'yes':'no'} · Currently valid: ${c.validNow?'yes':'no'}`;card.append(h,meta);visual.append(card);}}
copy.addEventListener('click',async()=>{if(!current)return;try{await navigator.clipboard.writeText(current);}catch{warnings.textContent+='\nClipboard unavailable; manually select and copy the result.';}});
download.addEventListener('click',()=>{if(!current)return;const url=URL.createObjectURL(new Blob([current],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='certificate-chain-order-report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
