/** OpenAPI 3.0/3.1 component schemas -> conservative TS declaration source. */
import { parseDocument } from 'yaml';
export type Result={text:string;warnings:string[];details:{Interfaces:number;Schemas:number}};
type Obj=Record<string,unknown>;
const obj=(v:unknown):v is Obj=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const id=(s:string)=>/^[A-Za-z_$][\w$]*$/.test(s)?s:JSON.stringify(s);
const name=(s:string)=>{const v=s.replace(/[^a-zA-Z0-9_$]/g,'_');return /^[A-Za-z_$]/.test(v)?v:'T_'+v;};
export function convert(input:string):Result {
 if(new TextEncoder().encode(input).length>250_000)throw Error('OpenAPI document over 250 KB');
 const doc=parseDocument(input,{uniqueKeys:true,merge:false,strict:true});
 if(doc.errors.length)throw Error('YAML error: '+doc.errors[0].message);
 const root=doc.toJS({maxAliasCount:0});if(!obj(root))throw Error('Expected an OpenAPI mapping');
 const version=String(root.openapi??'');if(!/^3\.(0|1)\./.test(version))throw Error('Only OpenAPI 3.0 or 3.1 documents supported');
 const schemas=(obj(root.components)&&obj(root.components.schemas)?root.components.schemas:{} ) as Obj;
 if(Object.keys(schemas).length===0)throw Error('No components.schemas definitions found');
 if(Object.keys(schemas).length>150)throw Error('Maximum 150 component schemas');
 const names=new Map<string,string>(),used=new Set<string>();
 for(const key of Object.keys(schemas)){let n=name(key),seq=2;while(used.has(n))n=name(key)+'_'+seq++;names.set(key,n);used.add(n);}
 const warnings:string[]=[];let nodes=0;
 function make(schema:unknown,depth=0):string {
  if(++nodes>16000||depth>24)throw Error('Schema exceeds bounded conversion complexity');
  if(typeof schema==='boolean')return schema?'unknown':'never';
  if(!obj(schema))return 'unknown';
  if(typeof schema.$ref==='string'){
   if(!schema.$ref.startsWith('#/components/schemas/'))throw Error('External and non-component $ref unsupported: '+schema.$ref);
   const k=schema.$ref.slice('#/components/schemas/'.length).replace(/~1/g,'/').replace(/~0/g,'~');
   const nm=names.get(k);if(!nm)throw Error('Unresolved $ref: '+k);return nm;
  }
  if(Array.isArray(schema.enum)){if(schema.enum.length>80)throw Error('Enum too large');return schema.enum.map(x=>typeof x==='string'||typeof x==='number'||typeof x==='boolean'||x===null?JSON.stringify(x):'unknown').join(' | ')||'never';}
  if(Object.prototype.hasOwnProperty.call(schema,'const'))return JSON.stringify(schema.const);
  for(const combinator of ['oneOf','anyOf','allOf'] as const)if(Array.isArray(schema[combinator])){
   const vals=schema[combinator] as unknown[];if(vals.length>40)throw Error('Composition too wide');
   if(combinator==='allOf')warnings.push('allOf becomes a TypeScript intersection; JSON Schema validation constraints are not preserved.');
   return '('+vals.map(s=>make(s,depth+1)).join(combinator==='allOf'?' & ':' | ')+')';
  }
  const raw=schema.type;const types=Array.isArray(raw)?raw.map(String):raw?[String(raw)]:[];
  if(types.length>1){
   const values=[...new Set(types)];
   if(values.some(x=>!['string','number','integer','boolean','array','object','null'].includes(x)))throw Error('Unknown JSON Schema type');
   return values.map(t=>make({...schema,type:t,nullable:false},depth+1)).join(' | ');
  }
  let typ='unknown';
  if(types.includes('object')||obj(schema.properties)||schema.additionalProperties){
   const props=obj(schema.properties)?schema.properties:{};if(Object.keys(props).length>250)throw Error('Object has too many properties');
   const req=new Set(Array.isArray(schema.required)?schema.required:[]);
   const fields=Object.entries(props).map(([key,value])=>`  ${id(key)}${req.has(key)?'':'?'}: ${make(value,depth+1)};`);
   if(schema.additionalProperties===true)fields.push('  [key: string]: unknown;');
   else if(obj(schema.additionalProperties))warnings.push('additionalProperties schema is omitted when explicit properties exist; manual index-signature review required.');
   typ=fields.length?'{\n'+fields.join('\n')+'\n}':obj(schema.additionalProperties)?`Record<string, ${make(schema.additionalProperties,depth+1)}>`:'Record<string, unknown>'; 
  }else if(types.includes('array')) typ=`Array<${make(schema.items??{},depth+1)}>`;
  else if(types.includes('integer')||types.includes('number'))typ='number';
  else if(types.includes('string'))typ='string';else if(types.includes('boolean'))typ='boolean';
  else if(types.includes('null'))typ='null';
  if(types.includes('null')&&types.length>1)typ+=' | null';
  if(schema.nullable===true&&version.startsWith('3.0'))typ+=' | null';
  if(schema.format)warnings.push('OpenAPI format '+String(schema.format)+' is a runtime constraint, not a TypeScript type.');
  return typ;
 }
 const out=['/** Generated from local OpenAPI '+version+'. Review before production use. */'];
 for(const [key,value] of Object.entries(schemas))out.push(`export type ${names.get(key)} = ${make(value)};`);
 return {text:out.join('\n\n')+'\n',warnings:[...new Set(warnings)],details:{Interfaces:out.length-1,Schemas:Object.keys(schemas).length}};
}
