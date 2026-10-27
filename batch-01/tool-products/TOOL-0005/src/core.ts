/** Sample JSON -> proto3 draft. Field numbers are NOT stable across input changes. */
export type Result={text:string;warnings:string[];details:{Messages:number;Fields:number}};
type RecordValue=Record<string,unknown>;const object=(v:unknown):v is RecordValue=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const safe=(s:string)=>{let k=s.replace(/([a-z])([A-Z])/g,'$1_$2').replace(/[^a-zA-Z0-9_]/g,'_').toLowerCase();if(!/^[a-z_]/.test(k))k='field_'+k;return /^(?:package|message|enum|import|repeated|optional|oneof|reserved|syntax|string|bool|int32|int64|double|bytes|map)$/.test(k)?'field_'+k:k;};
const className=(s:string)=>{const v=s.split(/[^a-zA-Z0-9]+/g).filter(Boolean).map(x=>x[0].toUpperCase()+x.slice(1)).join('');return /^[A-Za-z]/.test(v)?v:'Entry'+v;};
export function convert(input:string, options:{rootName?:string;packageName?:string}={}):Result{
 if(input.length>170_000)throw Error('JSON over 170 KB');let data:unknown;
 try{data=JSON.parse(input);}catch{throw Error('Enter valid JSON');}
 if(!object(data))throw Error('Top-level JSON must be an object');
 const root=className(options.rootName||'Root'),pkg=options.packageName||'local.generated';
 if(!/^[A-Za-z_]\w*(\.[A-Za-z_]\w*){0,5}$/.test(pkg))throw Error('Invalid protobuf package identifier');
 let fields=0;const warnings:string[]=[];const messages:string[]=[];const used=new Set<string>();
 function infer(value:unknown,field:string,depth:number):string{
  if(depth>12||fields>500)throw Error('Nested schema exceeds 12 levels or 500 fields');
  if(value===null){warnings.push('Null has no native proto3 scalar type; string used as placeholder.');return 'string';}
  if(typeof value==='string')return 'string';if(typeof value==='boolean')return 'bool';
  if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Nonfinite number');return Number.isInteger(value)&&Math.abs(value)<=2147483647?'int32':Number.isSafeInteger(value)?'int64':'double';}
  if(Array.isArray(value)){
   if(!value.length){warnings.push('Empty arrays have unknown element type; repeated string placeholder used.');return 'repeated string';}
   const kinds=new Set(value.map(x=>Array.isArray(x)?'array':object(x)?'object':typeof x));
   if(kinds.size>1)warnings.push('Mixed array elements; review inferred type for '+field);
   const first=value.find(v=>v!==null)??value[0];const typ=infer(first,field,depth+1);
   if(typ.startsWith('repeated '))throw Error('Nested arrays are not directly expressible in proto3: '+field);
   return 'repeated '+typ;
  }
  if(object(value)){
   const child=className(field);const unique=child+String(messages.length+1); // Avoid collisions for nested field types
   emit(value,unique,depth+1);return unique;
  }
  throw Error('Unsupported JSON value');
 }
 function emit(obj:RecordValue,name:string,depth:number):void{
  if(used.has(name))throw Error('Duplicate message name '+name);used.add(name);
  const lines:string[]=[];const names=new Set<string>();let fieldNo=1;
  for(const [key,value] of Object.entries(obj)){
   if(Object.keys(obj).length>150)throw Error('Message too wide');
   const n=safe(key);if(names.has(n))throw Error('Normalized field name collision in '+name+': '+n);names.add(n);
   if(fieldNo>=19000&&fieldNo<=19999)fieldNo=20000;
   const typ=infer(value,name+'_'+key,depth);
   lines.push(`  ${typ} ${n} = ${fieldNo++};`);fields++;
  }
  messages.push(`message ${name} {\n${lines.join('\n')}\n}`);
 }
 emit(data,root,0);
 warnings.push('Sample-based inference: tags are assigned by field order. Freeze field numbers and reserve deleted tags before adopting a schema.');
 warnings.push('JSON null, missing fields and decimal precision cannot be fully inferred from a sample.');
 return {text:`syntax = "proto3";\n\npackage ${pkg};\n\n${messages.reverse().join('\n\n')}\n`,warnings,details:{Messages:messages.length,Fields:fields}};
}
