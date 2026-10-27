import {parseCsv,stringifyCsv,detectDelimiter,indexHeaders} from '../_vendor/csv';
type Dup='block'|'first'|'last'; type Join='left'|'inner'|'right'|'full';
export function joinCsv(left:string,right:string,leftKey:string,rightKey:string,type:Join,dups:Dup='block'){
  const L=parse(left),R=parse(right),li=must(indexHeaders(L.h),leftKey),ri=must(indexHeaders(R.h),rightKey);
  const lm=mapRows(L.rows,li,dups,'left'),rm=mapRows(R.rows,ri,dups,'right');
  const rightCols=R.h.map((h,i)=>({h,i})).filter(x=>x.i!==ri);
  const outH=[...L.h,...rightCols.map(x=>L.h.includes(x.h)?`right.${x.h}`:x.h)];
  let keys:string[];
  if(type==='left')keys=[...lm.keys()]; else if(type==='right')keys=[...rm.keys()]; else if(type==='inner')keys=[...lm.keys()].filter(k=>rm.has(k)); else keys=[...new Set([...lm.keys(),...rm.keys()])];
  const rows=[outH];
  for(const k of keys){const l=lm.get(k),r=rm.get(k);const leftPart=l?[...l]:L.h.map(()=> '');if(!l&&r)leftPart[li]=k;const rightPart=r?rightCols.map(x=>r[x.i]??''):rightCols.map(()=> '');rows.push([...leftPart,...rightPart]);if(rows.length>200001)throw new Error('Join output exceeds 200,000 rows.');}
  return {csv:stringifyCsv(rows),rows:rows.length-1,matched:[...lm.keys()].filter(k=>rm.has(k)).length};
}
function parse(s:string){const d=detectDelimiter(s),t=parseCsv(s,d,true);return {h:t.rows[0]||[],rows:t.rows.slice(1)}}
function must(m:Map<string,number>,k:string){const i=m.get(k);if(i==null)throw new Error(`Key not found: ${k}`);return i}
function mapRows(rows:string[][],i:number,dups:Dup,label:string){const m=new Map<string,string[]>();for(const r of rows){const k=r[i]??'';if(m.has(k)&&dups==='block')throw new Error(`Duplicate ${label} key: ${k||'(blank)'}`);if(dups==='last'||!m.has(k))m.set(k,r)}return m}
