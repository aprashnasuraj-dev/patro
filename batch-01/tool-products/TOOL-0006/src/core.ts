/** Fail-closed HAR privacy transformation. Unknown fields are dropped, never copied. */
export type Result={text:string;warnings:string[];details:{Requests:number;HeadersRemoved:number;BodiesRemoved:number}};
const isObj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:-1;
export function convert(input:string):Result{
 if(new TextEncoder().encode(input).length>3_000_000)throw Error('HAR exceeds 3 MB source limit');
 let source:unknown;try{source=JSON.parse(input.replace(/^\uFEFF/,''));}catch{throw Error('Invalid HAR JSON');}
 if(!isObj(source)||!isObj(source.log)||!Array.isArray(source.log.entries))throw Error('Expected HAR log.entries array');
 const entries=source.log.entries;if(entries.length>500)throw Error('Maximum 500 entries per export');
 let headers=0,bodies=0;
 const safe=entries.map((entry:unknown,i:number)=>{
  if(!isObj(entry)||!isObj(entry.request)||!isObj(entry.response))throw Error('Malformed HAR entry #'+(i+1));
  const rq=entry.request,rs=entry.response;
  if(!/^[A-Z]{2,16}$/.test(String(rq.method||'')))throw Error('Invalid method at entry '+(i+1));
  headers+=(Array.isArray(rq.headers)?rq.headers.length:0)+(Array.isArray(rs.headers)?rs.headers.length:0);
  bodies+=Number(Boolean(rq.postData))+Number(Boolean(rs.content));
  const timings:Record<string,number>={};if(isObj(entry.timings))for(const key of ['blocked','dns','connect','send','wait','receive','ssl'])if(key in entry.timings)timings[key]=finite(entry.timings[key]);
  const result={startedDateTime:typeof entry.startedDateTime==='string'&&Number.isFinite(Date.parse(entry.startedDateTime))?new Date(entry.startedDateTime).toISOString():'1970-01-01T00:00:00.000Z',
   time:finite(entry.time),request:{method:rq.method,url:`https://redacted.invalid/request/${i+1}`,httpVersion:'HTTP/1.1',cookies:[],headers:[],queryString:[],headersSize:-1,bodySize:-1},
   response:{status:typeof rs.status==='number'&&Number.isInteger(rs.status)&&Number(rs.status)>=100&&Number(rs.status)<=599?rs.status:0,statusText:'',httpVersion:'HTTP/1.1',cookies:[],headers:[],content:{size:isObj(rs.content)?finite(rs.content.size):0,mimeType:'application/octet-stream'},redirectURL:'',headersSize:-1,bodySize:finite(rs.bodySize)},cache:{},timings};
  return result;
 });
 const result={log:{version:'1.2',creator:{name:'AafnaiPatro HAR Redactor',version:'1.0.0'},entries:safe}};
 return {text:JSON.stringify(result,null,2)+'\n',warnings:['URLs, hostnames, headers, cookies, queries, request/response bodies, comments, extension fields, identifying IDs and server addresses were discarded.','Status and timing metadata remain; traffic patterns may still identify activities. Inspect the exported HAR before sharing.'],details:{Requests:entries.length,HeadersRemoved:headers,BodiesRemoved:bodies}};
}
