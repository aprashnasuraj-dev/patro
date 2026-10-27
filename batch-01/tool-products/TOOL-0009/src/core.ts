/** Literal .env subset -> Kubernetes Opaque Secret (base64 is not encryption). */
export type Result={text:string;warnings:string[];details:{Keys:number;Bytes:number}};
const KEY=/^[A-Za-z_][A-Za-z0-9_]*$/;
const b64=(s:string)=>{const a=new TextEncoder().encode(s),chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',out:string[]=[];
 for(let i=0;i<a.length;i+=3){const n=(a[i]<<16)|((a[i+1]??0)<<8)|(a[i+2]??0);out.push(chars[(n>>>18)&63],chars[(n>>>12)&63],i+1<a.length?chars[(n>>>6)&63]:'=',i+2<a.length?chars[n&63]:'=');}return out.join('');};
export function convert(input:string,opts:{name?:string;namespace?:string}={}):Result{
 if(new TextEncoder().encode(input).length>100_000)throw Error('Input over 100 KB');
 const name=opts.name||'application-secrets',namespace=opts.namespace||'default';
 for(const val of [name,namespace])if(val.length>253||!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(val)||val.split('.').some(v=>v.length>63||!v))throw Error('Name/namespace must be DNS-1123 compliant');
 const entries=new Map<string,string>();const lines=input.replace(/^\uFEFF/,'').split(/\r?\n/);
 for(let i=0;i<lines.length;i++){
  const trimmed=lines[i].trim();if(!trimmed||trimmed.startsWith('#'))continue;
  const match=/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
  if(!match)throw Error('Unsupported .env syntax at line '+(i+1));const [,key,raw]=match;
  if(!KEY.test(key)||entries.has(key))throw Error('Duplicate or invalid key at line '+(i+1));
  let value=raw;
  if(raw.startsWith('"')||raw.startsWith("'")){
   const quote=raw[0];if(!raw.endsWith(quote)||raw.length<2)throw Error('Unterminated quoted value at line '+(i+1));
   value=raw.slice(1,-1);if(quote==='"')value=value.replace(/\\([nrt"\\])/g,(_,c:string)=>({n:'\n',r:'\r',t:'\t','"':'"','\\':'\\'} as Record<string,string>)[c]);
  }else if(/\s+#/.test(raw))value=raw.split(/\s+#/)[0].trimEnd();
  if(value.includes('${'))throw Error('Variable interpolation is not evaluated: '+key);
  if(value.length>20_000)throw Error('Value too long for '+key);entries.set(key,value);
 }
 if(!entries.size)throw Error('No literal KEY=value entries');if(entries.size>100)throw Error('Maximum 100 keys');
 const parts=['apiVersion: v1','kind: Secret','metadata:',`  name: ${name}`,`  namespace: ${namespace}`,'type: Opaque','data:'];
 for(const [key,value] of entries)parts.push(`  ${key}: ${b64(value)}`);
 return{text:parts.join('\n')+'\n',warnings:['Base64 encoding is not encryption. Do not commit this generated Secret YAML to a repository.','The converter handles literal .env assignment syntax; it does not evaluate shells, multiline files, expansion or executable expressions.'],details:{Keys:entries.size,Bytes:new TextEncoder().encode(input).length}};
}
