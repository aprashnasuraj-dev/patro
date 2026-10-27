import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Dedicated API documentation interaction. Imported only on this route. */
export function mount(root:HTMLElement):()=>void {
 root.dataset.toolId="TOOL-0008";
 return mountWorkbench({
  root,title:"Turn a Postman collection into a structured API handbook", inputLabel:"Postman Collection JSON export",
  inputHint:"Postman Collection v2.0/v2.1 single JSON file; nested folders are preserved.",sample:"{\"info\":{\"name\":\"Project API\",\"schema\":\"https://schema.getpostman.com/json/collection/v2.1.0/collection.json\"},\"item\":[{\"name\":\"Accounts\",\"item\":[{\"name\":\"List customers\",\"request\":{\"method\":\"GET\",\"url\":\"{{baseUrl}}/customers?api_key=hidden\",\"header\":[{\"key\":\"Accept\",\"value\":\"application/json\"}]}}]}]}",action:"Compose Markdown docs",
  inputKind:"both",outputLabel:"Documentation draft",filename:"api-handbook.md",
  maxBytes:1000000,
  options:[],
  run:(text,options)=>convert(text)
 });
}
export default mount;
