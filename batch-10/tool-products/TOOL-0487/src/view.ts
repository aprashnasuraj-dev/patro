/** Presentational comparison only; calculation source is core.ts, not these graphics. */
export function installView():void {
 const root=document.getElementById('tool-app'),form=root?.querySelector('form'),out=root?.querySelector('.output-column');if(!form||!out)return;
 const holder=document.createElement('section');holder.className='special-visual';holder.setAttribute('aria-label',"Topsoil and compost split");
 const heading=document.createElement('h3');heading.textContent="Topsoil and compost split";holder.append(heading);
 const canvas=document.createElement('div');canvas.className='visual-bars';holder.append(canvas);out.append(holder);
 const num=(k:string):number=>{const v=(form.querySelector(`[id$="-${k}"]`) as HTMLInputElement|null)?.value;const n=Number(v);return Number.isFinite(n)?n:0};
 const bar=(leftLabel:string,leftRatio:number,rightLabel:string,rightRatio:number)=>{
   canvas.replaceChildren();for(const [label,value] of [[leftLabel,leftRatio],[rightLabel,rightRatio]] as const){
     const line=document.createElement('div');line.className='visual-line';const name=document.createElement('span');name.textContent=label;
     const track=document.createElement('div');track.className='visual-track';const fill=document.createElement('span');fill.className='visual-fill';fill.style.width=`${Math.max(0,Math.min(100,value*100))}%`;track.append(fill);line.append(name,track);canvas.append(line);
   }
 };
 form.addEventListener('submit',()=>{if(root.querySelector('.error-message')?.textContent?.trim()){canvas.replaceChildren();return;}try{const c=num('compost')/100;bar('Compost share',c,'Topsoil share',1-c);}catch{canvas.replaceChildren();}});
}
