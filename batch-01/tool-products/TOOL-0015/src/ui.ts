import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0015 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0015";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Record stream organizer";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="JSONL / NDJSON to JSON Array Converter";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Convert line-delimited JSON records into one JSON array without skipping malformed lines.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Line-numbered failures", "Preserve value types", "No records silently dropped"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0015";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"JSONL / NDJSON to JSON Array Converter",inputLabel:"One JSON value per nonblank line",
    inputHint:"Parsing uses a bounded in-browser string; very large NDJSON files require a streaming integration. Empty lines optionally ignored.",sample:"{\"id\":1,\"name\":\"Ada\"}\n{\"id\":2,\"name\":\"Lin\"}",action:"Build JSON array",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Record stream organizer \u00b7 output",filename:"records.json",maxBytes:1200000,
    options:[{"key": "ignoreBlank", "label": "Ignore blank lines", "type": "checkbox", "value": true}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
