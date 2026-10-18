// OpenAI-compatible chat client (Groq, OpenRouter, SiliconFlow, Gemini-compat, Pollinations...). Only vetted adapters from the allowlist are used.
const SKIP=/whisper|guard|embed|tts|audio|image|moderation|rerank|vision|ocr|transcribe|safeguard/i;
export async function resolveModel(a,{fetchImpl,key}){
 if(a.model&&a.model!=='auto')return a.model;
 try{const r=await fetchImpl(a.endpoint.replace(/\/chat\/completions$/,'/models'),{headers:{authorization:'Bearer '+key}});if(r.ok){const j=await r.json();const ids=(j.data||j.models||[]).map(m=>String(m.id||m.name).replace(/^models\//,'')).filter(i=>i&&!SKIP.test(i));
  for(const p of a.prefer||[]){const hit=ids.find(i=>new RegExp(p,'i').test(i));if(hit)return hit;}if(ids.length)return ids[0];}}catch{}
 if(a.fallback_model)return a.fallback_model;throw Error('no model resolved for '+a.id);
}
export function makeLlm({adapters,fetchImpl=fetch,env=process.env,sleep=ms=>new Promise(r=>setTimeout(r,ms)),maxRetries=3}){
 const state=new Map(),models=new Map();
 return {available:()=>adapters.some(a=>env[a.secret_env]),
  async json(system,user,{now=Date.now}={}){
   const errors=[];
   for(const a of adapters){
    if((state.get(a.id)||0)>now())continue; // circuit open
    const key=env[a.secret_env];if(!key){errors.push(a.id+': missing secret');continue;}
    let model;try{model=models.get(a.id)||await resolveModel(a,{fetchImpl,key});models.set(a.id,model);}catch(e){errors.push(e.message);continue;}
    for(let n=0;n<=maxRetries;n++){
     let res;try{res=await fetchImpl(a.endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify({model,temperature:0.2,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:user}]})});}catch(e){errors.push(a.id+': '+e.message);break;}
     if(res.status===429||res.status>=500){const ra=Number(res.headers?.get?.('retry-after'))||2**n;if(n===maxRetries){state.set(a.id,now()+60_000);errors.push(a.id+': HTTP '+res.status);break;}await sleep(Math.min(ra,60)*1000);continue;}
     if(!res.ok){errors.push(a.id+': HTTP '+res.status);if([401,402,403,404].includes(res.status))state.set(a.id,now()+60*60_000);break;}
     const body=await res.json();const text=body.choices?.[0]?.message?.content||'';
     try{return {provider:a.id,model,value:JSON.parse(text.replace(/^```json|```$/g,'').trim())};}catch{errors.push(a.id+': non-JSON output');break;}
    }
   }
   throw Object.assign(Error('No provider produced a result: '+errors.join(' | ')),{code:'NO_PROVIDER'});
  }};
}
