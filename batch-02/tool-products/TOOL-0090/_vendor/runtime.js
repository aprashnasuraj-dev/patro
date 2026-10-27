// Local-first workbench: static content and CSS arrive with the route; compute code is imported only on route entry.
const $=s=>document.querySelector(s);
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=String(text);return n;}
function addWarning(parent,message){parent.append(el('p','notice',message));}
function renderTable(parent,records){if(!records?.length)return;const keys=Object.keys(records[0]).slice(0,8);const wrapper=el('div','table-scroll');wrapper.tabIndex=0;wrapper.setAttribute('aria-label','Result table, horizontally scrollable');const t=el('table','data-table'),thead=el('thead'),tr=el('tr');keys.forEach(key=>tr.append(el('th','',key.replace(/_/g,' '))));thead.append(tr);t.append(thead);const tb=el('tbody');for(const item of records.slice(0,500)){const line=el('tr');for(const key of keys){const cell=el('td');cell.textContent=String(item[key]??'');line.append(cell);}tb.append(line);}t.append(tb);wrapper.append(t);parent.append(wrapper);}
function renderChanges(parent,changes){if(!changes?.length)return;const wrap=el('div','diff-view');wrap.setAttribute('aria-label','Word difference with inserted and removed tokens');for(const v of changes){const s=el('span',v.kind==='added'?'diff-add':v.kind==='removed'?'diff-remove':'diff-equal',v.text);wrap.append(s);}parent.append(wrap);}
function renderVisual(parent,visual){if(!visual)return;const wrap=el('section','tool-visual');wrap.setAttribute('aria-label',visual.label||'Visual result preview');
 if(visual.type==='preview'){
  const card=el('div','social-preview');card.append(el('span','preview-top',visual.site||'Web preview'),el('strong','preview-title',visual.title||''),el('p','preview-desc',visual.description||''));wrap.append(card);
 }else if(visual.type==='bars'){
  for(const datum of (visual.items||[]).slice(0,10)){const total=Number(datum.max)||Math.max(1,Number(datum.value)),value=Math.max(0,Number(datum.value)||0);const line=el('div','bar-item'),labels=el('div','bar-labels');labels.append(el('span','',datum.label),el('strong','',`${datum.value}${datum.unit||''}`));const rail=el('div','bar-rail'),fill=el('div','bar-fill');fill.style.width=`${Math.min(100,Math.round(100*value/total))}%`;rail.append(fill);line.append(labels,rail);wrap.append(line);}
 }else if(visual.type==='steps'){
  const steps=el('div','step-trace');for(const item of (visual.items||[]).slice(0,10))steps.append(el('span','trace-chip',item));wrap.append(steps);
 }else if(visual.type==='codepoints'){
  const items=el('div','codepoint-badges');for(const v of (visual.items||[]).slice(0,25))items.append(el('span','codepoint-pill',v));wrap.append(items);
 }
 parent.append(wrap);
}
function saveText(name,text,mime='text/plain'){const data=new Blob([text],{type:mime+';charset=utf-8'}),u=URL.createObjectURL(data),a=document.createElement('a');a.href=u;a.download=name.replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,120);a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);}
export async function boot(compute){
 const form=$('#tool-form'),out=$('#result'),status=$('#run-status'),action=$('#primary-action'),copy=$('#copy-result'),save=$('#save-result'),cancel=$('#cancel-action'),downloads=$('#file-downloads');let current='',currentFiles=[],busy=false,controller;
 const gather=()=>{const data={};for(const i of form.querySelectorAll('[name]')){if(i.type==='checkbox')data[i.name]=i.checked;else if(i.type==='file')data[i.name]=i.files?.[0]??null;else data[i.name]=i.value;}return data;};
 function reset(){copy.disabled=true;save.disabled=true;current='';currentFiles=[];out.replaceChildren();downloads?.replaceChildren();}
 cancel.addEventListener('click',()=>controller?.abort());
 form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;controller=new AbortController();action.disabled=true;cancel.hidden=false;reset();status.textContent='Processing locally…';
  try{const data=await compute(gather(),{signal:controller.signal,notify:message=>status.textContent=String(message).slice(0,160)});if(controller.signal.aborted)throw Error('Cancelled by user.');if(!data||typeof data!=='object')throw Error('No usable output returned.');current=String(data.text??'');if(current.length>1800000)throw Error('Output exceeds 1.8 million characters; narrow your input.');
  if(data.summary)out.append(el('p','outcome',data.summary));if(data.metrics?.length){const metrics=el('div','metrics');for(const [label,value] of data.metrics.slice(0,6)){const div=el('div','metric'),number=el('strong','',value),caption=el('small','',label);div.append(number,caption);metrics.append(div);}out.append(metrics);}
  if(data.warnings?.length){const notices=el('section','notices');notices.setAttribute('aria-label','Warnings and limitations');data.warnings.slice(0,10).forEach(w=>addWarning(notices,w));out.append(notices);}
  if(data.visual)renderVisual(out,data.visual);if(data.rows)renderTable(out,data.rows);if(data.changes)renderChanges(out,data.changes);
  if(current){const wrap=el('section','code-output'),bar=el('div','code-bar','Copyable output'),pre=el('pre','result-code',current);pre.tabIndex=0;wrap.append(bar,pre);out.append(wrap);copy.disabled=false;save.disabled=false;}
  currentFiles=(data.files||[]).slice(0,100).filter(f=>typeof f.name==='string'&&typeof f.text==='string');if(downloads&&currentFiles.length){const heading=el('strong','',`Generated files (${currentFiles.length})`);downloads.append(heading);for(const f of currentFiles){const b=el('button','file-button',f.name);b.type='button';b.addEventListener('click',()=>saveText(f.name,f.text,f.mime||'application/xml'));downloads.append(b);}}
  status.textContent=`Ready · ${new TextEncoder().encode(current).length.toLocaleString()} text bytes output`;
  }catch(error){reset();const warning=el('div','error',error instanceof Error?error.message:'Unable to process this input.');out.append(warning);status.textContent='Processing did not complete.';}finally{action.disabled=false;cancel.hidden=true;busy=false;controller=null;}
 });
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(current);status.textContent='Output copied to clipboard.';}catch{status.textContent='Clipboard unavailable; use keyboard selection from the output.';}});
 save.addEventListener('click',()=>{if(current)saveText((document.body.dataset.exportBase||'result')+'.'+(document.body.dataset.exportExtension||'txt'),current,document.body.dataset.exportMime||'text/plain');});
}
