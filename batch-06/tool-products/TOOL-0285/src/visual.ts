import type {Result} from '../_vendor/runtime.js';
export function decorate(output:Result,root:HTMLElement,variant:string){
  if(!output.rows)return;
  if(variant==='plates'){
    const rows=output.rows.slice(1).filter(r=>r.length>=2&&Number.parseInt(r[1])>0);if(!rows.length)return;
    const fig=document.createElement('figure');fig.className='special';const cap=document.createElement('figcaption');cap.textContent='Matched loading on each side of the bar';fig.append(cap);
    const track=document.createElement('div');track.className='plate-track';for(const r of rows){const n=Math.min(20,parseInt(r[1])||0);for(let j=0;j<n;j++){const span=document.createElement('span');span.textContent=r[0].split(' ')[0];span.className='plate';span.title=r[0];track.append(span);}}fig.append(track);root.append(fig);
  }
  if(variant==='label'){
    const fig=document.createElement('figure');fig.className='nutrition-facts';fig.append(document.createElement('hr'));const heading=document.createElement('h3');heading.textContent='Nutrition Facts — Illustrative preview';fig.append(heading);
    for(const metric of output.metrics){const line=document.createElement('div');line.className='nf-row';line.textContent=metric.label+' · '+metric.value;fig.append(line);}
    fig.append(document.createElement('hr'));
    for(const r of output.rows.slice(1)){const line=document.createElement('div');line.className='nf-row';line.textContent=r.join(' — ');fig.append(line);}
    const warning=document.createElement('p');warning.className='nf-warning';warning.textContent='NOT FOR REGULATORY OR PRODUCT LABEL USE';fig.append(warning);root.append(fig);
  }
  if(variant==='clock'){
    const fig=document.createElement('figure');fig.className='clock-grid';fig.setAttribute('aria-label','Bedtime options');for(const r of output.rows.slice(1)){const card=document.createElement('div');card.className='clock-chip';const time=document.createElement('strong');time.textContent=r[1];const text=document.createElement('span');text.textContent=r[0];card.append(time,text);fig.append(card);}root.append(fig);
  }
  if(variant==='comparison' || variant==='pace' || variant==='hiking'){
    if(output.rows.length<2)return;const data=output.rows.slice(1).map(r=>({title:String(r[0]),value:parseFloat(String(r.at(-1)||'').replace(/,/g,''))})).filter(r=>Number.isFinite(r.value)&&r.value>0);
    if(data.length<2)return;const max=Math.max(...data.map(d=>d.value));const wrap=document.createElement('figure');wrap.className='special';const h=document.createElement('figcaption');h.textContent='Side-by-side model perspective';wrap.append(h);for(const d of data.slice(0,8)){const row=document.createElement('div');row.className='compare-item';const label=document.createElement('span');label.textContent=d.title;const bar=document.createElement('div');bar.className='compare-bar';bar.style.width=(d.value/max*100).toFixed(2)+'%';row.append(label,bar);wrap.append(row);}root.append(wrap);
  }
  if(variant==='decay' || variant==='planner'){
    const points=output.rows.slice(variant==='planner'?1:1).map(row=>Number.parseFloat(String(row[1]||'').replace(/,/g,''))).filter(n=>Number.isFinite(n));if(points.length<2)return;
    const max=Math.max(...points,1),step=points.length>1?320/(points.length-1):0;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 350 110');svg.setAttribute('role','img');svg.setAttribute('aria-label',variant==='decay'?'Remaining dose decay curve':'Weekly mileage curve');svg.classList.add('sparkline');const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',points.map((v,j)=>(15+j*step).toFixed(1)+','+(100-v/max*82).toFixed(1)).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','3');svg.append(line);root.append(svg);
  }
}
