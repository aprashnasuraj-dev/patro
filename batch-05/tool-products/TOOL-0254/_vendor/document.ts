import {finite, isoDate, roundTo} from './business.js';
export type Line={description:string;quantity:number;unitPrice:number;taxRate:number};
export function calculateLines(lines:Line[], decimals=2){
  if(!Array.isArray(lines)||lines.length<1||lines.length>200) throw new Error('Use 1–200 line items.');
  const out=lines.map((x,i)=>{
    const description=String(x.description??'').trim().slice(0,240);
    const quantity=finite(x.quantity,`Line ${i+1} quantity`,0,1_000_000);
    const unitPrice=finite(x.unitPrice,`Line ${i+1} unit price`,-1_000_000_000,1_000_000_000);
    const taxRate=finite(x.taxRate,`Line ${i+1} tax rate`,0,1000);
    const net=roundTo(quantity*unitPrice,decimals);
    const tax=roundTo(net*taxRate/100,decimals);
    return {description,quantity,unitPrice,taxRate,net,tax,gross:roundTo(net+tax,decimals)};
  });
  return {lines:out,net:roundTo(out.reduce((s,x)=>s+x.net,0),decimals),tax:roundTo(out.reduce((s,x)=>s+x.tax,0),decimals),gross:roundTo(out.reduce((s,x)=>s+x.gross,0),decimals)};
}
export function currencyCode(v:string){const s=v.trim().toUpperCase();if(!/^[A-Z]{3}$/.test(s))throw new Error('Currency must be a 3-letter code.');return s}
export function escapeHtml(v:string){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}
export function validateDates(issue:string, other:string, otherName:string){const a=isoDate(issue,'Issue date'),b=isoDate(other,otherName);if(b<a)throw new Error(`${otherName} cannot be before issue date.`);}
