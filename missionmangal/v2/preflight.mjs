#!/usr/bin/env node
// Preflight: one tiny JSON call per provider (trying several candidate models) BEFORE any shard starts. Writes health.json.
// v1 learned about SiliconFlow 402 / Gemini 404 only after 1,235 topics had already failed.
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {dirname,resolve,join} from 'node:path';
const root=resolve('missionmangal');
const SKIP=/whisper|guard|embed|tts|audio|image|moderation|rerank|vision|ocr|transcribe|safeguard|preview-tts|live/i;
async function models(a,key,f){try{const r=await f(a.endpoint.replace(/\/chat\/completions$/,'/models'),{headers:{authorization:'Bearer '+key}});if(!r.ok)return [];const j=await r.json();return (j.data||j.models||[]).map(m=>String(m.id||m.name).replace(/^models\//,'')).filter(i=>i&&!SKIP.test(i));}catch{return [];}}
export function candidateModels(a,ids){const out=[];for(const p of a.prefer||[])for(const i of ids)if(new RegExp(p,'i').test(i)&&!out.includes(i))out.push(i);for(const i of ids)if(!out.includes(i))out.push(i);if(a.fallback_model&&!out.includes(a.fallback_model))out.push(a.fallback_model);if(a.model&&a.model!=='auto'&&!out.includes(a.model))out.unshift(a.model);return out.slice(0,5);}
export async function probe(a,key,model,f=fetch){
 try{const r=await f(a.endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify({model,temperature:0,max_tokens:30,response_format:{type:'json_object'},messages:[{role:'system',content:'Reply with JSON only.'},{role:'user',content:'Return {"ok":true}'}]})});
  if(!r.ok)return {ok:false,status:r.status};const j=await r.json();JSON.parse((j.choices?.[0]?.message?.content||'').replace(/^```json|```$/g,'').trim());return {ok:true,status:200};}
 catch(e){return {ok:false,status:0,error:String(e.message).slice(0,80)};}}
export async function preflight({adapters,env=process.env,fetchImpl=fetch,log=console.log}){
 const providers=[];
 for(const a of adapters){const key=env[a.secret_env];if(!key){providers.push({id:a.id,ok:false,reason:'no secret'});continue;}
  const cands=candidateModels(a,await models(a,key,fetchImpl));if(!cands.length)cands.push(a.fallback_model||'default');
  let last=null,hit=null;for(const m of cands){const r=await probe(a,key,m,fetchImpl);last=r;if(r.ok){hit=m;break;}if([401,402,403].includes(r.status))break;}
  const row=hit?{id:a.id,ok:true,model:hit,status:200}:{id:a.id,ok:false,status:last?.status,reason:last?.status===402?'payment required':last?.status===429?'rate limited at preflight':'no working model',tried:cands};
  providers.push(row);log('preflight',JSON.stringify(row));}
 return {at:new Date().toISOString(),providers,healthy:providers.filter(p=>p.ok).map(p=>p.id)};
}
if(process.argv[1]?.endsWith('preflight.mjs')){
 const cfg=JSON.parse(await readFile(join(root,'config','adapter-allowlist.json'),'utf8'));
 const adapters=cfg.adapters.filter(a=>a.enabled===true&&a.owner_attested===true&&/^https:\/\//.test(a.endpoint));
 const h=await preflight({adapters});const out=process.argv[2]||join(root,'v2-work','health.json');
 await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(h,null,2));
 console.log('healthy providers:',h.healthy.join(', ')||'NONE');
 if(!h.healthy.length)console.log('::warning::No healthy LLM provider. v2 will plan and discover evidence only.');
}
