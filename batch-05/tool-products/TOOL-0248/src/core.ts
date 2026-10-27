import {finite,roundTo} from '../_vendor/business';
export type TaxMode='inclusive'|'exclusive';
export function vatOne(amountRaw:number,rateRaw:number,mode:TaxMode,decimals=2){
 const amount=finite(amountRaw,'Amount',0,1e15),rate=finite(rateRaw,'Tax rate',0,1000)/100;if(![0,1,2,3,4].includes(decimals))throw new Error('Decimals must be 0–4.');
 if(mode==='exclusive'){const net=roundTo(amount,decimals),tax=roundTo(net*rate,decimals);return {net,tax,gross:roundTo(net+tax,decimals),ratePct:rate*100,mode}}
 if(mode==='inclusive'){const gross=roundTo(amount,decimals),net=roundTo(gross/(1+rate),decimals);return {net,tax:roundTo(gross-net,decimals),gross,ratePct:rate*100,mode}}
 throw new Error('Mode must be inclusive or exclusive.');
}
export function vatBulk(rows:{amount:number;rate:number;mode:TaxMode}[],decimals=2){if(rows.length>5000)throw new Error('Bulk mode supports at most 5,000 rows.');return rows.map((r,i)=>({row:i+1,...vatOne(r.amount,r.rate,r.mode,decimals)}))}
