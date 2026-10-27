import {limit,nonneg} from './guards.js';
const token=/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const octets=/^[\x21-\x3A\x3C-\x7E]*$/; // Cookie-octet excludes semicolon, quote, comma, whitespace, backslash.
export function compute(x){
 const warnings=[];
 if(x.mode==='Parse'){
  const raw=limit(x.raw,8000).trim().replace(/^Set-Cookie:\s*/i,'');if(/[\r\n]/.test(raw))throw Error('Parse exactly one Set-Cookie header; do not combine headers with commas.');
  const parts=raw.split(';').map(p=>p.trim());const eq=parts[0].indexOf('=');if(eq<1)throw Error('Cookie name=value missing.');
  const name=parts[0].slice(0,eq),value=parts[0].slice(eq+1);if(!token.test(name))throw Error('Invalid cookie name.');
  const attrs=Object.create(null),flags=new Set(),unknown=[];
  for(const s of parts.slice(1)){if(!s)continue;const p=s.indexOf('='), k=(p<0?s:s.slice(0,p)).toLowerCase(),v=p<0?'':s.slice(p+1).trim();if(!token.test(k))throw Error('Invalid attribute name.');if(k in attrs||flags.has(k))warnings.push('Duplicate attribute: '+k);if(p<0)flags.add(k);else attrs[k]=v;if(!['domain','path','expires','max-age','samesite','priority','partitioned','secure','httponly'].includes(k))unknown.push(k);}
  if(unknown.length)warnings.push('Unrecognized attributes: '+unknown.join(', '));
  if(attrs['samesite']?.toLowerCase()==='none'&&!flags.has('secure'))warnings.push('SameSite=None requires Secure in modern browsers.');
  if(flags.has('partitioned')&&!flags.has('secure'))warnings.push('Partitioned requires Secure.');
  if((name.startsWith('__Secure-')||name.startsWith('__Host-')||name.startsWith('__Http-')||name.startsWith('__Host-Http-'))&&!flags.has('secure'))warnings.push('Cookie prefix requires Secure.');
  if((name.startsWith('__Host-')||name.startsWith('__Host-Http-'))&&(attrs.path!=='/'||'domain' in attrs))warnings.push('__Host- cookies require Path=/ and no Domain.');
  if((name.startsWith('__Http-')||name.startsWith('__Host-Http-'))&&!flags.has('httponly'))warnings.push('__Http- cookies require HttpOnly.');
  return {text:JSON.stringify({name,value,attributes:attrs,flags:[...flags]},null,2),warnings,summary:'Parsed one Set-Cookie header (no comma splitting)'};
 }
 const name=limit(x.name,128),val=limit(x.value,3800),domain=limit(x.domain||'',253),path=limit(x.path||'',512),ss=x.samesite;
 if(!token.test(name)||!octets.test(val))throw Error('Cookie name or value contains forbidden characters; percent/base64url encode arbitrary content first.');
 if(domain&&(!/^(?:[a-z0-9-]+\.)*[a-z0-9-]+$/i.test(domain)||domain.includes('..')))throw Error('Invalid domain.');
 if(path&&(/[;\r\n\x00-\x1F]/.test(path)))throw Error('Invalid Path attribute.');
 if(!['Lax','Strict','None','Unspecified'].includes(ss))throw Error('Invalid SameSite mode.');
 if(ss==='None'&&!x.secure)throw Error('SameSite=None requires Secure.');
 if(x.partitioned&&!x.secure)throw Error('Partitioned cookies require Secure.');
 if((name.startsWith('__Secure-')||name.startsWith('__Host-')||name.startsWith('__Http-')||name.startsWith('__Host-Http-'))&&!x.secure)throw Error('Cookie prefix requires Secure.');
 if((name.startsWith('__Host-')||name.startsWith('__Host-Http-'))&&(domain||path!=='/'))throw Error('__Host- cookie requires Path=/ and no Domain.');
 if((name.startsWith('__Http-')||name.startsWith('__Host-Http-'))&&!x.httpOnly)throw Error('__Http- prefix requires HttpOnly.');
 const max=(x.maxAge||'').trim();if(max&&!/^-?\d+$/.test(max))throw Error('Max-Age must be a signed integer.');if(max&&Math.abs(Number(max))>2147483647)throw Error('Max-Age magnitude exceeds configured limit.');
 let out=`Set-Cookie: ${name}=${val}`+(domain?`; Domain=${domain}`:'')+(path?`; Path=${path}`:'')+(x.secure?'; Secure':'')+(x.httpOnly?'; HttpOnly':'')+(ss!=='Unspecified'?`; SameSite=${ss}`:'')+(x.partitioned?'; Partitioned':'')+(max?`; Max-Age=${max}`:'');
 if(out.length>4096)warnings.push('Cookie header exceeds a common 4096-byte compatibility limit.');
 if(!x.secure)warnings.push('Secure is recommended for cookies sent over HTTPS.');
 return {text:out,warnings,summary:'Set-Cookie header — review sensitive-cookie scope'};
}
