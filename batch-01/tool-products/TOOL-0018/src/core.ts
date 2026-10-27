import {parseDocument} from 'yaml';
export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
const quote=(s:string)=>"'"+s.replace(/'/g,"'\\''")+"'";
function key(k:string){if(!k||k.length>120||/[\[\]\\,=]/.test(k))throw Error('Unsupported Helm key: '+k);return k.replace(/\./g,'\\.');}
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 if(input.length>160000)throw Error('Values file exceeds 160 KB');const doc=parseDocument(input,{uniqueKeys:true,maxAliasCount:0,merge:false});
 if(doc.errors.length)throw Error('YAML error: '+doc.errors[0].message);if(/(^|\n)\s*[^#\n]*[&*][A-Za-z_][\w-]*/.test(input))throw Error('YAML anchor/alias unsupported');
 const root=doc.toJS({maxAliasCount:0});if(!root||Array.isArray(root)||typeof root!=='object')throw Error('Root Helm values must be a mapping');
 const args:string[]=[];let leafCount=0;
 const walk=(v:unknown,path:string,depth:number)=>{if(depth>20)throw Error('Values too deeply nested');if(leafCount>500)throw Error('More than 500 leaves');
 if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length){for(const [k,item] of Object.entries(v as Record<string,unknown>)){if(['__proto__','prototype','constructor'].includes(k))throw Error('Reserved YAML key');walk(item,path?path+'.'+key(k):key(k),depth+1)}return;}
 if(!path)throw Error('Empty values root');if(typeof v==='number'&&!Number.isFinite(v))throw Error('Nonfinite YAML number');
 const serialized=JSON.stringify(v);if(serialized===undefined)throw Error('Unsupported YAML value');if(serialized.length>20000)throw Error('Override value exceeds 20,000 characters');leafCount++;args.push('--set-json '+quote(path+'='+serialized));};
 walk(root,'',0);const release=String(opts.releaseName||'my-release');if(!/^[a-z0-9][a-z0-9-]{0,52}$/.test(release))throw Error('Invalid Helm release name');
 return{text:'# Review Helm overrides carefully; no deployment is performed.\nhelm upgrade '+quote(release)+' ./chart'+(args.length?' \\'+String.fromCharCode(10)+'  '+args.join(' \\'+String.fromCharCode(10)+'  '):'')+'\n',details:{flags:args.length,release},warnings:['--set-json requires a compatible Helm CLI version.','Avoid command-line secrets: shell arguments may be exposed in process lists.','This only generates argument fragments; no chart or Kubernetes requests are made.']};
}
