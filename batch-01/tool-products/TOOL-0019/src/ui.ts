import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0019 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0019";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Dependency version atlas";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="package-lock.json Duplicate Dependency Finder";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Report package versions appearing at multiple package-lock v2/v3 locations and expose path-level evidence.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Physical installation paths", "Version clusters", "No vulnerability claims"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0019";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"package-lock.json Duplicate Dependency Finder",inputLabel:"npm package-lock.json v2 or v3",
    inputHint:"Multiple versions of the same package are not automatically a vulnerability or redundant install; deduplication can break semver constraints.",sample:"{\"lockfileVersion\":3,\"packages\":{\"\":{\"name\":\"sample\"},\"node_modules/a\":{\"version\":\"1.0.0\"},\"node_modules/b/node_modules/a\":{\"version\":\"2.0.0\"}}}",action:"Find duplicated packages",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Dependency version atlas \u00b7 output",filename:"dependency-duplicates.json",maxBytes:1200000,
    options:[{"key": "minLocations", "label": "Minimum locations (2–20)", "value": "2"}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
