
export type Field = {
  name:string; label:string; type?:'number'|'text'|'select'|'textarea'|'checkbox';
  value?:string|number|boolean; min?:number; max?:number; step?:number; options?:Array<{value:string,label:string}>;
  help?:string; placeholder?:string;
};
export type MountOptions = {
  fields:Field[]; compute:(input:Record<string,any>)=>any;
  intro?:string; resultTitle?:string;
};
function el<K extends keyof HTMLElementTagNameMap>(tag:K, cls?:string){const x=document.createElement(tag); if(cls)x.className=cls; return x}
function parseValue(node:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement, field:Field){
  if(field.type==='checkbox') return (node as HTMLInputElement).checked;
  if(field.type==='number'){const v=Number(node.value); if(!Number.isFinite(v)) throw new Error(`${field.label}: enter a valid number.`); return v}
  return node.value;
}
function addValue(container:HTMLElement,k:string,v:any){
  if(Array.isArray(v)){
    const box=el('div','result-block'); const h=el('h3'); h.textContent=k; box.append(h);
    if(v.length && typeof v[0]==='object'){
      const table=el('table','result-table'); const head=el('thead'); const tr=el('tr');
      const keys=Object.keys(v[0]).slice(0,10); keys.forEach(x=>{const th=el('th'); th.textContent=x; tr.append(th)}); head.append(tr); table.append(head);
      const body=el('tbody');
      v.slice(0,200).forEach(row=>{const rr=el('tr'); keys.forEach(x=>{const td=el('td'); td.textContent=String(row[x]??''); rr.append(td)}); body.append(rr)}); table.append(body); box.append(table);
    } else {
      const pre=el('pre'); pre.textContent=v.map(String).join('\n'); box.append(pre);
    }
    container.append(box); return;
  }
  if(v && typeof v==='object'){
    const box=el('div','result-block'); const h=el('h3'); h.textContent=k; box.append(h);
    Object.entries(v).forEach(([kk,vv])=>addValue(box,kk,vv)); container.append(box); return;
  }
  const card=el('div','metric'); const key=el('span'); key.textContent=k; const val=el('strong'); val.textContent=String(v); card.append(key,val); container.append(card);
}
export function mountTool(opts:MountOptions){
  const host=document.querySelector<HTMLElement>('#app'); if(!host) throw new Error('Missing #app');
  const form=el('form','tool-form'); form.noValidate=true;
  const grid=el('div','form-grid');
  const controls:Record<string,HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>={};
  opts.fields.forEach(f=>{
    const wrap=el('label','field'); const lab=el('span','field-label'); lab.textContent=f.label; wrap.append(lab);
    let node:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
    if(f.type==='select'){const s=el('select') as HTMLSelectElement;(f.options||[]).forEach(o=>{const op=el('option');op.value=o.value;op.textContent=o.label;s.append(op)}); if(f.value!==undefined)s.value=String(f.value);node=s}
    else if(f.type==='textarea'){const t=el('textarea') as HTMLTextAreaElement;t.rows=6;t.value=String(f.value??'');t.placeholder=f.placeholder||'';node=t}
    else {const i=el('input') as HTMLInputElement;i.type=f.type==='checkbox'?'checkbox':(f.type==='number'?'number':'text'); if(f.type==='checkbox')i.checked=Boolean(f.value);else i.value=String(f.value??''); if(f.min!==undefined)i.min=String(f.min);if(f.max!==undefined)i.max=String(f.max);if(f.step!==undefined)i.step=String(f.step);i.placeholder=f.placeholder||'';node=i}
    node.id=`f-${f.name}`; controls[f.name]=node; wrap.append(node);
    if(f.help){const small=el('small');small.textContent=f.help;wrap.append(small)}
    grid.append(wrap);
  });
  const btn=el('button','primary'); btn.type='submit'; btn.textContent='Calculate';
  form.append(grid,btn);
  const alert=el('div','alert'); alert.setAttribute('role','alert');
  const out=el('section','results'); const title=el('h2'); title.textContent=opts.resultTitle||'Results'; const body=el('div','metrics'); out.append(title,body);
  form.addEventListener('submit',e=>{
    e.preventDefault(); alert.textContent=''; body.replaceChildren();
    try{
      const input:Record<string,any>={}; opts.fields.forEach(f=>input[f.name]=parseValue(controls[f.name],f));
      const result=opts.compute(input);
      Object.entries(result||{}).forEach(([k,v])=>addValue(body,k,v));
    }catch(err){alert.textContent=err instanceof Error?err.message:String(err)}
  });
  host.append(form,alert,out);
}
