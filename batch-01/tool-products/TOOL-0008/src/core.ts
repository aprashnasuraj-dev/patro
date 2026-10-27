/** Postman Collection 2.1 metadata-only Markdown documentation; no secrets copied. */
export type Result={text:string;warnings:string[];details:{Endpoints:number;Folders:number}};
type Obj=Record<string,unknown>;const obj=(v:unknown):v is Obj=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clean=(s:string)=>s.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,120);
const md=(s:string)=>clean(s).replace(/[\\`*_{}\[\]()#+.!|<>]/g,'\\$&');
const hidden=(text:string)=>text.replace(/\{\{[^{}]+\}\}/g,'{variable}').replace(/\/\/[\s\S]*/,'');
function target(v:unknown):string{
 let text=typeof v==='string'?v:obj(v)?String(v.raw??''):'(URL unavailable)';
 text=text.split('?')[0].split('#')[0].replace(/\/\/[\w.-]+:[^/@]+@/g,'//[REDACTED]@');
 // Hide possible tokens embedded in path segments, but retain route structure where safe.
 text=text.replace(/\/[A-Za-z0-9_-]{32,}(?=\/|$)/g,'/{id}');return text.slice(0,180).replace(/[^A-Za-z0-9:/._%{}\-]/g,'_');
}
export function convert(input:string):Result{
 if(input.length>1_000_000)throw Error('Collection exceeds 1 MB');let doc:unknown;
 try{doc=JSON.parse(input.replace(/^\uFEFF/,''));}catch{throw Error('Invalid Postman collection JSON');}
 if(!obj(doc)||!obj(doc.info)||!Array.isArray(doc.item))throw Error('Expected Postman v2.1 info and item array');
 if(typeof doc.info.schema==='string'&&!/v2\.1\.0|v2\.0\.0/.test(doc.info.schema))throw Error('Supported: Collection v2.0/v2.1 single-JSON export');
 let endpoints=0,folders=0;const lines:string[]=['# '+md(String(doc.info.name||'API collection')),'','> Documentation generated locally. Auth credentials, examples, scripts and request bodies are intentionally omitted.',''];
 function visit(items:unknown[],depth:number):void{
  if(depth>12)throw Error('Collection nested over 12 folders');
  for(const item of items){if(!obj(item))throw Error('Invalid collection item');if(endpoints+folders>450)throw Error('Maximum 450 requests/folders');
   if(Array.isArray(item.item)){folders++;lines.push(''.padEnd(Math.min(depth+2,6),'#')+' '+md(String(item.name||'Folder')),'');visit(item.item,depth+1);continue;}
   if(!obj(item.request))throw Error('Collection item without request');
   const req=item.request;const method=typeof req.method==='string'?req.method.toUpperCase():'GET';if(!/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)$/.test(method))throw Error('Unsupported HTTP verb');
   endpoints++;lines.push(`${'#'.repeat(Math.min(depth+3,6))} ${md(String(item.name||`Request ${endpoints}`))}`,'',`**${method}** \`${target(req.url)}\``,'');
   if(Array.isArray(req.header)){
    const headers=(req.header as unknown[]).flatMap((v:unknown):string[]=>obj(v)&&v.disabled!==true&&typeof v.key==='string'&&/^(accept|content-type)$/i.test(v.key)?[md(v.key)]:[]);
    if(headers.length)lines.push('Declared non-sensitive header names: '+headers.join(', '),'');
   }
   lines.push('Authentication, raw bodies, test scripts and response fixtures are not exported.','');
  }
 }
 visit(doc.item,0);if(!endpoints)throw Error('No requests in collection');
 return{text:lines.join('\n')+'\n',warnings:['Metadata-only documentation. Inspect route paths for embedded sensitive identifiers before sharing.','Postman auth variables, request bodies, response examples and test scripts are not reproduced.'],details:{Endpoints:endpoints,Folders:folders}};
}
