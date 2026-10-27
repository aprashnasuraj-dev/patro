import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0011 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0011";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Schedule laboratory";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="Cron to GitHub Actions Schedule Generator";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Validate POSIX cron expressions and draft a GitHub Actions workflow without external services.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Five-field calendar", "UTC or IANA time zone", "Minimum 5-minute interval"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0011";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"Cron to GitHub Actions Schedule Generator",inputLabel:"Cron schedule: minute hour day month weekday",
    inputHint:"Only five-field cron, numeric ranges/lists/steps; no Quartz seconds. GitHub schedules may be delayed or skipped under load. Timezone uses supported IANA names.",sample:"15 3 * * 1-5",action:"Generate workflow",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Schedule laboratory \u00b7 output",filename:"schedule.yml",maxBytes:250000,
    options:[{"key": "workflowName", "label": "Workflow name", "value": "Scheduled maintenance"}, {"key": "timezone", "label": "IANA timezone (optional)", "value": "UTC"}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
