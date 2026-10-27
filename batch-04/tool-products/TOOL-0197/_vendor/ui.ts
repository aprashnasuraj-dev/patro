export const $=<T extends HTMLElement=HTMLElement>(id:string)=>{const el=document.getElementById(id);if(!el)throw new Error(`Missing #${id}`);return el as T};
export function setStatus(message:string,kind:'ok'|'error'|'info'='info'){const el=$('status');el.textContent=message;el.dataset.kind=kind;}
export function textFile(file:File){if(file.size>8*1024*1024)throw new Error('Text file exceeds 8 MiB browser limit.');return file.text()}
export function renderPre(text:string){$('output').textContent=text}
export function csvFileInput(id='file'){const input=$(id) as HTMLInputElement;const f=input.files?.[0];if(!f)throw new Error('Choose a file first.');return f}
