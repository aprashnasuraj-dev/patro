import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0025 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0025";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Route precedence debugger";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="Nginx Location Block Match Tester";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Simulate selection among simple Nginx location directives and explain exact/prefix/regex precedence.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Exact precedence", "Longest-prefix logic", "Regex-order trace"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0025";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"Nginx Location Block Match Tester",inputLabel:"Nginx location snippets",
    inputHint:"This models documented initial location selection only, not nested locations, rewrite/internal redirects, named locations or upstream runtime configuration.",sample:"location = /health { return 200; }\nlocation ^~ /assets/ { root /srv/www; }\nlocation ~* \\.(png|jpg)$ { root /srv/img; }\nlocation / { proxy_pass http://backend; }",action:"Evaluate location match",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Route precedence debugger \u00b7 output",filename:"nginx-location-result.json",maxBytes:250000,
    options:[{"key": "uri", "label": "Request URI (path only)", "value": "/assets/logo.png"}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
