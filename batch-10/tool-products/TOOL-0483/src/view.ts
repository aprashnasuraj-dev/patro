/** Presentational comparison only; calculation source is core.ts, not these graphics. */
export function installView():void {
 const root=document.getElementById('tool-app'),form=root?.querySelector('form'),out=root?.querySelector('.output-column');if(!form||!out)return;
 const holder=document.createElement('section');holder.className='special-visual';holder.setAttribute('aria-label',"Available floor-area diagram");
 const heading=document.createElement('h3');heading.textContent="Available floor-area diagram";holder.append(heading);
 const canvas=document.createElement('div');canvas.className='visual-bars';holder.append(canvas);out.append(holder);
 const num=(k:string):number=>{const v=(form.querySelector(`[id$="-${k}"]`) as HTMLInputElement|null)?.value;const n=Number(v);return Number.isFinite(n)?n:0};
 const bar=(leftLabel:string,leftRatio:number,rightLabel:string,rightRatio:number)=>{
   canvas.replaceChildren();for(const [label,value] of [[leftLabel,leftRatio],[rightLabel,rightRatio]] as const){
     const line=document.createElement('div');line.className='visual-line';const name=document.createElement('span');name.textContent=label;
     const track=document.createElement('div');track.className='visual-track';const fill=document.createElement('span');fill.className='visual-fill';fill.style.width=`${Math.max(0,Math.min(100,value*100))}%`;track.append(fill);line.append(name,track);canvas.append(line);
   }
 };
 form.addEventListener('submit',()=>{if(root.querySelector('.error-message')?.textContent?.trim()){canvas.replaceChildren();return;}try{const a=num('length')*num('width'),u=Math.min(a,num('unavailable'));bar('Usable room',a?(a-u)/a:0,'Stage and obstacles',a?u/a:0);const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 340 140');svg.setAttribute('role','img');svg.setAttribute('aria-label','Usable room diagram and obstacle area');const room=document.createElementNS(ns,'rect');room.setAttribute('x','5');room.setAttribute('y','5');room.setAttribute('width','330');room.setAttribute('height','130');room.setAttribute('rx','9');room.setAttribute('fill','none');room.setAttribute('stroke','currentColor');room.setAttribute('stroke-width','3');svg.append(room);const obs=document.createElementNS(ns,'rect');obs.setAttribute('x','5');obs.setAttribute('y','5');obs.setAttribute('width',String(a?Math.min(330,330*u/a):0));obs.setAttribute('height','130');obs.setAttribute('fill','var(--product-accent)');obs.setAttribute('opacity','.4');svg.append(obs);canvas.append(svg);}catch{canvas.replaceChildren();}});
}
