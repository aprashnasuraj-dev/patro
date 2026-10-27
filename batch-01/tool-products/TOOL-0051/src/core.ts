import {limit,origin} from './guards.js';
const features=['camera','microphone','geolocation','fullscreen','payment','clipboard-read'];
export function compute(x){const raw=limit(x.origins,5000).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(raw.length>30)throw Error('Maximum 30 origins.');const origins=[...new Set(raw.map(origin))];if(origins.some(s=>!s.startsWith('https://')))throw Error('HTTPS custom origins only.');const output=[],warnings=[];
 for(const f of features){const val=x[f];let allow;if(val==='none')allow='()';else if(val==='self')allow='(self)';else if(val==='all')allow='*';else if(val==='custom'){if(!origins.length)throw Error('Custom '+f+' requires at least one origin.');allow='(self '+origins.map(s=>JSON.stringify(s)).join(' ')+')';}else throw Error('Unsupported allowlist mode.');output.push(`${f}=${allow}`);}
 if(features.some(f=>x[f]==='all'))warnings.push('Wildcard grants the selected browser feature broadly, subject to feature and iframe restrictions.');
 warnings.push('Feature support varies; parent policy and iframe allow attribute can both restrict delegation.');
 return {text:'Permissions-Policy: '+output.join(', '),summary:'Six explicit feature allowlists',warnings,items:output.map(s=>({label:s.split('=')[0],value:s.slice(s.indexOf('=')+1)}))};
}
