/** Presentational comparison only; calculation source is core.ts, not these graphics. */
export function installView():void {
 const root=document.getElementById('tool-app'),form=root?.querySelector('form'),out=root?.querySelector('.output-column');if(!form||!out)return;
 const holder=document.createElement('section');holder.className='special-visual';holder.setAttribute('aria-label',"Top-down cloth footprint");
 const heading=document.createElement('h3');heading.textContent="Top-down cloth footprint";holder.append(heading);
 const canvas=document.createElement('div');canvas.className='visual-bars';holder.append(canvas);out.append(holder);
 const num=(k:string):number=>{const v=(form.querySelector(`[id$="-${k}"]`) as HTMLInputElement|null)?.value;const n=Number(v);return Number.isFinite(n)?n:0};
 const bar=(leftLabel:string,leftRatio:number,rightLabel:string,rightRatio:number)=>{
   canvas.replaceChildren();for(const [label,value] of [[leftLabel,leftRatio],[rightLabel,rightRatio]] as const){
     const line=document.createElement('div');line.className='visual-line';const name=document.createElement('span');name.textContent=label;
     const track=document.createElement('div');track.className='visual-track';const fill=document.createElement('span');fill.className='visual-fill';fill.style.width=`${Math.max(0,Math.min(100,value*100))}%`;track.append(fill);line.append(name,track);canvas.append(line);
   }
 };
 form.addEventListener('submit',()=>{if(root.querySelector('.error-message')?.textContent?.trim()){canvas.replaceChildren();return;}try{const l=num('length'),drop=num('drop');bar('Table width / cloth width',l/(l+2*drop),'Edge-drop share',2*drop/(l+2*drop));const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 340 190');svg.setAttribute('role','img');svg.setAttribute('aria-label','Top-down cloth and inset tabletop with drop');const round=(form.querySelector('[id$="-shape"]') as HTMLSelectElement|null)?.value==='Round';const shape=round?'circle':'rect';const outer=document.createElementNS(ns,shape),inner=document.createElementNS(ns,shape);for(const [e,innerFlag] of [[outer,false],[inner,true]] as const){if(round){e.setAttribute('cx','170');e.setAttribute('cy','95');e.setAttribute('r',String(innerFlag?Math.max(1,82*l/(l+2*drop)):83));}else{e.setAttribute('x',String(innerFlag?25+Math.min(55,55*drop/(l+2*drop)):25));e.setAttribute('y',String(innerFlag?30+Math.min(40,40*drop/(l+2*drop)):30));e.setAttribute('width',String(innerFlag?290-2*Math.min(55,55*drop/(l+2*drop)):290));e.setAttribute('height',String(innerFlag?130-2*Math.min(40,40*drop/(l+2*drop)):130));e.setAttribute('rx','9');}e.setAttribute('fill',innerFlag?'none':'var(--product-accent)');e.setAttribute('stroke','currentColor');e.setAttribute('stroke-width',innerFlag?'3':'2');e.setAttribute('opacity',innerFlag?'1':'.45');svg.append(e);}canvas.append(svg);}catch{canvas.replaceChildren();}});
}
