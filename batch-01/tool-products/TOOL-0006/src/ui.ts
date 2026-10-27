import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Dedicated Sensitive debug log handling interaction. Imported only on this route. */
export function mount(root:HTMLElement):()=>void {
 root.dataset.toolId="TOOL-0006";
 return mountWorkbench({
  root,title:"Make HAR diagnostics safer to share", inputLabel:"HTTP Archive (.har)",
  inputHint:"Input stays in the browser. Fail-closed rebuild removes unknown fields and identifying URL paths.",sample:"{\"log\":{\"version\":\"1.2\",\"entries\":[{\"startedDateTime\":\"2026-10-26T00:00:00Z\",\"time\":30,\"request\":{\"method\":\"GET\",\"url\":\"https://example.com/private?token=secret\",\"headers\":[{\"name\":\"Authorization\",\"value\":\"Bearer secret\"}]},\"response\":{\"status\":200,\"content\":{\"text\":\"sensitive response\",\"size\":100},\"headers\":[{\"name\":\"Set-Cookie\",\"value\":\"session=secret\"}]},\"timings\":{\"wait\":22,\"receive\":8}}]}}",action:"Redact HAR securely",
  inputKind:"both",outputLabel:"Redacted HAR + removal statistics",filename:"redacted.har",
  maxBytes:3000000,
  options:[],
  run:(text,options)=>convert(text)
 });
}
export default mount;
