import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0020 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0020";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Structure comparison";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="Semantic JSON Diff (Ignore Key and Array Order)";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Compare JSON documents by deep semantics: unordered object keys and optionally unordered arrays with duplicate counts preserved.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Deep object equality", "Array-multiset semantics", "JSON Pointer paths"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0020";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"Semantic JSON Diff (Ignore Key and Array Order)",inputLabel:"Two JSON values separated by a line of ---JSON-DIFF---",
    inputHint:"Unordered arrays implement multiset semantics (duplicates matter); array sorting may erase meaningful sequence semantics. Large nested values are bounded to prevent resource exhaustion.",sample:"{\"a\":1,\"items\":[3,1,3]}\n---JSON-DIFF---\n{\"items\":[1,3,3],\"a\":1}",action:"Compare JSON",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Structure comparison \u00b7 output",filename:"semantic-diff.json",maxBytes:250000,
    options:[{"key": "ignoreArrayOrder", "label": "Ignore array ordering", "type": "checkbox", "value": true}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
