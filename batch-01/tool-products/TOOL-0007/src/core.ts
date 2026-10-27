/** Safe-by-default HAR -> POSIX curl replay drafts, no execution or network. */
export type Result={text:string;warnings:string[];details:{Commands:number;OmittedBodies:number}};
const isObj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const shq=(s:string)=>"'"+s.replace(/'/g,"'\\''")+"'";
const sensitiveSegment=(s:string)=>/^(?:[a-f\d]{24,}|[a-z\d-_]{40,}|[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[a-f\d]{4}-[a-f\d]{12})$/i.test(s);
export function convert(input:string,opts:{includeBodies?:boolean;keepQuery?:boolean}={}):Result{
 if(input.length>2_000_000)throw Error('HAR exceeds 2 million characters');let raw:unknown;
 try{raw=JSON.parse(input.replace(/^\uFEFF/,''));}catch{throw Error('Invalid HAR JSON');}
 if(!isObj(raw)||!isObj(raw.log)||!Array.isArray(raw.log.entries))throw Error('Expected log.entries array');
 if(raw.log.entries.length>200)throw Error('Maximum 200 requests');
 let omitted=0;const warnings=['Review every command before execution: generated curl commands can send data over the network.','Authentication headers, cookies and query parameters are excluded by default; URL paths can still contain identifiers.'];
 const rows:string[]=['#!/bin/sh','# HAR-derived commands: REVIEW before executing. No script is executed in the converter.','set -eu'];
 for(const [index,e] of raw.log.entries.entries()){
  if(!isObj(e)||!isObj(e.request))throw Error('Invalid HAR request '+(index+1));const r=e.request;
  const method=String(r.method||'').toUpperCase();if(!/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(method))throw Error('Unsupported method in entry '+(index+1));
  if(typeof r.url!=='string'||r.url.length>4000)throw Error('Invalid URL in entry '+(index+1));
  let parsed:URL;try{parsed=new URL(r.url);}catch{throw Error('Invalid request URL');}
  if(!['http:','https:'].includes(parsed.protocol))throw Error('Only HTTP(S) schemes accepted');
  parsed.username='';parsed.password='';parsed.hash='';if(!opts.keepQuery)parsed.search='';
  parsed.pathname='/'+parsed.pathname.split('/').filter(Boolean).map(x=>sensitiveSegment(decodeURIComponent(x))?'[REDACTED]':x).join('/');
  const parts=['curl','--request',shq(method),'--url',shq(parsed.toString())];
  if(Array.isArray(r.headers))for(const h of r.headers){
   if(!isObj(h)||typeof h.name!=='string'||typeof h.value!=='string')continue;
   if(!/^(accept|content-type)$/i.test(h.name))continue;
   if(/[\r\n\0]/.test(h.value))throw Error('Header contains line break/control');
   if(h.value.length>250)continue;parts.push('--header',shq(h.name+': '+h.value));
  }
  if(isObj(r.postData)&&typeof r.postData.text==='string'){
   if(opts.includeBodies){if(r.postData.text.length>50_000)throw Error('Request body exceeds 50 KB');parts.push('--data-raw',shq(r.postData.text));}
   else omitted++;
  }
  rows.push('# Request '+(index+1),parts.join(' '));
 }
 if(opts.includeBodies||opts.keepQuery)warnings.push('Opted-in request payload/query may contain passwords, tokens, personal data or session identifiers. Never execute unreviewed scripts.');
 return{text:rows.join('\n')+'\n',warnings,details:{Commands:raw.log.entries.length,OmittedBodies:omitted}};
}
