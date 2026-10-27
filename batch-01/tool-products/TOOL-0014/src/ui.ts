import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0014 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0014";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="BSON shape inspector";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="MongoDB Extended JSON to Plain JSON";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Normalize Extended JSON v2 markers while explicitly preserving non-JSON BSON types in tagged wrappers.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Canonical or Relaxed JSON", "Decimal precision retained", "Explicit BSON tagging"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0014";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"MongoDB Extended JSON to Plain JSON",inputLabel:"Extended JSON v2 document",
    inputHint:"Plain JSON cannot preserve all BSON type semantics. Wrapper mode retains BSON markers as strings/tags; unrecognized markers stay unchanged and are warned about.",sample:"{\"_id\":{\"$oid\":\"507f1f77bcf86cd799439011\"},\"balance\":{\"$numberDecimal\":\"12.30\"},\"active\":true}",action:"Convert BSON markers",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"BSON shape inspector \u00b7 output",filename:"plain-json.json",maxBytes:250000,
    options:[{"key": "mode", "label": "BSON fidelity", "type": "select", "choices": ["tagged", "lossy"], "value": "tagged"}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
