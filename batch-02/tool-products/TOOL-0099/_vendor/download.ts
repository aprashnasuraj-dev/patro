import {safeFilename} from './limits';
export function downloadBlob(data:BlobPart,type:string,name:string){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=safeFilename(name);a.rel='noopener';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export async function copyText(text:string){await navigator.clipboard.writeText(text)}
