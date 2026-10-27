import {readWorkbook,getXlsx,sheetRows,workbookBlob} from '../_vendor/xlsx';
import {uniqueHeaders} from '../_vendor/csv';
export async function combineSheets(file:File,mode:'values'|'formulas'='values',addSource=true){
  const XLSX=await getXlsx(),wb=await readWorkbook(file);let headers:string[]=[];
  const per=[] as {name:string,h:string[],rows:any[][]}[];
  for(const name of wb.SheetNames){
    const ws=wb.Sheets[name]; let rows=await sheetRows(ws,{raw:true}); if(!rows.length)continue;
    if(mode==='formulas'){
      rows=rows.map((r,ri)=>r.map((v,ci)=>{const c=ws[XLSX.utils.encode_cell({r:ri,c:ci})];return c&&typeof c.f==='string'?`=${c.f}`:v}));
    }
    const h=uniqueHeaders(rows[0].map(v=>v==null?'':String(v))); for(const x of h)if(!headers.includes(x))headers.push(x);
    per.push({name,h,rows:rows.slice(1)});
  }
  if(!per.length)throw new Error('No non-empty worksheets were found.');
  const output:any[][]=[];output.push(addSource?['_source_sheet',...headers]:headers);
  for(const p of per){const ix=new Map(p.h.map((x,i)=>[x,i]));for(const r of p.rows){const aligned=headers.map(h=>r[ix.get(h)!]??null);output.push(addSource?[p.name,...aligned]:aligned);if(output.length>200001)throw new Error('Combined output exceeds 200,000 rows.');}}
  const nws=XLSX.utils.aoa_to_sheet(output);const out=XLSX.utils.book_new();XLSX.utils.book_append_sheet(out,nws,'Combined');
  return {blob:await workbookBlob(out),rows:output.length-1,columns:output[0].length,mode};
}
