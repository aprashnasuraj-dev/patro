import {limit,origin} from './guards.js';
const allowed=new Set(['script-src','style-src','img-src','connect-src','font-src','frame-src','media-src','worker-src','manifest-src','form-action']);
export function compute(x){
 const lines=limit(x.rules,7000).split(/\r?\n/).map(s=>s.trim()).filter(Boolean),groups=new Map(),warnings=[];
 if(lines.length>80)throw Error('At most 80 source rules.');
 for(const [index,line] of lines.entries()){
  const m=/^([a-z-]+)\s+(\S+)$/.exec(line);if(!m||!allowed.has(m[1]))throw Error('Invalid directive and origin on line '+(index+1));
  const o=origin(m[2]);if(!o.startsWith('https://'))throw Error('HTTPS origins only on line '+(index+1));
  if(!groups.has(m[1]))groups.set(m[1],new Set(["'self'"]));groups.get(m[1]).add(o);
 }
 const fixed=["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"];
 for(const [key,v] of groups)if(key!=='form-action')fixed.push(`${key} ${[...v].join(' ')}`);
 if(groups.has('form-action')){fixed.splice(4,1);fixed.push('form-action '+[...groups.get('form-action')].join(' '));}
 if(x.upgrade)fixed.push('upgrade-insecure-requests');
 warnings.push('Review inline scripts, dynamic imports, styles, nonces/hashes and third-party redirects before enforcing.');
 const k=x.reportOnly?'Content-Security-Policy-Report-Only':'Content-Security-Policy';
 return {text:`${k}: ${fixed.join('; ')}`,summary:x.reportOnly?'Report-only CSP candidate':'Enforced CSP candidate',warnings};
}
