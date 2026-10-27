export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 let root:unknown;try{root=JSON.parse(input)}catch{throw Error('Invalid Extended JSON')};let converted=0;const warnings:string[]=[];const tagged=opts.mode!=='lossy';
 const visit=(value:unknown,depth:number):unknown=>{if(depth>50)throw Error('Maximum nested depth is 50');if(Array.isArray(value))return value.map(v=>visit(v,depth+1));if(!value||typeof value!=='object')return value;
 const obj=value as Record<string,unknown>,keys=Object.keys(obj);if(keys.length===1){const k=keys[0],v=obj[k];
  if(k==='$oid'){if(typeof v!=='string'||!/^[0-9a-f]{24}$/i.test(v))throw Error('Invalid ObjectId');converted++;return tagged?{'_bsonType':'ObjectId',value:v}:v;}
  if(k==='$numberDecimal'){if(typeof v!=='string'||!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v))throw Error('Invalid decimal');converted++;return tagged?{'_bsonType':'Decimal128',value:v}:v;}
  if(k==='$numberLong'){if(typeof v!=='string'||!/^-?\d+$/.test(v))throw Error('Invalid long');converted++;const n=BigInt(v);return !tagged&&n<=BigInt(Number.MAX_SAFE_INTEGER)&&n>=BigInt(Number.MIN_SAFE_INTEGER)?Number(n):tagged?{'_bsonType':'Int64',value:v}:v;}
  if(k==='$numberInt'){if(typeof v!=='string'||!/^-?\d+$/.test(v)||+v<-2147483648||+v>2147483647)throw Error('Invalid Int32');converted++;return tagged?{'_bsonType':'Int32',value:v}:Number(v);}
  if(k==='$date'){converted++;const val=typeof v==='string'?v:(v&&typeof v==='object'?(v as Record<string,unknown>)['$numberLong']:null);if(typeof val!=='string'||(typeof v==='string'&&Number.isNaN(Date.parse(val)))||(typeof v!=='string'&&!/^-?\d+$/.test(val)))throw Error('Invalid BSON date');return tagged?{'_bsonType':'Date',value:val}:val;}
  if(k==='$binary'||k==='$timestamp'||k==='$regularExpression'||k==='$minKey'||k==='$maxKey'||k==='$undefined'||k==='$symbol'){converted++;warnings.push(`${k}: preserved in explicit type wrapper, not converted to a native JSON scalar`);return {_bsonType:k.slice(1),value:v};}
  if(k.startsWith('$'))warnings.push(`${k}: unrecognized marker kept as a normal key`);
 }
 const out:Record<string,unknown>={};for(const [key,val] of Object.entries(obj)){if(key==='__proto__'||key==='constructor'||key==='prototype')throw Error('Reserved object key refused');out[key]=visit(val,depth+1)}return out;
 };
 const result=visit(root,0);if(!tagged)warnings.push('Lossy mode may erase BSON type distinctions (e.g. ObjectId versus string).');
 return{text:JSON.stringify(result,null,2)+'\n',details:{markersConverted:converted,mode:tagged?'tagged':'lossy'},warnings};
}
