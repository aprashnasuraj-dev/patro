import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Dedicated HTTP debugging workflow interaction. Imported only on this route. */
export function mount(root:HTMLElement):()=>void {
 root.dataset.toolId="TOOL-0007";
 return mountWorkbench({
  root,title:"Turn captured HTTP traffic into reviewable curl scripts", inputLabel:"HAR captured requests",
  inputHint:"Supports HTTP(S) GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS; maximum 200 requests.",sample:"{\"log\":{\"version\":\"1.2\",\"entries\":[{\"request\":{\"method\":\"GET\",\"url\":\"https://example.com/api/users?api_key=TOPSECRET\",\"headers\":[{\"name\":\"Accept\",\"value\":\"application/json\"},{\"name\":\"Authorization\",\"value\":\"Bearer secret\"}]}}]}}",action:"Prepare curl script",
  inputKind:"both",outputLabel:"POSIX shell command preview",filename:"replay-curl.sh",
  maxBytes:2000000,
  options:[{"key": "includeBodies", "label": "Include request bodies (sensitive)", "type": "checkbox", "value": false}, {"key": "keepQuery", "label": "Keep query strings (sensitive)", "type": "checkbox", "value": false}],
  run:(text,options)=>convert(text,{includeBodies:options.includeBodies===true,keepQuery:options.keepQuery===true})
 });
}
export default mount;
