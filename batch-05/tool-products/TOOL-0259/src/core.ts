import {safeHttpUrl} from '../_vendor/business';
export type VCardInput={name:string;org:string;title:string;phone:string;email:string;website:string;address:string;note:string};
const esc=(v:string)=>String(v||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const bytes=(s:string)=>new TextEncoder().encode(s).length;
function fold(line:string){if(bytes(line)<=75)return line;let out='',part='';for(const ch of line){const test=part+ch;if(bytes(test)>75){out+=(out?'\\r\\n ':'')+part;part=ch}else part=test}return out+(out?'\\r\\n ':'')+part}
export function vcard(x:VCardInput){
 const name=String(x.name||'').trim().slice(0,160);if(!name)throw new Error('Full name is required.');
 const email=String(x.email||'').trim().slice(0,254);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Email is invalid.');
 const phone=String(x.phone||'').trim().slice(0,100);if(phone&&!/^[0-9+().\-\s]{3,100}$/.test(phone))throw new Error('Phone contains unsupported characters.');
 const website=x.website?safeHttpUrl(x.website):'';const lines=['BEGIN:VCARD','VERSION:4.0',`FN:${esc(name)}`];
 if(x.org)lines.push(`ORG:${esc(String(x.org).slice(0,160))}`);if(x.title)lines.push(`TITLE:${esc(String(x.title).slice(0,160))}`);if(phone)lines.push(`TEL;VALUE=uri:tel:${phone.replace(/\s/g,'')}`);if(email)lines.push(`EMAIL:${esc(email)}`);if(website)lines.push(`URL:${website}`);if(x.address)lines.push(`ADR:;;${esc(String(x.address).slice(0,300))};;;;`);if(x.note)lines.push(`NOTE:${esc(String(x.note).slice(0,1000))}`);lines.push('END:VCARD');
 const payload=lines.map(fold).join('\r\n')+'\r\n';const size=bytes(payload);if(size>2500)throw new Error(`vCard payload is ${size} bytes; the tool limit is 2,500 bytes for more reliable QR scanning.`);
 return {payload,bytes:size};
}
