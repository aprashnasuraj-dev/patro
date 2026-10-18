// Allowlisted research-data client: approved APIs only, per-host rate limit, response size cap, no secrets in URLs logged.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function loadApis(path){const c=JSON.parse(await readFile(path,'utf8'));return c.apis.filter(a=>a.approved===true&&/^https:\/\//.test(a.endpoint)&&(a.auth!=='key'||/^[A-Z][A-Z0-9_]+$/.test(a.secret_env||'')));}
export function makeClient({apis,fetchImpl=fetch,env=process.env,userAgent='AafnaiPatroResearchBot/1.0 (+https://aafnaipatro.com/editorial-guidelines/)',now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),maxBytes=2_000_000}){
 const last=new Map();
 return {apis,async query(id,q){
  const api=apis.find(a=>a.id===id);if(!api)throw Error('API not approved: '+id);
  let url=api.endpoint.replace('{q}',encodeURIComponent(q));
  if(api.auth==='key'){const k=env[api.secret_env];if(!k)throw Error('Missing secret '+api.secret_env);url=url.replace('{KEY}',encodeURIComponent(k));}
  const host=new URL(url).host,gap=1000/(api.rps||1),wait=last.has(host)?last.get(host)+gap-now():0;if(wait>0)await sleep(wait);last.set(host,now());
  const res=await fetchImpl(url,{headers:{'user-agent':userAgent,accept:'application/json'},redirect:'error'});
  if(res.status===429)throw Object.assign(Error('rate limited'),{retryAfter:res.headers?.get?.('retry-after')});
  if(!res.ok)throw Error(api.id+' HTTP '+res.status);
  const text=await res.text();if(text.length>maxBytes)throw Error('Response too large');
  return {api_id:api.id,query:q,retrieved_at:new Date(now()).toISOString(),sha256:createHash('sha256').update(text).digest('hex'),license_note:api.license_note,data:JSON.parse(text)};
 }};
}
