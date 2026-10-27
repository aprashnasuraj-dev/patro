const form=document.getElementById('tool-form');
const output=document.getElementById('output');
const status=document.getElementById('status');
const warnings=document.getElementById('warnings');
const findings=document.getElementById('findings');
const copy=document.getElementById('copy');
const download=document.getElementById('download');
const initial=form.innerHTML;
let last='';
function itemsToUi(items){findings.replaceChildren();for(const item of (items||[]).slice(0,25)){const dl=document.createElement('dl');dl.className='finding';const dt=document.createElement('dt');dt.textContent=item.label;const dd=document.createElement('dd');dd.textContent=item.value;dl.append(dt,dd);findings.append(dl);}}
function listWarnings(items){warnings.replaceChildren();for(const w of (items||[]).slice(0,30)){const li=document.createElement('li');li.textContent=w;warnings.append(li);}}
function show(res){last=res.text??'';output.textContent=last;status.textContent=res.summary||'Completed locally';itemsToUi(res.items);listWarnings(res.warnings);copy.disabled=!last;download.disabled=!last;}
function fail(err){last='';output.textContent='Unable to generate result.';status.textContent='Input error: '+String(err?.message||err);itemsToUi([]);listWarnings([]);copy.disabled=true;download.disabled=true;}
function values(){const data={};for(const el of form.elements){if(!el.name)continue;data[el.name]=el.type==='checkbox'?el.checked:el.value;}return data;}
form.addEventListener('submit',async e=>{e.preventDefault();status.textContent='Processing locally…';try{const {compute}=await import('./core.js');show(await compute(values()));}catch(e){fail(e);}});
document.getElementById('clear').addEventListener('click',()=>{form.innerHTML=initial;last='';output.textContent='Your results will appear here.';status.textContent='Sample restored.';itemsToUi([]);listWarnings([]);copy.disabled=true;download.disabled=true;});
copy.addEventListener('click',async()=>{if(!last)return;try{await navigator.clipboard.writeText(last);status.textContent='Copied output to clipboard.';}catch{status.textContent='Clipboard access denied. Select and copy the output manually.';}});
download.addEventListener('click',()=>{if(!last)return;const type=last.trimStart().startsWith('{')||last.trimStart().startsWith('[')?'application/json':'text/plain';const ext=type==='application/json'?'json':'txt';const blob=new Blob([last],{type:type+';charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=document.documentElement.dataset.fileName||('mission-mangal-result.'+ext);a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);});
