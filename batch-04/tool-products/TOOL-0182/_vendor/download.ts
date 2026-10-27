export function downloadBlob(blob:Blob,name:string){const a=document.createElement('a');const u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
export function downloadText(text:string,name:string,type='text/plain;charset=utf-8'){downloadBlob(new Blob([text],{type}),name)}
export async function copyText(text:string){await navigator.clipboard.writeText(text)}
