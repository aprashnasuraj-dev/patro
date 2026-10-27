import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0022 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0022";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Pipeline migration map";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="GitHub Actions to GitLab CI Converter";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Produce a GitLab CI draft for a strict subset of GitHub Actions jobs with explicit unsupported-feature findings.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Run-only steps", "No marketplace actions", "Runner migration required"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0022";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"GitHub Actions to GitLab CI Converter",inputLabel:"GitHub Actions workflow YAML",
    inputHint:"Not semantically equivalent for marketplace actions, permissions, secrets, matrices, expression contexts, caches or triggers. Requires manual credentials and runtime review.",sample:"name: Build\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok",action:"Draft GitLab pipeline",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Pipeline migration map \u00b7 output",filename:"gitlab-ci.yml",maxBytes:250000,
    options:[{"key": "stageName", "label": "GitLab stage name", "value": "test"}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
