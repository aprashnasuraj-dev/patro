import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0012 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0012";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Data profiling studio";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="CSV to SQL CREATE TABLE (Type-Inferred)";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Profile CSV columns and generate PostgreSQL 18 DDL with conservative SQL types.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Quoted identifiers", "Data-type inference", "Nullable until reviewed"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0012";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"CSV to SQL CREATE TABLE (Type-Inferred)",inputLabel:"CSV with a header row",
    inputHint:"Sample-based inference does not prove constraints or future values; defaults to nullable types and no automatically inferred primary keys. PostgreSQL DDL review required.",sample:"id,name,enabled,amount,date\n1,Ada,true,2.50,2026-01-04\n2,Lin,false,8.25,2026-03-05",action:"Infer SQL table",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Data profiling studio \u00b7 output",filename:"create_table.sql",maxBytes:250000,
    options:[{"key": "tableName", "label": "PostgreSQL table", "value": "imported_records"}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
