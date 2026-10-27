import {limit} from './guards.js';
const forbidden=new Set(['__proto__','prototype','constructor']);
function parsePath(key){
 const m=/^([^\[\]]+)((?:\[[^\[\]]*\])*)$/.exec(key);if(!m)throw Error('Malformed bracket path: '+key);
 const parts=[m[1],...Array.from(m[2].matchAll(/\[([^\]]*)\]/g),v=>v[1])];
 if(parts.length>7||parts.some(p=>!p||p.length>90||forbidden.has(p)))throw Error('Unsafe, empty or deep key: '+key);
 if(parts.some(p=>/^\d+$/.test(p)&&(!/^(0|[1-9]\d*)$/.test(p)||Number(p)>99)))throw Error('Array index outside 0–99.');
 return parts;
}
export function compute(x){
 const raw=limit(x.query,20000).replace(/^\?/,'');if(!raw)throw Error('Query string is empty.');if(/%(?![\da-fA-F]{2})/.test(raw))throw Error('Malformed percent escape.');
 const params=new URLSearchParams(raw),entries=[...params];if(entries.length>300)throw Error('Maximum 300 parameters.');
 const root=Object.create(null),dups=[];
 for(const [k,v] of entries){if(v.length>3000)throw Error('Oversized value.');const path=parsePath(k);let cur=root;
  for(let i=0;i<path.length;i++){const p=path[i],last=i===path.length-1, index=/^\d+$/.test(p);if(Array.isArray(cur)!==index&&i>0)throw Error('Conflicting object/array shape at '+k);
   const key=index?Number(p):p;
   if(last){if(Object.hasOwn(cur,key)){if(typeof cur[key]==='object')throw Error('Duplicate key conflicts with nested object.');if(x.duplicate==='Error')throw Error('Duplicate key: '+k);if(!dups.includes(k))dups.push(k);cur[key]=Array.isArray(cur[key])?cur[key].concat(v):[cur[key],v];}else cur[key]=v;}
   else {const nextArray=/^\d+$/.test(path[i+1]);if(!Object.hasOwn(cur,key))cur[key]=nextArray?[]:Object.create(null);else if(typeof cur[key]!=='object'||cur[key]===null||Array.isArray(cur[key])!==nextArray)throw Error('Shape collision: '+k);cur=cur[key];}
  }
 }
 const validate=(v)=>{if(Array.isArray(v)){for(let i=0;i<v.length;i++){if(!Object.hasOwn(v,i))throw Error('Sparse array indexes are unsupported.');validate(v[i]);}}else if(v&&typeof v==='object')Object.values(v).forEach(validate);};validate(root);
 return {text:JSON.stringify(root,null,2),summary:`${entries.length} parameter(s) converted`,warnings:dups.length?['Repeated keys represented as arrays: '+dups.join(', ')]:[]};
}
