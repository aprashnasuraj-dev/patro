import {readWorkbook,getXlsx,workbookBlob} from '../_vendor/xlsx';
export async function splitWorkbook(file:File,preserveFormulas=true){
  const XLSX=await getXlsx(),wb=await readWorkbook(file);
  if(wb.SheetNames.length>100)throw new Error('More than 100 worksheets is blocked.');
  const outputs=[] as {name:string,blob:Blob,warnings:string[]}[];
  for(const name of wb.SheetNames){
    const original=wb.Sheets[name], ws=structuredClone(original), warnings:string[]=[];
    let crossSheet=false, stripped=0;
    for(const addr of Object.keys(ws)){
      if(addr[0]==='!')continue;
      const c=ws[addr];
      if(c&&typeof c==='object'&&typeof c.f==='string'){
        if(c.f.includes('!'))crossSheet=true;
        if(!preserveFormulas){delete c.f; stripped++; if(c.v==null){c.t='s';c.v='';}}
      }
    }
    if(crossSheet&&preserveFormulas)warnings.push('Cross-sheet formulas are preserved as text but may break because referenced sheets are absent.');
    if(stripped)warnings.push(`${stripped} formulas were replaced by their cached values; cached values may be stale.`);
    const nw=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(nw,ws,name.slice(0,31));
    outputs.push({name:`${safe(name)}.xlsx`,blob:await workbookBlob(nw),warnings});
  }
  return outputs;
}
function safe(s:string){return s.replace(/[\\/:*?"<>|]/g,'_').slice(0,80)||'Sheet'}
