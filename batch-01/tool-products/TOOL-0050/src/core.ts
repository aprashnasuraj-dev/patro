import {nonneg} from './guards.js';
export function compute(x){const age=nonneg(x.maxAge,63072000),warnings=[];const rules=[`max-age=${age}`];if(x.subdomains)rules.push('includeSubDomains');if(x.preload)rules.push('preload');
 const checks=[['Valid TLS certificates',x.cert],['HTTP → HTTPS redirect',x.redirect],['HTTPS for every subdomain',x.subdomainHTTPS],['HSTS on HTTPS redirect responses',x.redirectHeaders],['includeSubDomains present',x.subdomains],['preload token present',x.preload],['max-age >= 31536000',age>=31536000]];
 const unmet=checks.filter(c=>!c[1]);if(x.preload&&unmet.length)warnings.push('Preload candidate NOT READY: '+unmet.map(c=>c[0]).join('; '));
 if(x.subdomains)warnings.push('includeSubDomains affects subdomains, including internal hosts; audit TLS coverage before deployment.');
 if(age===0)warnings.push('max-age=0 disables HSTS for this host after receiving the header over HTTPS.');
 return {text:'Strict-Transport-Security: '+rules.join('; '),summary:x.preload?(unmet.length?'Preload checklist incomplete':'Self-reported prerequisites met; verify independently'):'HSTS header candidate',warnings,items:checks.map(c=>({label:c[1]?'✓ '+c[0]:'✕ '+c[0],value:c[1]?'Indicated':'Not confirmed'}))};
}
