import {readFile} from 'node:fs/promises';
export async function loadAdapters(path){const config=JSON.parse(await readFile(path,'utf8'));if(config.enabled!==true)return [];return config.adapters.filter(a=>a.enabled===true && a.official_terms_verified===true && a.commercial_use_verified===true && /^https:\/\//.test(a.endpoint||'') && /^[A-Z][A-Z0-9_]+$/.test(a.secret_env||''));}
export function selectAdapter(adapters,capability,usage={}){
 const ready=adapters.filter(a=>a.capabilities?.includes(capability)&&a.enabled===true&&a.official_terms_verified===true&&a.commercial_use_verified===true&&Number.isFinite(a.daily_limit)&&a.daily_limit>0&&(usage[a.id]||0)<a.daily_limit);
 return ready.sort((a,b)=>(usage[a.id]||0)/a.daily_limit-(usage[b.id]||0)/b.daily_limit)[0]||null;
}
export function publicSourceCandidate(c){return c&&c.approved===true&&c.official_terms_verified===true&&c.commercial_use_verified===true&&/^https:\/\//.test(c.endpoint||'');}
