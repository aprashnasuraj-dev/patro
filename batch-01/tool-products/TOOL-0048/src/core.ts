import {limit} from './guards.js';
export function compute(x){
 const raw=limit(x.headers,24000),lines=raw.split(/\r?\n/), headers=new Map(), warnings=[],findings=[];
 if(lines.length>150)throw Error('Too many header lines.');
 for(let i=0;i<lines.length;i++){
  const line=lines[i];if(line.length>4096)throw Error('Header line exceeds 4096 characters.');
  if(i===0&&/^HTTP\/\d(?:\.\d)?\s+\d{3}(?:\s|$)/.test(line))continue;
  if(!line.trim())continue;
  if(/^\s/.test(line))throw Error('Obsolete folded headers are unsupported (line '+(i+1)+').');
  const m=/^([!#$%&'*+.^_`|~\w-]+):[ \t]*([^\r\n\x00-\x1F]*)$/.exec(line);if(!m)throw Error('Malformed response header line '+(i+1));
  const name=m[1].toLowerCase();if(!headers.has(name))headers.set(name,[]);headers.get(name).push(m[2].trim());
 }
 if(!headers.size)throw Error('No response headers found.');
 const get=k=>(headers.get(k)||[]).join(', ');
 const add=(type,msg)=>findings.push({label:type,value:msg});
 if(headers.get('set-cookie')?.length)warnings.push('Set-Cookie values must not be combined using comma; separate header fields are preserved.');
 if(x.scheme==='HTTPS'&&!get('strict-transport-security'))add('HSTS','Absent; consider HTTPS-only deployment policy after subdomain review.');
 if(!/nosniff/i.test(get('x-content-type-options')))add('Content sniffing','X-Content-Type-Options: nosniff not observed.');
 if(!get('content-security-policy'))add('Content Security Policy','No enforced CSP observed. Consider report-only rollout first.');
 if(!get('referrer-policy'))add('Referrer Policy','No explicit Referrer-Policy observed.');
 const acao=get('access-control-allow-origin'),acac=get('access-control-allow-credentials');
 if(acao==='*'&&/true/i.test(acac))add('CORS conflict','Wildcard origin cannot authorize credentialed browser requests.');
 if(acao&&acao!=='*'&&!/origin/i.test(get('vary')))add('CORS cache variation','Dynamic origin reflection may need Vary: Origin.');
 if(/public/i.test(get('cache-control'))&&headers.has('set-cookie'))add('Cache review','Public caching and Set-Cookie on one response requires careful inspection.');
 if((headers.get('content-length')||[]).length>1)add('Response framing','Duplicate Content-Length requires review; conflicting values may allow response splitting.');
 if(headers.get('transfer-encoding')?.length&&headers.get('content-length')?.length)add('Response framing','Transfer-Encoding and Content-Length coexist; inspect proxy behavior.');
 if(/no-cache/i.test(get('cache-control'))&&!/no-store/i.test(get('cache-control')))warnings.push('no-cache means revalidation, not prohibition of storage.');
 return {text:JSON.stringify(Object.fromEntries(headers),null,2),summary:`${headers.size} unique header names; ${findings.length} review finding(s)`,warnings,items:findings.length?findings:[{label:'Review','value':'No configured heuristic findings; this is not a security clearance.'}]};
}
