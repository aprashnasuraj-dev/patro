import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0018 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0018";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Release override planner";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="Helm values.yaml to --set Flags";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Flatten Helm values with safe --set-json flags, keeping booleans, arrays and strings distinct.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["--set-json for type fidelity", "Safe shell quoting", "No secrets on CLI"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0018";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"Helm values.yaml to --set Flags",inputLabel:"Helm values.yaml (limited YAML subset)",
    inputHint:"Uses a YAML parser at integration time; --set-json requires compatible Helm. Shell fragments contain safely quoted literal values; secrets passed in CLI arguments can appear in process lists.",sample:"replicaCount: 2\nimage:\n  repository: nginx\n  tag: \"1.27\"\nfeature:\n  enabled: true",action:"Generate Helm flags",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Release override planner \u00b7 output",filename:"helm-flags.sh",maxBytes:250000,
    options:[{"key": "releaseName", "label": "Helm release (example only)", "value": "my-release"}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
