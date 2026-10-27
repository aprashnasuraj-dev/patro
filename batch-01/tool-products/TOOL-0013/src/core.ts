export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
const ident=(s:string)=>{if(!/^[A-Za-z_][A-Za-z_0-9]{0,62}$/.test(s))throw Error('Invalid SQL identifier: '+s);return '"'+s+'"'};
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 let decoded:unknown;try{decoded=JSON.parse(input)}catch{throw Error('Invalid JSON input')}
 const rows=Array.isArray(decoded)?decoded:[decoded];if(!rows.length||rows.length>500)throw Error('Provide 1–500 objects');
 const objects=rows.map((r,i)=>{if(!r||Array.isArray(r)||typeof r!=='object')throw Error(`Record ${i+1} must be an object`);return r as Record<string,unknown>});
 const keys=Object.keys(objects[0]);if(!keys.length||keys.length>50)throw Error('Expected 1–50 columns');keys.forEach(ident);
 for(const [i,r] of objects.entries())if(Object.keys(r).length!==keys.length||keys.some(k=>!(k in r)))throw Error(`Record ${i+1} has inconsistent columns`);
 for(const [i,r] of objects.entries())for(const k of keys){const v=r[k];if(v!==null&&typeof v!=='string'&&typeof v!=='number'&&typeof v!=='boolean')throw Error(`Record ${i+1}, column ${k}: nested values are unsupported`);if(typeof v==='number'&&!Number.isFinite(v))throw Error('Nonfinite number');}
 const table=ident(String(opts.tableName||'records'));const conflict=String(opts.conflictKey||'id');if(!keys.includes(conflict))throw Error('Conflict target must be present in every record');
 if(objects.some(r=>r[conflict]===null))throw Error('Conflict key cannot be null');if(new Set(objects.map(r=>JSON.stringify(r[conflict]))).size!==objects.length)throw Error('Duplicate conflict keys in input batch');
 const params=objects.flatMap(row=>keys.map(k=>row[k]));let p=0;const values=objects.map(row=>'('+keys.map(()=>'$'+(++p)).join(', ')+')').join(',\n  ');
 const change=keys.filter(k=>k!==conflict).map(k=>`${ident(k)}=EXCLUDED.${ident(k)}`);
 const sql=`-- Parameterized PostgreSQL 18 SQL; bind values from the accompanying JSON parameters array in order.\nINSERT INTO ${table} (${keys.map(ident).join(', ')})\nVALUES\n  ${values}\nON CONFLICT (${ident(conflict)}) ${change.length?'DO UPDATE SET '+change.join(', '):'DO NOTHING'};`;
 // Do not include parameter values inline as executable SQL: require binding.
 return {text:sql+'\n\n-- PARAMETERS_JSON_BEGIN\n-- '+JSON.stringify(params)+'\n-- PARAMETERS_JSON_END\n',details:{rows:objects.length,columns:keys.length,placeholders:params.length},warnings:['Parameter JSON is confidential if source data is confidential; use a trusted SQL client to bind values.','The conflict column must have an existing unique index or constraint. SQL is a draft, not executed here.']};
}
