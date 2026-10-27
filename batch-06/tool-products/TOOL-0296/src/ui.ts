import {decorate} from './visual.js';
import {calculate} from './core.js';
import type {Result} from '../_vendor/runtime.js';
const form=document.querySelector<HTMLFormElement>('#tool-form')!;
const status=document.querySelector<HTMLElement>('#status')!;
const result=document.querySelector<HTMLElement>('#result')!;
const title=document.querySelector<HTMLElement>('#result-title')!;
const tiles=document.querySelector<HTMLElement>('#tiles')!;
const warnings=document.querySelector<HTMLElement>('#warnings')!;
const table=document.querySelector<HTMLElement>('#rows')!;
const visual=document.querySelector<HTMLElement>('#visual')!;
const copy=document.querySelector<HTMLButtonElement>('#copy')!;
const exportButton=document.querySelector<HTMLButtonElement>('#export')!;
let latest:Result|null=null;
const text=(tag:string,value:string)=>{const e=document.createElement(tag);e.textContent=value;return e};
function collect(){const x:Record<string,unknown>={};for(const [k,v] of new FormData(form))x[k]=String(v);return x;}
function render(o:Result){latest=o;status.textContent='Calculation complete. Check the assumptions and limitations.';result.hidden=false;title.textContent=o.summary;tiles.replaceChildren();warnings.replaceChildren();table.replaceChildren();visual.replaceChildren();
  for(const v of o.metrics){const dl=document.createElement('dl');dl.className='tile';dl.append(text('dt',v.label),text('dd',v.value));tiles.append(dl);}
  for(const w of o.warnings)warnings.append(text('li',w));
  if(o.rows?.length){const tbl=document.createElement('table');tbl.setAttribute('aria-label','Detailed calculation');const body=document.createElement('tbody');for(const row of o.rows){const tr=document.createElement('tr');for(const item of row)tr.append(text('td',item));body.append(tr);}tbl.append(body);table.append(tbl);}
  const points=(o.rows||[]).slice(0,32).map(row=>({name:String(row[0]||'').slice(0,14),value:parseFloat((row[1]||'').replace(/,/g,''))})).filter(v=>Number.isFinite(v.value)&&v.value>0);
  if(points.length>=2 && !['label','breathing','intervals'].includes(document.body.dataset.variant||'')){
    const max=Math.max(...points.map(v=>v.value));const fig=document.createElement('figure');fig.setAttribute('aria-label','Values represented as proportional bars');fig.className='visual';fig.append(text('figcaption','Relative values from the calculation'));
    for(const p of points.slice(0,18)){const row=document.createElement('div');row.className='barrow';const track=document.createElement('div');track.className='bar-track';const fill=document.createElement('div');fill.className='bar-fill';fill.style.width=(100*p.value/max).toFixed(1)+'%';track.append(fill);row.append(text('span',p.name),track,text('span',Number(p.value.toPrecision(3)).toString()));fig.append(row);}visual.append(fig);
  }
  decorate(o,visual,document.body.dataset.variant||'');
  exportButton.disabled=false;copy.disabled=false;
}
function recalc(){try{render(calculate(collect()));}catch(e){result.hidden=true;latest=null;status.textContent=e instanceof Error?e.message:'Unable to calculate';copy.disabled=true;exportButton.disabled=true;}}
form.addEventListener('submit',e=>{e.preventDefault();recalc()});
copy.addEventListener('click',()=>{if(!latest)return;const s=[latest.summary,...latest.metrics.map(x=>x.label+': '+x.value),...latest.warnings.map(x=>'Note: '+x)].join('\n');void navigator.clipboard.writeText(s).then(()=>{status.textContent='Summary copied';}).catch(()=>{status.textContent='Copy unavailable. Select and copy the visible results.';});});
exportButton.addEventListener('click',()=>{if(!latest)return;const csv=latest.csv || [['Item','Value'],...latest.metrics.map(x=>[x.label,x.value]),...(latest.rows||[])].map(row=>row.map(x=>'"'+x.replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(document.body.dataset.slug||'calculation')+'-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
recalc();
