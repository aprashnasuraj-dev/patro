/** Offline JSON sample → Zod v4 structural schema. No evaluation of input code. */
export type Node = { kind:'string'|'number'|'boolean'|'null'|'unknown'|'array'|'object'|'union'; item?:Node; fields?:Record<string,{value:Node; count:number}>; variants?:Node[]; count?:number };
export type Options={strict:boolean;typeAlias:boolean;name:string};
const MAX_BYTES=262144, MAX_DEPTH=35, MAX_ITEMS=10000, MAX_KEYS=3000, MAX_VARIANTS=16;
function obj(v:unknown):v is Record<string,unknown>{return v!==null&&typeof v==='object'&&!Array.isArray(v)}
function signature(n:Node):string{if(n.kind==='union')return 'union('+n.variants!.map(signature).sort().join(',')+')';if(n.kind==='array')return 'array('+signature(n.item!)+')';if(n.kind==='object')return 'object';return n.kind}
function merge(a:Node,b:Node):Node{
 if(a.kind==='unknown')return b;if(b.kind==='unknown')return a;
 if(a.kind==='object'&&b.kind==='object'){
  const fields:Record<string,{value:Node;count:number}>=Object.create(null);for(const [key,f] of Object.entries(a.fields||{}))fields[key]={...f};
  for(const [key,f] of Object.entries(b.fields||{})){if(fields[key])fields[key]={value:merge(fields[key].value,f.value),count:fields[key].count+f.count};else fields[key]={...f}}
  return {kind:'object',fields,count:(a.count||1)+(b.count||1)};
 }
 if(a.kind==='array'&&b.kind==='array')return{kind:'array',item:merge(a.item!,b.item!)};
 const flat=(n:Node):Node[]=>n.kind==='union'?n.variants!: [n];const variants=[...flat(a),...flat(b)];
 const unique:Node[]=[];for(const v of variants)if(!unique.some(x=>signature(x)===signature(v)))unique.push(v);
 if(unique.length>MAX_VARIANTS)throw Error('Too many distinct sample types (limit 16)');
 return unique.length===1?unique[0]:{kind:'union',variants:unique.sort((x,y)=>signature(x).localeCompare(signature(y)))};
}
function infer(v:unknown,depth:number,quota:{items:number;keys:number}):Node{
 if(depth>MAX_DEPTH)throw Error('JSON nesting exceeds 35 levels');
 if(++quota.items>MAX_ITEMS)throw Error('JSON exceeds 10,000 elements');
 if(v===null)return{kind:'null'};
 if(typeof v==='string')return{kind:'string'};
 if(typeof v==='boolean')return{kind:'boolean'};
 if(typeof v==='number')return{kind:'number'};
 if(Array.isArray(v)){let item:Node={kind:'unknown'};for(const x of v)item=merge(item,infer(x,depth+1,quota));return{kind:'array',item}}
 if(obj(v)){const fields:Record<string,{value:Node;count:number}>=Object.create(null);for(const [key,value] of Object.entries(v)){if(++quota.keys>MAX_KEYS)throw Error('JSON exceeds 3,000 object properties');fields[key]={value:infer(value,depth+1,quota),count:1}}return{kind:'object',fields,count:1}}
 throw Error('Unsupported JSON input');
}
function parse(text:string):unknown{if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Sample input exceeds 256 KiB');try{return JSON.parse(text)}catch(e){throw Error('Invalid JSON: '+(e instanceof Error?e.message:'parse error'))}}
export function compileSamples(texts:string[],options:Options):{code:string;warnings:string[]}{
 if(!Array.isArray(texts)||texts.length<1||texts.length>20)throw Error('Provide 1–20 JSON samples');
 if(!/^[A-Za-z_$][\w$]*$/.test(options.name)||['class','default','export','import','const','let','var','function','type'].includes(options.name))throw Error('Enter a safe TypeScript schema identifier');
 const quota={items:0,keys:0};let node:Node={kind:'unknown'};
 for(const text of texts){if(typeof text!=='string'||!text.trim())throw Error('Every sample must contain JSON');node=merge(node,infer(parse(text),0,quota))}
 const warnings:string[]=[];
 function emit(n:Node,depth:number):string{
  if(depth>MAX_DEPTH)throw Error('Render depth exceeded');
  switch(n.kind){case 'string':return'z.string()';case'number':return'z.number()';case'boolean':return'z.boolean()';case'null':return'z.null()';case'unknown':warnings.push('Empty arrays have unknown element types');return'z.unknown()';case'array':return`z.array(${emit(n.item!,depth+1)})`;
   case'union':return`z.union([${n.variants!.map(x=>emit(x,depth+1)).join(', ')}])`;
   case'object':{let lines:string[]=[];const fields=n.fields||{};for(const k of Object.keys(fields).sort()){
     const f=fields[k];const optional=(f.count<(n.count||1))?'.optional()':'';
     lines.push(`${'  '.repeat(depth+1)}${JSON.stringify(k)}: ${emit(f.value,depth+1)}${optional},`);
    }const ctor=options.strict?'z.strictObject':'z.object';return`${ctor}({\n${lines.join('\n')}\n${'  '.repeat(depth)}})`;}
  }
 }
 const code=`import { z } from "zod";\n\nexport const ${options.name} = ${emit(node,0)};`+(options.typeAlias?`\n\nexport type ${options.name}Type = z.infer<typeof ${options.name}>;`:'')+'\n';
 return{code,warnings:[...new Set(warnings)]};
}
