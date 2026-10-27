import {calculate} from './core.js';
import type {Result} from '../_vendor/runtime.js';
const form=document.querySelector<HTMLFormElement>('#tool-form')!;
const result=document.querySelector<HTMLElement>('#result')!;
const feedback=document.querySelector<HTMLElement>('#feedback')!;
const text=document.querySelector<HTMLElement>('#summary')!;
const grid=document.querySelector<HTMLElement>('#metrics')!;
const warnings=document.querySelector<HTMLElement>('#warnings')!;
const rows=document.querySelector<HTMLElement>('#data-rows')!;
const download=document.querySelector<HTMLButtonElement>('#export')!;
const copy=document.querySelector<HTMLButtonElement>('#copy')!;
let latest:Result|null=null;
const cell=(tag:string,value:string)=>{const n=document.createElement(tag);n.textContent=value;return n;};
function render(out:Result){result.hidden=false;grid.replaceChildren();warnings.replaceChildren();rows.replaceChildren();text.textContent=out.summary;
for(const m of out.metrics){const block=document.createElement('div');block.className='metric';const small=cell('div',m.label);small.className='name';const big=cell('div',m.value);big.className='value';block.append(small,big);grid.append(block);}
for(const w of out.warnings)warnings.append(cell('li',w));
if(out.rows?.length){const t=document.createElement('table');t.className='result-table';t.setAttribute('aria-label','Calculation details');const body=document.createElement('tbody');for(const r of out.rows){const tr=document.createElement('tr');for(const v of r)tr.append(cell('td',v));body.append(tr);}t.append(body);const scroll=document.createElement('div');scroll.className='scroll';scroll.append(t);rows.append(scroll);}
latest=out;copy.disabled=false;download.disabled=false;}
form.addEventListener('submit',(evt)=>{evt.preventDefault();feedback.textContent='';const value:Record<string,string>={};for(const [key,v] of new FormData(form)){if(typeof v==='string')value[key]=v;}try{render(calculate(value));feedback.textContent='Calculation complete. Review warnings.';}catch(e){result.hidden=true;latest=null;copy.disabled=true;download.disabled=true;feedback.textContent=e instanceof Error?e.message:'Invalid inputs.';}});
copy.addEventListener('click',async()=>{if(!latest)return;const report=[latest.summary,...latest.metrics.map(m=>m.label+': '+m.value),...latest.warnings.map(w=>'Caution: '+w),...(latest.rows||[]).map(r=>r.join(' | '))].join('\n');try{await navigator.clipboard.writeText(report);feedback.textContent='Report copied.';}catch{feedback.textContent='Clipboard unavailable. Select and copy the results manually.';}});
function csvCell(s:string){const v=/^[\s]*[=+@-]/.test(s)?"'"+s:s;return '"'+v.replace(/"/g,'""')+'"';}
download.addEventListener('click',()=>{if(!latest)return;const arr=[['Metric','Value'],...latest.metrics.map(m=>[m.label,m.value]),['Summary',latest.summary],...latest.warnings.map(w=>['Caution',w]),...(latest.rows||[]).map(r=>['Detail',...r])];const csv='\uFEFF'+arr.map(r=>r.map(csvCell).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=document.documentElement.dataset.slug+'-results.csv';a.click();URL.revokeObjectURL(url);feedback.textContent='CSV saved locally.';});
