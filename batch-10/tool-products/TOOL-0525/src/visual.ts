import type {Result} from '../_vendor/runtime.js';
/** Local SVG source preparation; no chart dependencies or telemetry. */
const NS='http://www.w3.org/2000/svg';
const el=(name:string)=>document.createElementNS(NS,name);
export function renderVisual(r:Result){
  const mount=document.querySelector<HTMLElement>('#visual-result');if(!mount)return;
  mount.replaceChildren();const values:number[]=[];const names:string[]=[];
  const candidates=r.metrics.map(m=>[m.label,m.value]);
  for(const v of candidates){
    const label=String(v[0]??'');const raw=String(v[1 ]??'');
    const num=Number(raw.replace(/[^0-9.\-]/g,''));if(Number.isFinite(num)&&raw.trim()!==''&&values.length<12){values.push(num);names.push(label.slice(0,28));}
  }
  if(values.length<2)return;
  const width=620,height=240,pad=44,svg=el('svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Annual heating costs visualized from calculated numeric outputs');svg.style.cssText='width:100%;height:auto;display:block;max-width:100%';
  const name=el('title');name.textContent='Annual heating costs';svg.append(name);
  const low=Math.min(0,...values),high=Math.max(...values),range=Math.max(1,high-low),y=(v:number)=>height-pad-(v-low)/range*(height-2*pad);
  const axis=el('line');axis.setAttribute('x1',String(pad));axis.setAttribute('x2',String(width-pad));axis.setAttribute('y1',String(y(0)));axis.setAttribute('y2',String(y(0)));axis.setAttribute('stroke','currentColor');axis.setAttribute('stroke-opacity','.5');svg.append(axis);
  if('bar'==='line'){
    const points=values.map((v,i)=>`${pad+i*(width-2*pad)/Math.max(1,values.length-1)},${y(v)}`).join(' ');
    const p=el('polyline');p.setAttribute('points',points);p.setAttribute('fill','none');p.setAttribute('stroke','#3895c1');p.setAttribute('stroke-width','3');svg.append(p);
    values.forEach((v,i)=>{const c=el('circle');c.setAttribute('cx',String(pad+i*(width-2*pad)/Math.max(1,values.length-1)));c.setAttribute('cy',String(y(v)));c.setAttribute('r','4');c.setAttribute('fill','#3895c1');svg.append(c);});
  }else{
    const bw=(width-2*pad)/values.length*.65;
    values.forEach((v,i)=>{const x=pad+(i+.17)*(width-2*pad)/values.length,rect=el('rect'),top=Math.min(y(v),y(0)),bh=Math.max(1,Math.abs(y(v)-y(0)));rect.setAttribute('x',String(x));rect.setAttribute('y',String(top));rect.setAttribute('width',String(bw));rect.setAttribute('height',String(bh));rect.setAttribute('fill','#3988ac');svg.append(rect);});
  }
  const caption=document.createElement('p');caption.className='chart-note';caption.textContent='Annual heating costs. Review exact numbers above; axis is scaled for this scenario.';
  mount.append(svg,caption);
}
