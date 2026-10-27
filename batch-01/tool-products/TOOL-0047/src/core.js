import {limit} from './guards.js';
export function compute(x){const s=limit(x.value,16000),mode=x.context;let result;
 if(mode==='Path segment'||mode==='Query key'||mode==='Query value')result=encodeURIComponent(s);
 else if(mode==='Whole path')result=s.split('/').map(encodeURIComponent).join('/');
 else if(mode==='Form value'){const p=new URLSearchParams();p.set('v',s);result=p.toString().slice(2);}
 else throw Error('Unsupported encoding context.');
 const examples={"Path segment":"slashes become %2F; each segment stays atomic","Whole path":"slashes are preserved as path separators","Query key":"encode independently before joining with =","Query value":"encode independently before joining with &","Form value":"form-urlencoded uses + for spaces"};
 return {text:result,summary:mode+' encoding',warnings:[examples[mode],'Encoding a component is not URL validation or sanitization.'],items:[{label:'Original characters',value:String([...s].length)},{label:'Encoded characters',value:String(result.length)}]};
}
