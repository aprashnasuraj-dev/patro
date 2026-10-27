import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0017 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0017";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Infrastructure variable editor";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="Terraform tfvars to JSON Converter";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Convert a deliberately bounded literal HCL tfvars subset into terraform.tfvars.json.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Literal HCL subset", "Nested lists/objects", "No function evaluation"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0017";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"Terraform tfvars to JSON Converter",inputLabel:"Literal native .tfvars assignments",
    inputHint:"HCL expressions, interpolation, function calls and complex block syntax are rejected. Comments supported; source credentials remain only in your browser.",sample:"region = \"ap-south-1\"\nreplicas = 2\nenabled = true\nports = [80, 443]\ntags = { owner = \"infra\", env = \"dev\" }",action:"Convert tfvars",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Infrastructure variable editor \u00b7 output",filename:"terraform.tfvars.json",maxBytes:250000,
    options:[{"key": "pretty", "label": "Readable JSON output", "type": "checkbox", "value": true}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
