import {limit, origin, tokens, nonneg} from './guards.js';
export function compute(x){
 const server=x.server, raw=limit(x.origins,3000).split(/\r?\n/).map(s=>s.trim()).filter(Boolean), methods=tokens(x.methods,20).map(s=>s.toUpperCase()), headers=tokens(x.headers,30), age=nonneg(x.maxAge,86400), cred=Boolean(x.credentials), warnings=[];
 if(!raw.length||raw.length>30)throw Error('Provide 1–30 allowed origins.');
 const origins=[...new Set(raw.map(s=>s==='*'?'*':origin(s)))];
 if(origins.includes('*')&&(origins.length>1||cred))throw Error('Wildcard origin cannot be mixed with explicit origins or credentials.');
 if(!methods.length||methods.some(m=>!['GET','HEAD','PUT','POST','DELETE','OPTIONS','PATCH'].includes(m)))throw Error('Unsupported method.');
 if(headers.some(h=>!/^[!#$%&'*+.^_`|~\w-]+$/.test(h)))throw Error('Invalid header name.');
 if(server==='S3'){
  if(cred)warnings.push('S3 CORS configuration does not add Access-Control-Allow-Credentials; signed/authenticated requests need separate handling.');
  const allowed=methods.filter(s=>s!=='OPTIONS'); if(!allowed.length)throw Error('S3 needs at least one method other than OPTIONS.');
  return {text:JSON.stringify([{AllowedOrigins:origins,AllowedMethods:allowed,AllowedHeaders:headers,ExposeHeaders:[],MaxAgeSeconds:age}],null,2),warnings,summary:'Amazon S3 CORS JSON (bucket settings)'};
 }
 if(origins.length!==1 && server==='Apache')throw Error('Apache generator supports exactly one origin. Configure multi-origin reflection manually with deployment-specific rules.');
 const allow=origins[0], methodsStr=methods.join(', '), headersStr=headers.join(', ');
 if(server==='Express'){
  const code=`// Mount before application routes; Express 4/5 middleware example.\nconst allowed = new Set(${JSON.stringify(origins)});\napp.use((req,res,next) => {\n  const requestOrigin = req.headers.origin;\n  const match = ${JSON.stringify(origins.includes('*'))} ? '*' : (allowed.has(requestOrigin) ? requestOrigin : null);\n  if (match) {\n    res.setHeader('Access-Control-Allow-Origin', match);\n    ${origins.includes('*')?'':'res.vary(\'Origin\');'}\n    ${cred?"res.setHeader('Access-Control-Allow-Credentials', 'true');":''}\n    res.setHeader('Access-Control-Allow-Methods', ${JSON.stringify(methodsStr)});\n    res.setHeader('Access-Control-Allow-Headers', ${JSON.stringify(headersStr)});\n    res.setHeader('Access-Control-Max-Age', '${age}');\n  }\n  if (req.method === 'OPTIONS' && match) return res.sendStatus(204);\n  next();\n});`;
  return {text:code,warnings,summary:'Express middleware (requires app instance)'};
 }
 if(server==='Nginx'){
  // Fixed-origin snippet; map declaration must be in http{}; cannot inject a map inside a location.
  let mapped='';let target=allow;
  if(origins.length>1){const entries=origins.map(o=>`    ${JSON.stringify(o)} $http_origin;`).join('\n');mapped=`# Add inside http {}\nmap $http_origin $mm_cors_origin {\n    default '';\n${entries}\n}\n\n`;target='$mm_cors_origin';warnings.push('Map must be placed inside http {}; add_header inheritance and proxy/cache behavior require review.');}
  else warnings.push('Place this snippet in a suitable Nginx location; add_header inheritance and OPTIONS handling require integration review.');
  const q=target.startsWith('$')?target:JSON.stringify(target);
  return {text:`${mapped}# Inside location {}\nadd_header Access-Control-Allow-Origin ${q} always;\n${origins.includes('*')?'':'add_header Vary "Origin" always;\n'}${cred?'add_header Access-Control-Allow-Credentials "true" always;\n':''}add_header Access-Control-Allow-Methods ${JSON.stringify(methodsStr)} always;\nadd_header Access-Control-Allow-Headers ${JSON.stringify(headersStr)} always;\nadd_header Access-Control-Max-Age "${age}" always;\nif ($request_method = OPTIONS) { return 204; }`,warnings,summary:'Nginx location snippet; validate context before use'};
 }
 if(server==='Apache'){
  if(origins.length!==1)throw Error('One origin required for Apache generator.');
  if(!origins.includes('*'))warnings.push('Requires mod_headers; verify virtual-host location and OPTIONS routing.');
  return {text:`# Requires mod_headers. Place in virtual host or appropriate Directory section.\nHeader always set Access-Control-Allow-Origin ${JSON.stringify(allow)}\n${allow==='*'?'':'Header always merge Vary Origin\n'}${cred?'Header always set Access-Control-Allow-Credentials "true"\n':''}Header always set Access-Control-Allow-Methods ${JSON.stringify(methodsStr)}\nHeader always set Access-Control-Allow-Headers ${JSON.stringify(headersStr)}\nHeader always set Access-Control-Max-Age "${age}"\n# Handle OPTIONS preflight in application/router and return 204.`,warnings,summary:'Apache mod_headers; preflight handler required'};
 }
 throw Error('Unknown target server.');
}
