import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Import on TOOL-0016 route only; never eager-load all tool modules. */
export function mount(root:HTMLElement):()=>void {
  root.dataset.toolId="TOOL-0016";
  root.replaceChildren();
  const hero=document.createElement('header');hero.className='mm-specialty-header';
  const kicker=document.createElement('p');kicker.className='mm-kicker';kicker.textContent="Traffic log analyzer";
  const h=document.createElement('h2');h.className='mm-specialty-title';h.textContent="Nginx / Apache Access Log to CSV";
  const subtitle=document.createElement('p');subtitle.className='mm-specialty-description';subtitle.textContent="Parse Common and Combined access log records into structured CSV with malformed line reporting.";
  const features=document.createElement('ul');features.className='mm-proof-points';
  for(const item of ["Common and Combined logs", "CSV formula neutralization", "Malformed line reporting"]){const li=document.createElement('li');li.textContent=item;features.append(li);}
  hero.append(kicker,h,subtitle,features);root.append(hero);
  const workspace=document.createElement('div');workspace.dataset.toolId="TOOL-0016";root.append(workspace);
  const cleanup=mountWorkbench({
    root:workspace,title:"Nginx / Apache Access Log to CSV",inputLabel:"Apache/Nginx common or combined access logs",
    inputHint:"Supports default CLF/Combined log formats, not custom log_format or JSON access logs. CSV values are quoted and spreadsheet-formula cells neutralized.",sample:"127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] \"GET /apache_pb.gif HTTP/1.0\" 200 2326 \"http://example.test/start\" \"TestAgent/1.0\"",action:"Extract CSV",
    inputKind:'both',fileAccept:".yml,.yaml,.json,.txt,.csv,.tfvars,.log,.sql,.Dockerfile",
    outputLabel:"Traffic log analyzer \u00b7 output",filename:"access-log.csv",maxBytes:1200000,
    options:[{"key": "strict", "label": "Reject all malformed rows", "type": "checkbox", "value": true}],
    run:(text,opts)=>convert(text,opts)
  });
  return()=>{cleanup();root.replaceChildren();};
}
export default mount;
