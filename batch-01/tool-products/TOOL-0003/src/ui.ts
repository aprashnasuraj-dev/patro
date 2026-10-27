import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Dedicated API schema engineering interaction. Imported only on this route. */
export function mount(root:HTMLElement):()=>void {
 root.dataset.toolId="TOOL-0003";
 return mountWorkbench({
  root,title:"Move from OpenAPI contracts to safe TypeScript types", inputLabel:"OpenAPI YAML document",
  inputHint:"Supported: 3.0 and 3.1 components.schemas; local $ref only; maximum 250 KB.",sample:"openapi: 3.1.0\ninfo:\n  title: Store API\n  version: 1.0.0\npaths: {}\ncomponents:\n  schemas:\n    Product:\n      type: object\n      required: [id, price]\n      properties:\n        id: {type: string}\n        price: {type: number}\n        tags: {type: array, items: {type: string}}\n        archived: {type: [boolean, 'null']}\n",action:"Generate TypeScript types",
  inputKind:"both",outputLabel:"Type declaration file",filename:"openapi-types.ts",
  maxBytes:250000,
  options:[],
  run:(text,options)=>convert(text)
 });
}
export default mount;
