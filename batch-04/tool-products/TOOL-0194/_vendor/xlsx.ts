const XLSX_URL='/assets/vendor/sheetjs/xlsx-0.20.3/xlsx.mjs';
let modPromise:Promise<any>|null=null;
export async function getXlsx(){if(!modPromise)modPromise=import(/* @vite-ignore */XLSX_URL);const x=await modPromise;if(!x?.read||!x?.write||!x?.utils)throw new Error('Local spreadsheet runtime is unavailable.');return x}
export async function readWorkbook(file:File){if(file.size>25*1024*1024)throw new Error('Workbook exceeds 25 MiB browser limit.');const XLSX=await getXlsx();const data=await file.arrayBuffer();return XLSX.read(data,{type:'array',cellDates:true,cellFormula:true,cellNF:true,cellText:true,dense:false});}
export async function workbookBlob(wb:any){const XLSX=await getXlsx();const out=XLSX.write(wb,{bookType:'xlsx',type:'array',compression:true});return new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
export async function sheetRows(ws:any,opts:any={}){const XLSX=await getXlsx();return XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,...opts}) as any[][]}
