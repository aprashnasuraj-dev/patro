export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
function readCSV(text:string):string[][] {const rows:string[][]=[],row:string[]=[];let field='',quote=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(quote){if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}else if(ch==='"')quote=false;else field+=ch;}
 else if(ch==='"'){if(field)throw Error('Unexpected quote in unquoted cell');quote=true;}else if(ch===','){row.push(field);field='';}
 else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);rows.push(row.splice(0));field='';}
 else field+=ch;}
 if(quote)throw Error('Unclosed CSV quoted field');if(field!==''||row.length){row.push(field);rows.push(row);}
 return rows.filter(r=>r.some(x=>x!==''));}
const q=(s:string)=>'"'+s.replace(/"/g,'""')+'"';
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 if(new TextEncoder().encode(input).length>250000)throw Error('CSV exceeds 250 KB');const rows=readCSV(input.replace(/^\uFEFF/,''));if(rows.length<2||rows.length>10001)throw Error('Supply header and 1–10,000 records');
 const heads=rows[0];if(heads.length<1||heads.length>60||heads.some(h=>!h.trim()||h.length>128))throw Error('Provide 1–60 nonblank headers under 129 characters');if(new Set(heads).size!==heads.length)throw Error('Duplicate CSV header');
 for(const [i,r] of rows.entries())if(r.length!==heads.length)throw Error(`Row ${i+1} has ${r.length} fields; expected ${heads.length}`);
 const table=String(opts.tableName||'imported_records');if(!/^[a-zA-Z_][\w]{0,62}$/.test(table))throw Error('Invalid PostgreSQL table name');
 const profile=heads.map((h,i)=>{const col=rows.slice(1).map(r=>r[i]);const present=col.filter(v=>v.trim()!=='');
  const all=(re:RegExp)=>present.length>0&&present.every(v=>re.test(v));
  let type='TEXT';if(all(/^(true|false)$/i))type='BOOLEAN';else if(all(/^-?\d+$/)&&present.every(v=>{try {return BigInt(v)>=-9223372036854775808n&&BigInt(v)<=9223372036854775807n;}catch{return false}}))type='BIGINT';
  else if(all(/^-?\d+(?:\.\d+)?$/))type='NUMERIC';else if(all(/^\d{4}-\d{2}-\d{2}$/)&&present.every(v=>!Number.isNaN(Date.parse(v+'T00:00:00Z'))))type='DATE';
  else if(all(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/))type='TIMESTAMPTZ';
  return {name:h,type,empty:col.length-present.length};});
 const sql=`-- Review sample-inferred column types and constraints before migration.\nCREATE TABLE ${q(table)} (\n`+profile.map(c=>`  ${q(c.name)} ${c.type}`).join(',\n')+'\n);\n';
 return{text:sql,details:{records:rows.length-1,columns:heads.length},warnings:profile.filter(c=>c.empty).map(c=>`${c.name}: ${c.empty} blank sample cells; inferred nullable.`).concat('No primary key, uniqueness or required-field constraints are inferred from samples.')};
}
