export type BarcodeFormat='EAN13'|'UPCA'|'CODE128';
export function gtinCheckDigit(data:string){if(!/^\d+$/.test(data))throw new Error('GTIN data must contain digits only.');let sum=0,weight=3;for(let i=data.length-1;i>=0;i--){sum+=Number(data[i])*weight;weight=weight===3?1:3}return String((10-(sum%10))%10)}
export function normalizeBarcode(format:BarcodeFormat,raw:string){
 const value=String(raw||'').trim();if(format==='EAN13'){if(!/^\d{12,13}$/.test(value))throw new Error('EAN-13 requires 12 data digits or a complete 13-digit value.');const data=value.slice(0,12),check=gtinCheckDigit(data);if(value.length===13&&value[12]!==check)throw new Error(`EAN-13 check digit should be ${check}.`);return {format,value:data+check,checkDigit:check}}
 if(format==='UPCA'){if(!/^\d{11,12}$/.test(value))throw new Error('UPC-A requires 11 data digits or a complete 12-digit value.');const data=value.slice(0,11),check=gtinCheckDigit(data);if(value.length===12&&value[11]!==check)throw new Error(`UPC-A check digit should be ${check}.`);return {format,value:data+check,checkDigit:check}}
 if(format==='CODE128'){if(value.length<1||value.length>80||/[^\x20-\x7E]/.test(value))throw new Error('Code 128 input is limited to 1–80 printable ASCII characters.');return {format,value,checkDigit:null}}
 throw new Error('Unsupported barcode format.');
}
export function normalizeBatch(rows:{format:BarcodeFormat;value:string;label:string}[]){if(rows.length<1||rows.length>500)throw new Error('Use 1–500 barcode rows.');return rows.map((r,i)=>({row:i+1,label:String(r.label||'').slice(0,100),...normalizeBarcode(r.format,r.value)}))}
