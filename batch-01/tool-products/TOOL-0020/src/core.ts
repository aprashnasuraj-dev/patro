export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
function canonical(v:unknown,unordered:boolean,depth=0):string{if(depth>64)throw Error('JSON nesting exceeds 64');if(Array.isArray(v)){const items=v.map(x=>canonical(x,unordered,depth+1));if(unordered)items.sort();return '['+items.join(',')+']'}
 if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k],unordered,depth+1)).join(',')+'}';return JSON.stringify(v);}
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 const delim=/^---JSON-DIFF---\s*$/m;const match=delim.exec(input);if(!match)throw Error('Separate two documents with a line containing ---JSON-DIFF---');
 const left=input.slice(0,match.index).trim(),right=input.slice(match.index+match[0].length).trim();if(!left||!right||left.length>200000||right.length>200000)throw Error('Both JSON documents required, each under 200 KB');
 let a:unknown,b:unknown;try{a=JSON.parse(left);b=JSON.parse(right)}catch{throw Error('Invalid JSON document')};const unordered=opts.ignoreArrayOrder!==false;const changes:Array<{path:string;kind:string;left?:unknown;right?:unknown}>=[];
 const walk=(x:unknown,y:unknown,path:string,depth:number)=>{if(changes.length>=1000)throw Error('More than 1000 differences');if(depth>64)throw Error('Nesting limit');
 if(canonical(x,unordered,depth)===canonical(y,unordered,depth))return;
 if(!Array.isArray(x)&&!Array.isArray(y)&&x&&y&&typeof x==='object'&&typeof y==='object'){
 const X=x as Record<string,unknown>,Y=y as Record<string,unknown>;for(const key of new Set([...Object.keys(X),...Object.keys(Y)])){const p=path+'/'+key.replace(/~/g,'~0').replace(/\//g,'~1');if(!Object.hasOwn(X,key))changes.push({path:p,kind:'added',right:Y[key]});else if(!Object.hasOwn(Y,key))changes.push({path:p,kind:'removed',left:X[key]});else walk(X[key],Y[key],p,depth+1);}return;
 }
 if(Array.isArray(x)&&Array.isArray(y)){if(unordered)changes.push({path,kind:'unordered-array-difference',left:x,right:y});else {for(let i=0;i<Math.max(x.length,y.length);i++){const p=path+'/'+i;if(i>=x.length)changes.push({path:p,kind:'added',right:y[i]});else if(i>=y.length)changes.push({path:p,kind:'removed',left:x[i]});else walk(x[i],y[i],p,depth+1);} }return;}
 changes.push({path,kind:'changed',left:x,right:y});};walk(a,b,'',0);
 return{text:JSON.stringify({equal:changes.length===0,arrayOrderIgnored:unordered,changes},null,2)+'\n',details:{differences:changes.length,equal:changes.length===0?'yes':'no'},warnings:['Ignored array order treats arrays as multisets: duplicates are counted.','Some array differences are reported as a whole unordered-array change, not element pairing.']};
}
