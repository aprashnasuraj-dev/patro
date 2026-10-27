import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Dedicated Deployment secrets interaction. Imported only on this route. */
export function mount(root:HTMLElement):()=>void {
 root.dataset.toolId="TOOL-0009";
 return mountWorkbench({
  root,title:"Convert a local .env file into Kubernetes Secret YAML", inputLabel:"Literal .env assignments",
  inputHint:"Quotes and simple escaped double-quoted characters supported; no shell expansion or multi-line variables.",sample:"# Development-only demonstration values\nAPI_USER=example\nAPI_PASSWORD=\"placeholder-not-real\"\nLOG_LEVEL=info\n",action:"Create Secret manifest",
  inputKind:"both",outputLabel:"Kubernetes Secret YAML",filename:"secret.yaml",
  maxBytes:100000,
  options:[{"key": "name", "label": "Secret name", "value": "app-credentials"}, {"key": "namespace", "label": "Namespace", "value": "default"}],
  run:(text,options)=>convert(text,{name:String(options.name||'application-secrets'),namespace:String(options.namespace||'default')})
 });
}
export default mount;
