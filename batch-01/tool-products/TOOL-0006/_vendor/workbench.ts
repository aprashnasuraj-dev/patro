/** Source-first UI adapter: loaded only on the individual tool route. No network calls. */
export type Output = { text: string; warnings?: string[]; details?: Record<string,string|number>; downloadName?: string };
export type WorkbenchOptions = {
  root: HTMLElement; title: string; inputLabel: string; inputHint: string; sample: string;
  action: string; inputKind?: 'text'|'file'|'both'; fileAccept?: string; outputLabel: string;
  filename: string; maxBytes: number; run: (value:string, opts:Record<string,string|boolean>) => Output | Promise<Output>;
  options?: Array<{ key:string; label:string; type?:'text'|'checkbox'|'select'; choices?:string[]; value?:string|boolean }>;
};
const el = <T extends keyof HTMLElementTagNameMap>(name:T,cls?:string) => {
  const element = document.createElement(name); if(cls) element.className=cls; return element;
};
export function mountWorkbench(o:WorkbenchOptions):()=>void {
  const root=o.root; root.replaceChildren();
  const layout=el('section','mm-workbench'); layout.setAttribute('aria-label',o.title+' workspace');
  const left=el('div','mm-input-panel'), right=el('div','mm-results-panel');
  const label=el('label','mm-field-label'); label.textContent=o.inputLabel;
  const area=el('textarea','mm-source-editor'); area.id=`mm-source-${o.root.dataset.toolId || 'tool'}`; area.value=o.sample; area.spellcheck=false;
  label.htmlFor=area.id; area.setAttribute('aria-describedby', area.id+'-hint');
  const hint=el('p','mm-help');hint.id=area.id+'-hint';hint.textContent=o.inputHint;
  const f=el('input','mm-file');f.type='file';f.accept=o.fileAccept||'.txt,.json,.yaml,.yml,.har,.env,.sql';
  f.setAttribute('aria-label','Load local file, processed in this browser');
  const opts=el('div','mm-options');const controls:Record<string,HTMLInputElement|HTMLSelectElement>={};
  for(const c of o.options||[]) {
    const wrap=el('label','mm-option'); const span=el('span');span.textContent=c.label;
    let input:HTMLInputElement|HTMLSelectElement;
    if(c.type==='select') {const sel=el('select');for(const choice of c.choices||[]){const option=el('option');option.value=choice;option.textContent=choice;sel.append(option);}sel.value=String(c.value??sel.value);input=sel;}
    else {const i=el('input');i.type=c.type==='checkbox'?'checkbox':'text';if(i.type==='checkbox')i.checked=Boolean(c.value);else i.value=String(c.value??'');input=i;}
    controls[c.key]=input;wrap.append(span,input);opts.append(wrap);
  }
  const actions=el('div','mm-actions'), convert=el('button','mm-primary'), sample=el('button','mm-secondary');
  convert.type='button';convert.textContent=o.action;sample.type='button';sample.textContent='Reset example';actions.append(convert,sample);
  const resultTitle=el('h2','mm-output-title');resultTitle.textContent=o.outputLabel;
  const status=el('p','mm-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Ready — edit the example or load a local file.';
  const stats=el('dl','mm-stats');const result=el('pre','mm-result');result.tabIndex=0;result.setAttribute('aria-label',o.outputLabel);
  const outputActions=el('div','mm-actions');const copy=el('button','mm-secondary'),download=el('button','mm-secondary');copy.type=download.type='button';copy.textContent='Copy output';download.textContent='Download output';copy.disabled=true;download.disabled=true;outputActions.append(copy,download);
  const warnings=el('ul','mm-warnings'); warnings.setAttribute('aria-label','Important limitations or warnings');
  left.append(label,hint,area);if(o.inputKind==='file'||o.inputKind==='both')left.append(f);left.append(opts,actions);
  right.append(resultTitle,status,stats,result,outputActions,warnings);layout.append(left,right);root.append(layout);
  let output='', fileName=o.filename, generation=0;
  const clear=()=>{output='';result.textContent='';copy.disabled=download.disabled=true;warnings.replaceChildren();stats.replaceChildren();};
  f.addEventListener('change',async()=>{const file=f.files?.[0];if(!file)return; if(file.size>o.maxBytes){status.textContent=`File exceeds ${o.maxBytes} byte limit`;return;}
    try{const text=await file.text();if(new TextEncoder().encode(text).length>o.maxBytes)throw Error('Decoded file too large');area.value=text;status.textContent=`Loaded ${file.name} locally`;clear();}catch{status.textContent='Could not read file. No data was sent.';}});
  convert.addEventListener('click',async()=>{const thisRun=++generation;clear();const src=area.value;
    if(new TextEncoder().encode(src).length>o.maxBytes){status.textContent='Input exceeds local processing limit';return;}
    status.textContent='Preparing output locally…';convert.disabled=true;
    try{const values:Record<string,string|boolean>={};for(const [k,v] of Object.entries(controls)) values[k]=v instanceof HTMLInputElement && v.type==='checkbox'?v.checked:v.value;
      const data=await o.run(src,values);if(thisRun!==generation)return;
      output=data.text;fileName=data.downloadName||o.filename;result.textContent=output;copy.disabled=download.disabled=!output;
      for(const [k,value] of Object.entries(data.details||{})){const term=el('dt'),val=el('dd');term.textContent=k;val.textContent=String(value);stats.append(term,val);}
      for(const item of data.warnings||[]){const li=el('li');li.textContent=item;warnings.append(li);}
      status.textContent=`Created ${output.length.toLocaleString()} characters. Review warnings before using generated output.`;
    }catch(e){if(thisRun===generation){status.textContent=e instanceof Error?e.message:'Unable to process input';}}
    finally{if(thisRun===generation)convert.disabled=false;}
  });
  sample.addEventListener('click',()=>{++generation;area.value=o.sample;clear();status.textContent='Example restored.';});
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(output);status.textContent='Output copied.';}catch{status.textContent='Clipboard blocked; select the output text and copy manually.';result.focus();}});
  download.addEventListener('click',()=>{const blob=new Blob([output],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download=fileName;a.click();queueMicrotask(()=>URL.revokeObjectURL(url));status.textContent='Download requested.';});
  return()=>{++generation;root.replaceChildren();};
}
