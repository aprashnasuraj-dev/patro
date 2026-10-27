import {calculateLines,currencyCode,validateDates} from '../_vendor/document';
export type InvoiceInput={number:string;currency:string;issueDate:string;dueDate:string;seller:string;customer:string;notes:string;lines:{description:string;quantity:number;unitPrice:number;taxRate:number}[]};
export function invoice(x:InvoiceInput){
 const number=String(x.number||'').trim().slice(0,60);if(!number)throw new Error('Invoice number is required.');
 validateDates(x.issueDate,x.dueDate,'Due date');const currency=currencyCode(x.currency);
 const calc=calculateLines(x.lines); return {...x,number,currency,seller:String(x.seller||'').slice(0,2000),customer:String(x.customer||'').slice(0,2000),notes:String(x.notes||'').slice(0,4000),...calc};
}
