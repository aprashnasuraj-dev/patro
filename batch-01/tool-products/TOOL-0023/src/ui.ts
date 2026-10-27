import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0023 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0023";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Job portability studio";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="GitLab CI to GitHub Actions Converter";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Translate a narrow subset of GitLab CI jobs into a GitHub Actions draft, without executing arbitrary scripts.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Script-only jobs", "GitHub permissions default", "Needs/stages review"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0023";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"GitLab CI to GitHub Actions Converter",inputLabel:"GitLab CI YAML with simple script jobs",
    inputHint:"Rules, needs, include, extends, artifacts, service containers, protected variables, environments and GitLab runners are not portable without manual migration.",sample:"stages: [test]\nsmoke:\n  stage: test\n  image: node:22\n  script:\n    - echo hello",action:"Draft GitHub workflow",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Job portability studio \u00b7 output",filename:"workflow.yml",maxBytes:250000,
    options:[{"key": "workflowName", "label": "Workflow name", "value": "Migrated GitLab CI"}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
