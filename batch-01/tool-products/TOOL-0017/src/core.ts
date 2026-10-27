export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
type Token={type:string;value:string;pos:number};
function lex(s:string):Token[]{const out:Token[]=[];let i=0;while(i<s.length){const ch=s[i];if(/\s/.test(ch)){i++;continue}if(ch==='#'||(ch==='/'&&s[i+1]==='/')){while(i<s.length&&s[i]!=='\n')i++;continue}
 if('{}[]=:,'.includes(ch)){out.push({type:ch,value:ch,pos:i++});continue}
 if(ch==='"'){const start=i++;let raw='"';let closed=false;while(i<s.length){const c=s[i++];raw+=c;if(c==='\\'){if(i<s.length)raw+=s[i++];continue}if(c==='"'){closed=true;break}}if(!closed)throw Error('Unclosed string');let value:string;try{value=JSON.parse(raw)}catch{throw Error('Unsupported quoted escape')};if(/\$\{/.test(value))throw Error('Variable interpolation not supported');out.push({type:'string',value,pos:start});continue}
 const num=/^-?(?:\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(s.slice(i));if(num){out.push({type:'number',value:num[0],pos:i});i+=num[0].length;continue}
 const id=/^[A-Za-z_][A-Za-z_0-9-]*/.exec(s.slice(i));if(id){out.push({type:'id',value:id[0],pos:i});i+=id[0].length;continue}throw Error(`Unsupported tfvars token at position ${i+1}`)}return out;}
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 if(input.length>150000)throw Error('Maximum input is 150,000 characters');const tokens=lex(input),vars:Record<string,unknown>=Object.create(null);let p=0;
 const peek=()=>tokens[p];const take=(type:string)=>{const v=tokens[p++];if(!v||v.type!==type)throw Error(`Expected ${type} near token ${p}`);return v};
 const key=()=>{const v=peek();if(!v||!['id','string'].includes(v.type))throw Error('Expected literal map key');p++;if(['__proto__','constructor','prototype'].includes(v.value))throw Error('Reserved key');return v.value};
 const value=(depth:number):unknown=>{if(depth>25)throw Error('Nesting limit 25');const t=peek();if(!t)throw Error('Missing value');
  if(t.type==='string'){p++;return t.value}if(t.type==='number'){p++;const n=Number(t.value);if(!Number.isFinite(n)||!Number.isSafeInteger(n)&&!t.value.includes('.'))throw Error('Unsafe number, enter as string');return n}
  if(t.type==='id'&&['true','false','null'].includes(t.value)){p++;return t.value==='null'?null:t.value==='true'}
  if(t.type==='['){p++;const a:unknown[]=[];while(peek()&&peek().type!==']'){if(a.length>10000)throw Error('Array too large');a.push(value(depth+1));if(peek()?.type===','){p++;if(peek()?.type===']')break;}else if(peek()?.type!==']')throw Error('Expected comma in list');}take(']');return a}
  if(t.type==='{'){p++;const obj:Record<string,unknown>=Object.create(null);while(peek()&&peek().type!=='}'){const k=key();take('=');if(Object.hasOwn(obj,k))throw Error('Duplicate object key: '+k);obj[k]=value(depth+1);if(peek()?.type===',')p++;}take('}');return obj}
  throw Error('Expressions/functions are not supported; use literal values only');};
 while(p<tokens.length){const k=key();if(Object.hasOwn(vars,k))throw Error('Duplicate variable: '+k);take('=');vars[k]=value(0);}if(!Object.keys(vars).length)throw Error('No literal tfvars assignments found');
 return{text:JSON.stringify(vars,null,opts.pretty===false?0:2)+'\n',details:{variables:Object.keys(vars).length},warnings:['Only HCL literal tfvars values are supported; no functions, interpolation, references or expressions.','Do not commit secrets embedded in tfvars or exported JSON.']};
}
