import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0024 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0024";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Layer risk review";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="Dockerfile Linter and Layer Cache Advisor";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Review Dockerfile directives for common cache inefficiencies and safety concerns with line-specific citations.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Layer-cache hints", "Build security flags", "Line-specific findings"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0024";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"Dockerfile Linter and Layer Cache Advisor",inputLabel:"Dockerfile text",
    inputHint:"Heuristics are advisory and not a Dockerfile parser, security scanner or vulnerability database. Results depend on build context and multi-stage design.",sample:"FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD [\"node\", \"app.js\"]",action:"Inspect Dockerfile",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Layer risk review \u00b7 output",filename:"dockerfile-advice.json",maxBytes:250000,
    options:[{"key": "strict", "label": "Advisory mode", "type": "checkbox", "value": true}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
