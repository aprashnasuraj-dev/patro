export type CsvIssue={code:string,message:string,row?:number,column?:number};
export type CsvTable={rows:string[][],delimiter:string,issues:CsvIssue[],maxColumns:number};
export const CSV_LIMITS={maxBytes:8*1024*1024,maxRows:100000,maxColumns:1000,maxParts:250,maxOutputRows:200000};
export function byteLength(s:string){return new TextEncoder().encode(s).byteLength}
export function assertTextBounded(text:string){if(byteLength(text)>CSV_LIMITS.maxBytes)throw new Error(`Input exceeds ${CSV_LIMITS.maxBytes/1048576} MiB browser limit.`)}
export function parseCsv(text:string,delimiter=',',strict=true):CsvTable{
  assertTextBounded(text); if(!delimiter||delimiter.length!==1)throw new Error('Delimiter must be one character.');
  const rows:string[][]=[]; const issues:CsvIssue[]=[]; let row:string[]=[]; let field=''; let quoted=false; let justClosed=false; let i=0;
  const pushField=()=>{row.push(field);field='';justClosed=false;if(row.length>CSV_LIMITS.maxColumns)throw new Error(`More than ${CSV_LIMITS.maxColumns} columns.`)};
  const pushRow=()=>{pushField();rows.push(row);row=[];if(rows.length>CSV_LIMITS.maxRows)throw new Error(`More than ${CSV_LIMITS.maxRows} rows.`)};
  while(i<text.length){const ch=text[i];
    if(quoted){if(ch==='"'){if(text[i+1]==='"'){field+='"';i+=2;continue;}quoted=false;justClosed=true;i++;continue;}field+=ch;i++;continue;}
    if(justClosed && ch!==delimiter && ch!=='\r' && ch!=='\n'){issues.push({code:'TRAILING_AFTER_QUOTE',message:'Unexpected character after a closing quote.',row:rows.length+1,column:row.length+1});if(strict)throw new Error(`Unexpected character after closing quote at row ${rows.length+1}.`);justClosed=false;field+=ch;i++;continue;}
    if(ch==='"'){if(field.length===0){quoted=true;i++;continue;}issues.push({code:'STRAY_QUOTE',message:'Quote inside an unquoted field.',row:rows.length+1,column:row.length+1});if(strict)throw new Error(`Stray quote at row ${rows.length+1}.`);field+=ch;i++;continue;}
    if(ch===delimiter){pushField();i++;continue;}
    if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;pushRow();i++;continue;}
    field+=ch;i++;
  }
  if(quoted){issues.push({code:'UNCLOSED_QUOTE',message:'Quoted field was not closed.',row:rows.length+1,column:row.length+1});if(strict)throw new Error('Unclosed quoted field.');}
  if(field.length||row.length||text.length===0)pushRow();
  const maxColumns=rows.reduce((m,r)=>Math.max(m,r.length),0); return {rows,delimiter,issues,maxColumns};
}
export function stringifyCsv(rows:(string|number|null|undefined)[][],delimiter=',',lineBreak='\r\n'){
  return rows.map(r=>r.map(v=>{const s=v==null?'':String(v);return /["\r\n]/.test(s)||s.includes(delimiter)?`"${s.replace(/"/g,'""')}"`:s}).join(delimiter)).join(lineBreak);
}
export function detectDelimiter(text:string){
  const candidates=[',','\t',';','|']; const sample=text.slice(0,200000); let best={d:',',score:-Infinity};
  for(const d of candidates){try{const t=parseCsv(sample,d,false);const lens=t.rows.slice(0,50).filter(r=>r.some(x=>x!=='' )).map(r=>r.length);if(lens.length<2)continue;const counts=new Map<number,number>();for(const n of lens)counts.set(n,(counts.get(n)||0)+1);const mode=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0];const consistency=mode[1]/lens.length;const score=(mode[0]>1?10:0)+consistency*5+Math.min(mode[0],20)/20;if(score>best.score)best={d,score};}catch{}}
  return best.d;
}
export function uniqueHeaders(headers:string[]){const seen=new Map<string,number>();return headers.map((h,i)=>{const base=(h.trim()||`Column ${i+1}`);const n=(seen.get(base)||0)+1;seen.set(base,n);return n===1?base:`${base}_${n}`})}
export function duplicateHeaders(headers:string[]){const seen=new Set<string>(),dups=new Set<string>();for(const h of headers){if(seen.has(h))dups.add(h);seen.add(h)}return [...dups]}
export function isFormulaLike(value:string){return /^[\t\r\n=+\-@＝＋－＠]/u.test(value)}
export function neutralizeFormula(value:string,mode:'preserve'|'apostrophe'='preserve'){return mode==='apostrophe'&&isFormulaLike(value)?`'${value}`:value}
export function indexHeaders(headers:string[]){const m=new Map<string,number>();headers.forEach((h,i)=>{if(m.has(h))throw new Error(`Duplicate header: ${h}`);m.set(h,i)});return m}
export function sanitizePartName(value:string,fallback='part'){const s=value.normalize('NFKC').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim().slice(0,80);return s||fallback}
