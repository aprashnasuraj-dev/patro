import {nonneg} from './guards.js';
export function compute(x){const preset=x.profile,age=nonneg(x.maxAge,31536000),shared=nonneg(x.sMaxAge,31536000),stale=nonneg(x.stale,604800),warnings=[];let rules=[];
 if(preset==='Public asset'){rules=['public',`max-age=${age}`,`s-maxage=${shared}`];if(x.immutable){if(age<31536000)warnings.push('immutable is most useful for versioned assets with long freshness.');rules.push('immutable');}if(stale)rules.push(`stale-while-revalidate=${stale}`);warnings.push('Use content-hashed URLs for immutable assets; public is unsafe for personalized responses.');}
 else if(preset==='HTML document'){rules=['public',`max-age=${age}`,'must-revalidate'];if(stale)warnings.push('Stale window ignored for HTML document preset because must-revalidate disallows stale reuse unless explicitly permitted by compatible policy; configure carefully.');}
 else if(preset==='Private user data'){rules=['private',`max-age=${age}`,'must-revalidate'];if(shared)warnings.push('s-maxage ignored for private response; shared caches must not store it.');}
 else if(preset==='Sensitive no-store'){rules=['no-store'];warnings.push('no-store instructs caches not to store; it does not erase existing caches or browser history.');}
 else throw Error('Unsupported cache profile.');
 return {text:'Cache-Control: '+rules.join(', '),summary:preset+' policy',warnings,items:rules.map(r=>({label:r.split('=')[0],value:r.includes('=')?r.split('=')[1]:'Enabled'}))};
}
