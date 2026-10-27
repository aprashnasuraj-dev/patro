import { compileSamples } from './core';
export function mount(host:HTMLElement):void{
 const $=<T extends HTMLElement>(id:string)=>host.querySelector<T>('#'+id)!;
 const samples=$<HTMLTextAreaElement>('samples'),out=$<HTMLElement>('output'),error=$<HTMLElement>('error'),note=$<HTMLElement>('note');
 const status=(msg:string)=>{error.textContent=msg;};
 function convert(){status('');try{
 const blocks=samples.value.split(/^\s*---sample---\s*$/m);const result=compileSamples(blocks,{name:$<HTMLInputElement>('schemaName').value.trim(),strict:$<HTMLInputElement>('strict').checked,typeAlias:$<HTMLInputElement>('typeAlias').checked});
 out.textContent=result.code;note.textContent=result.warnings.join('; ')||'Generated from structural samples. Review constraints before using as a validator.';
 }catch(e){out.textContent='';note.textContent='';status(e instanceof Error?e.message:'Unable to convert input')}}
 $<HTMLButtonElement>('generate').addEventListener('click',convert);
 $<HTMLButtonElement>('addExample').addEventListener('click',()=>{samples.value='{"id":1,"name":"Asha","tags":["news"]}\n---sample---\n{"id":2,"name":"Ravi","active":true,"tags":["science","tech"]}';convert()});
 $<HTMLButtonElement>('copy').addEventListener('click',async()=>{if(!out.textContent)return;try{await navigator.clipboard.writeText(out.textContent);status('Copied TypeScript source.')}catch{status('Clipboard unavailable; select the source to copy.')}});
 $<HTMLButtonElement>('download').addEventListener('click',()=>{if(!out.textContent)return;const blob=new Blob([out.textContent],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='schema.ts';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 convert();
}
