import type { Result, Scalar } from './core';
const el = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const form=el<HTMLFormElement>('converter'), input=el<HTMLTextAreaElement>('csv'), status=el('status'), output=el('output');
const generate=el<HTMLButtonElement>('generate'), cancel=el<HTMLButtonElement>('cancel'), copy=el<HTMLButtonElement>('copy'), download=el<HTMLButtonElement>('download');
let worker: Worker | null=null, latest: Result|null=null, overrides: Record<string, Scalar> = Object.create(null), epoch=0;
const example='id,display name,active,score,created_at\n001,Asha,true,9.5,2026-01-02T10:30:00Z\n002,"Ravi, K.",false,8,2026-01-03T12:00:00Z\n003,Mina,true,,2026-01-04T09:15:00Z';
function idle(){worker?.terminate();worker=null;generate.disabled=false;cancel.hidden=true;form.removeAttribute('aria-busy');}
function invalidate(){epoch++;idle();latest=null;overrides=Object.create(null);copy.disabled=true;download.disabled=true;output.textContent='Generate a schema to see your SDL here.';el('columns').replaceChildren();el('warnings').replaceChildren();el('metrics').textContent='No current result';status.textContent='Input changed. Generate to update the schema.';}
input.addEventListener('input',invalidate);
el('type-name').addEventListener('input',invalidate);
for(const id of ['delimiter','non-null','datetime']) el(id).addEventListener('change',invalidate);
function render(result:Result){
  latest=result;output.textContent=result.sdl;copy.disabled=false;download.disabled=false;
  el('metrics').textContent=`${result.rows.toLocaleString()} rows · ${result.columns.length} fields · ${result.columns.filter(c=>c.blanks>0).length} columns with empty cells`;
  const body=el('columns');body.replaceChildren();
  for(const col of result.columns){
    const tr=document.createElement('tr');
    for(const text of [col.source||'(empty header)',col.name]){const td=document.createElement('td');td.textContent=text;tr.append(td);}
    const td=document.createElement('td'), select=document.createElement('select');select.setAttribute('aria-label',`Type for ${col.name}`);
    for(const scalar of ['String','Int','Float','Boolean','ID',...(el<HTMLInputElement>('datetime').checked?['DateTime']:[])]){const opt=document.createElement('option');opt.value=scalar;opt.textContent=scalar;opt.selected=scalar===col.scalar;select.append(opt);}
    select.addEventListener('change',()=>{overrides[col.name]=select.value as Scalar;run();});td.append(select);tr.append(td);
    const evidence=document.createElement('td'); evidence.textContent=`${col.count-col.blanks}/${col.count} non-empty. ${col.reason}`;tr.append(evidence);body.append(tr);
  }
  const warnings=el('warnings');warnings.replaceChildren();for(const text of result.warnings){const li=document.createElement('li');li.textContent=text;warnings.append(li);}
  status.textContent=`Schema validated. ${result.rows} rows and ${result.columns.length} fields. Review the inferred types before use.`;
}
function run(){
  idle();const current=++epoch;latest=null;copy.disabled=true;download.disabled=true;output.textContent='Processing…';generate.disabled=true;cancel.hidden=false;form.setAttribute('aria-busy','true');status.textContent='Parsing and validating locally…';
  try{
    worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
    worker.onmessage=event=>{if(current!==epoch)return;idle();if(event.data.ok)render(event.data.result);else{output.textContent='No valid schema generated.';status.textContent=event.data.error;el('metrics').textContent='Validation failed — correct the input or change the selected type.';el('warnings').replaceChildren();}};
    worker.onerror=()=>{if(current!==epoch)return;idle();output.textContent='No result.';status.textContent='The local worker could not start. Serve the package over localhost or HTTPS and try again.';};
    worker.postMessage({csv:input.value,options:{typeName:el<HTMLInputElement>('type-name').value,delimiter:el<HTMLSelectElement>('delimiter').value,nonNull:el<HTMLInputElement>('non-null').checked,dateTime:el<HTMLInputElement>('datetime').checked,overrides}});
  }catch(error){idle();status.textContent=error instanceof Error?error.message:'Unable to start the local processor.';}
}
form.addEventListener('submit',event=>{event.preventDefault();run();});
cancel.addEventListener('click',()=>{invalidate();status.textContent='Cancelled. Your input remains on this page.';});
el('sample').addEventListener('click',()=>{input.value=example;invalidate();status.textContent='Sample loaded. Generate to inspect its field types.';});
el('clear').addEventListener('click',()=>{input.value='';el<HTMLInputElement>('file').value='';invalidate();status.textContent='Input and results cleared from this page.';input.focus();});
el<HTMLInputElement>('file').addEventListener('change',async event=>{
  const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;invalidate();const current=epoch;
  if(file.size>1048576){status.textContent='File exceeds 1 MiB. Choose a smaller UTF-8 CSV.';return;}
  try{const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());if(epoch!==current)return;input.value=text;status.textContent='File loaded locally. Generate to inspect it.';}catch{if(epoch===current)status.textContent='Cannot read this file as UTF-8. Convert its encoding first.';}
});
copy.addEventListener('click',async()=>{if(!latest)return;try{await navigator.clipboard.writeText(latest.sdl);status.textContent='GraphQL SDL copied.';}catch{status.textContent='Clipboard unavailable. Select the schema text and copy it manually.';}});
download.addEventListener('click',()=>{if(!latest)return;const blob=new Blob([latest.sdl],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='schema.graphql';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Schema download requested.';});
el('theme').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'light':'dark';el('theme').setAttribute('aria-pressed',String(!dark));});
generate.disabled=false;status.textContent='Ready. Your CSV is processed in this browser, without uploads.';
