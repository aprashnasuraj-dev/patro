import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Dedicated Container configuration interaction. Imported only on this route. */
export function mount(root:HTMLElement):()=>void {
 root.dataset.toolId="TOOL-0010";
 return mountWorkbench({
  root,title:"Extract standalone docker run commands from Compose", inputLabel:"Docker Compose YAML",
  inputHint:"Literal image-based service configs only; unsupported networks, dependencies, build and secrets refuse conversion.",sample:"services:\n  web:\n    image: nginx:stable-alpine\n    container_name: demo-web\n    ports:\n      - \"8080:80\"\n    environment:\n      NODE_ENV: production\n    restart: unless-stopped\n",action:"Generate docker run commands",
  inputKind:"both",outputLabel:"Reviewable shell script",filename:"docker-run.sh",
  maxBytes:200000,
  options:[],
  run:(text,options)=>convert(text)
 });
}
export default mount;
