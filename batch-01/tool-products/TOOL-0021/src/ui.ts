import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0021 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0021";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Resource quantity explorer";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="Kubernetes CPU and Memory Units Converter";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Convert Kubernetes CPU and memory quantity syntax into explicit cores, millicores, bytes and IEC/SI units.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["SI / IEC symbols", "CPU millicores", "Exact rational arithmetic"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0021";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"Kubernetes CPU and Memory Units Converter",inputLabel:"One resource per line: cpu= or memory=",
    inputHint:"Kubernetes resource quantities are decimal fixed-point or binary SI, not ordinary human-language units. Values can be extremely large; precision is preserved with integer/fraction arithmetic where feasible.",sample:"cpu=250m\nmemory=512Mi",action:"Convert resource quantities",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Resource quantity explorer \u00b7 output",filename:"k8s-quantities.json",maxBytes:250000,
    options:[],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
