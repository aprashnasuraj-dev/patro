import { downloadBlob } from './files';
export const $=<T extends HTMLElement>(id:string)=>{const el=document.getElementById(id);if(!el)throw new Error(`Missing #${id}`);return el as T};
export function file(id:string):File{const f=($<HTMLInputElement>(id).files||[])[0];if(!f)throw new Error('Choose a file first.');return f}
export function files(id:string):File[]{const fs=[...($<HTMLInputElement>(id).files||[])];if(!fs.length)throw new Error('Choose at least one file.');return fs}
export function num(id:string):number{return Number($<HTMLInputElement>(id).value)}
export function val(id:string):string{return ($<HTMLInputElement|HTMLSelectElement>(id)).value}
export function checked(id:string):boolean{return $<HTMLInputElement>(id).checked}
export function status(msg:string){$('status').textContent=msg}
export function resultHtml(html:string){$('result').innerHTML=html}
export function resultText(text:string){$('result').textContent=text}
export function dl(blob:Blob,name:string){downloadBlob(blob,name)}
export async function guarded(fn:()=>Promise<void>){try{status('Working locally…');$('primary').setAttribute('disabled','');await fn();status('Ready. Review the result before downloading.')}catch(e){status(e instanceof Error?e.message:String(e))}finally{$('primary').removeAttribute('disabled')}}
