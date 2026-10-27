import type {Result} from './guard';
export type Field = { key:string; label:string; default:string|number; type:string; min?:number; max?:number; unit?:string; step?:string; help?:string; options?:string[] };
export type Config={ id:string; name:string; variant:'compare'|'timeline'|'ledger'|'gauge'|'split'|'decoder'; tagline:string; action:string; fields:Field[] };
const E=(tag:string,cl='',txt=''):HTMLElement=>{const el=document.createElement(tag);if(cl)el.className=cl;if(txt)el.textContent=txt;return el;};
function metricCard(o:{label:string;value:string},kind:string):HTMLElement {const card=E('div','metric '+kind);const key=E('span','metric-label',o.label),v=E('strong','metric-value',o.value);card.append(key,v);return card;}
function render(out:HTMLElement, result:Result, view:Config['variant']):void {
  out.replaceChildren();out.className='results results-'+view;
  const head=E('h2','result-heading','Calculated scenario');out.append(head);
  const shell=E(view==='ledger'?'div':'div',view==='ledger'?'ledger-view':'metric-grid');
  for(const [idx,entry] of result.outputs.entries()){
    if(view==='ledger') {const row=E('div','ledger-row');row.append(E('span','ledger-label',entry.label),E('strong','ledger-value',entry.value));shell.append(row);}
    else shell.append(metricCard(entry,idx===0?'primary':'secondary'));
  }out.append(shell);
  if(view==='gauge' ||view==='split') {
    const meter=E('div','barview');const max=Math.max(1,...result.outputs.map(o=>Math.abs(Number(o.value.replace(/[^0-9.-]/g,'')))||0));
    result.outputs.forEach((v,j)=>{const n=Number(v.value.replace(/[^0-9.-]/g,''));if(!Number.isFinite(n)||n<0)return;const line=E('div','barline');const label=E('span','barname',v.label),track=E('div','bartrack'),fill=E('div','barfill');fill.style.width=`${Math.min(100,n/max*100)}%`;fill.style.opacity=String(Math.max(.35,1-j*.09));track.append(fill);line.append(label,track);meter.append(line);});
    if(meter.childElementCount)out.append(meter);
  }
  if(result.steps.length){const formula=E('section','method');formula.append(E('h3','','How this result was derived'));const ul=E('ul');result.steps.forEach(x=>ul.append(E('li','',x)));formula.append(ul);out.append(formula);}
  if(result.warnings.length){const warnings=E('aside','warnings');warnings.append(E('h3','','Important conditions'));const ul=E('ul');result.warnings.forEach(w=>ul.append(E('li','',w)));warnings.append(ul);out.append(warnings);}
}
export function mount(config:Config,calc:(input:Record<string,unknown>)=>Result):void {
 const root=document.getElementById('tool-app');if(!root)throw Error('Missing tool-app mount');
 root.dataset.variant=config.variant;
 const shell=E('div','workspace');const left=E('div','inputs-column');const introduction=E('div','tool-label',config.tagline);
 const form=document.createElement('form');form.noValidate=true;form.className='tool-form';form.append(introduction);
 const controls=new Map<string,HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>();
 config.fields.forEach(f=>{const box=E('div','field field-'+f.type);const id=`input-${config.id}-${f.key}`;const label=document.createElement('label');label.htmlFor=id;label.textContent=f.label;box.append(label);
 let element:HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;
 if(f.type==='textarea'){const t=document.createElement('textarea');t.rows=4;t.maxLength=4000;t.value=String(f.default);element=t;}
 else if(f.type==='select'){const s=document.createElement('select');for(const opt of f.options||[]){const option=document.createElement('option');option.value=opt;option.textContent=opt;s.append(option)}s.value=String(f.default);element=s;}
 else {const input=document.createElement('input');input.type=f.type==='date-optional'?'date':f.type;input.value=String(f.default);if(f.type==='number'){input.inputMode='decimal';if(f.min!==undefined)input.min=String(f.min);if(f.max!==undefined)input.max=String(f.max);input.step=f.step??'any'}if(f.type==='text')input.maxLength=100;element=input;}
 element.id=id;element.setAttribute('aria-describedby',id+'-hint');box.append(element);
 const helper=E('small','field-hint',f.help || (f.unit?`Unit: ${f.unit}`:''));helper.id=id+'-hint';box.append(helper);form.append(box);controls.set(f.key,element);});
 const action=document.createElement('button');action.type='submit';action.className='primary-action';action.textContent=config.action;form.append(action);
 const err=E('p','error-message');err.setAttribute('role','alert');form.append(err);left.append(form);const right=E('section','output-column');right.setAttribute('aria-label',config.name+' calculation output');
 const out=E('div','results results-empty');out.setAttribute('role','status');out.setAttribute('aria-live','polite');out.setAttribute('aria-atomic','true');out.append(E('p','placeholder','Use the inputs and run this calculator to see its result and method.'));right.append(out);
 const ops=E('div','export-actions');const copy=document.createElement('button');copy.type='button';copy.className='secondary-action';copy.textContent='Copy results';const download=document.createElement('button');download.type='button';download.className='secondary-action';download.textContent='Export JSON';copy.disabled=true;download.disabled=true;ops.append(copy,download);right.append(ops);
 const help=E('span','copy-status');help.setAttribute('aria-live','polite');right.append(help);shell.append(left,right);root.replaceChildren(shell);
 let latest:Result|null=null;let inputs:Record<string,unknown>={};
 form.addEventListener('submit',event=>{event.preventDefault();err.textContent='';help.textContent='';const values:Record<string,unknown>={};for(const [name,el] of controls){if(el instanceof HTMLInputElement&&el.type==='number'){values[name]=el.value;}else values[name]=el.value;}
 try{const result=calc(values);inputs=values;latest=result;copy.disabled=false;download.disabled=false;render(out,result,config.variant)}catch(e){latest=null;copy.disabled=true;download.disabled=true;out.replaceChildren(E('p','placeholder','Correct the highlighted input or unsupported scenario to calculate.'));err.textContent=e instanceof Error?e.message:'Calculation error';}
 });
 copy.addEventListener('click',()=>{if(!latest)return;const t=latest.outputs.map(x=>`${x.label}: ${x.value}`).join('\n')+'\n'+latest.warnings.map(x=>'Warning: '+x).join('\n');
 if(!navigator.clipboard){help.textContent='Clipboard unavailable in this browser; use Export JSON.';return;}navigator.clipboard.writeText(t).then(()=>help.textContent='Results copied.').catch(()=>help.textContent='Clipboard was blocked; use Export JSON.');});
 download.addEventListener('click',()=>{if(!latest)return;const data=JSON.stringify({tool_id:config.id,calculated_at:new Date().toISOString(),inputs,outputs:latest.outputs,warnings:latest.warnings,steps:latest.steps},null,2);if(data.length>20000){help.textContent='Export is too large';return;}
 const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`${config.id}-estimate.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);help.textContent='Prepared local JSON export.';});
}
