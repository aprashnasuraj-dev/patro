import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0013 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0013";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Conflict plan builder";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="JSON to PostgreSQL Upsert Generator";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Generate reviewable parameter placeholders plus values manifest for PostgreSQL INSERT ON CONFLICT.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Bindable placeholders", "ON CONFLICT semantics", "Existing unique index required"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0013";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"JSON to PostgreSQL Upsert Generator",inputLabel:"JSON object or array of records",
    inputHint:"Requires a real matching unique or exclusion constraint for conflict target. Generated placeholders are not interpolated SQL literals; bind parameter values in a trusted client.",sample:"[{\"id\":1,\"name\":\"Ada\"},{\"id\":2,\"name\":\"Lin\"}]",action:"Generate upsert SQL",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Conflict plan builder \u00b7 output",filename:"upsert.sql",maxBytes:250000,
    options:[{"key": "tableName", "label": "Target table", "value": "records"}, {"key": "conflictKey", "label": "Existing unique key", "value": "id"}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
