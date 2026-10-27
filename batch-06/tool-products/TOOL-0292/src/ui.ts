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
  exportButton.disabled=false;copy.disabled=false;
}
function recalc(){try{render(calculate(collect()));}catch(e){result.hidden=true;latest=null;status.textContent=e instanceof Error?e.message:'Unable to calculate';copy.disabled=true;exportButton.disabled=true;}}
form.addEventListener('submit',e=>{e.preventDefault();recalc()});
copy.addEventListener('click',()=>{if(!latest)return;const s=[latest.summary,...latest.metrics.map(x=>x.label+': '+x.value),...latest.warnings.map(x=>'Note: '+x)].join('\n');void navigator.clipboard.writeText(s).then(()=>{status.textContent='Summary copied';}).catch(()=>{status.textContent='Copy unavailable. Select and copy the visible results.';});});
exportButton.addEventListener('click',()=>{if(!latest)return;const csv=latest.csv || [['Item','Value'],...latest.metrics.map(x=>[x.label,x.value]),...(latest.rows||[])].map(row=>row.map(x=>'"'+x.replace(/"/g,'""')+'"').join(',')).join('\r\n');const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(document.body.dataset.slug||'calculation')+'-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
recalc();

const player=document.querySelector<HTMLElement>('#timer-player');
if(player){const start=player.querySelector<HTMLButtonElement>('[data-play]')!,pause=player.querySelector<HTMLButtonElement>('[data-pause]')!,reset=player.querySelector<HTMLButtonElement>('[data-reset]')!;
 const stage=player.querySelector<HTMLElement>('[data-stage]')!,clockEl=player.querySelector<HTMLElement>('[data-clock]')!,ring=player.querySelector<HTMLElement>('[data-ring]')!;
 let parts:{name:string;seconds:number}[]=[],index=0,startMs=0,remainMs=0,raf=0,running=false;
 const parseDuration=(x:string)=>{const t=x.split(':').map(Number);return t.length===3?t[0]*3600+t[1]*60+t[2]:0};
 const renderTick=()=>{const p=parts[index];stage.textContent=p?.name||'Ready';clockEl.textContent=String(Math.ceil(remainMs/1000)).padStart(2,'0')+' s';ring.style.setProperty('--progress',p?(100*(1-remainMs/(p.seconds*1000))).toFixed(2)+'%':'0%');};
 function stop(){running=false;cancelAnimationFrame(raf);start.disabled=false;pause.disabled=true;}
 function refresh(){stop();parts=[];index=0;const v=latest?.rows||[];
 if(document.body.dataset.variant==='breathing'){const chosen=(form.elements.namedItem('pattern') as HTMLSelectElement)?.value;const cycles=Number((form.elements.namedItem('cycles') as HTMLInputElement)?.value);const seq=chosen==='478'?[['Inhale',4],['Hold',7],['Exhale',8]]:[['Inhale',4],['Hold',4],['Exhale',4],['Hold',4]];
 for(let c=0;c<cycles;c++)for(const [name,seconds] of seq)parts.push({name:name+' · cycle '+(c+1),seconds:Number(seconds)});
 }else{for(const row of v)if(row.length>=3&&parseDuration(row[2])>0)parts.push({name:row[1],seconds:parseDuration(row[2])});}
 if(parts.length>400){parts=[];status.textContent='Too many timer phases; reduce rounds or sets.';}remainMs=parts[0]?parts[0].seconds*1000:0;renderTick();}
 const tick=(now:number)=>{if(!running)return;remainMs=Math.max(0,startMs-now);while(remainMs<=0 && index<parts.length-1){index++;remainMs+=parts[index].seconds*1000;startMs=now+remainMs;}if(remainMs<=0){stop();stage.textContent='Completed';clockEl.textContent='0 s';ring.style.setProperty('--progress','100%');return;}renderTick();raf=requestAnimationFrame(tick);};
 start.addEventListener('click',()=>{if(!parts.length)refresh();if(!parts.length)return;if(!remainMs){refresh();}running=true;start.disabled=true;pause.disabled=false;startMs=performance.now()+remainMs;raf=requestAnimationFrame(tick);});
 pause.addEventListener('click',()=>{if(!running)return;remainMs=Math.max(0,startMs-performance.now());stop();renderTick();});
 reset.addEventListener('click',refresh);
 form.addEventListener('submit',()=>{refresh();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){remainMs=Math.max(0,startMs-performance.now());stop();status.textContent='Timer paused when tab was hidden to prevent unnoticed intervals.';renderTick();}});
 refresh();
}
