import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Dedicated Protocol schema design interaction. Imported only on this route. */
export function mount(root:HTMLElement):()=>void {
 root.dataset.toolId="TOOL-0005";
 return mountWorkbench({
  root,title:"Build an editable proto3 message draft from JSON", inputLabel:"Example JSON object",
  inputHint:"Accepts top-level objects, nested objects and scalar arrays; rejects nested arrays and ambiguous shapes.",sample:"{\n  \"customer_id\": 12,\n  \"active\": true,\n  \"name\": \"Mira\",\n  \"addresses\": [{\"city\": \"Kathmandu\", \"zip\": 44600}],\n  \"labels\": [\"regular\", \"email\"]\n}",action:"Generate .proto source",
  inputKind:"both",outputLabel:"Protobuf schema",filename:"schema.proto",
  maxBytes:170000,
  options:[{"key": "rootName", "label": "Root message name", "value": "Customer"}, {"key": "packageName", "label": "Package name", "value": "app.models"}],
  run:(text,options)=>convert(text,{rootName:String(options.rootName||'Root'),packageName:String(options.packageName||'local.generated')})
 });
}
export default mount;
