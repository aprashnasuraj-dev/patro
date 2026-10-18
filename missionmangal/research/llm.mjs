// OpenAI-compatible chat client (Groq, OpenRouter, SiliconFlow, Gemini-compat, Pollinations...). Only vetted adapters from the allowlist are used.
export function makeLlm({adapters,fetchImpl=fetch,env=process.env,sleep=ms=>new Promise(r=>setTimeout(r,ms)),maxRetries=3}){
 const state=new Map(); // id -> {until}
 return {available:()=>adapters.length>0,
  async json(system,user,{now=Date.now}={}){
   const errors=[];
   for(const a of adapters){
    if((state.get(a.id)||0)>now())continue; // circuit open
    const key=env[a.secret_env];if(!key){errors.push(a.id+': missing secret');continue;}
    for(let n=0;n<=maxRetries;n++){
     let res;try{res=await fetchImpl(a.endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify({model:a.model,temperature:0.2,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:user}]})});}catch(e){errors.push(a.id+': '+e.message);break;}
     if(res.status===429||res.status>=500){const ra=Number(res.headers?.get?.('retry-after'))||2**n;if(n===maxRetries){state.set(a.id,now()+60_000);errors.push(a.id+': HTTP '+res.status);break;}await sleep(Math.min(ra,60)*1000);continue;}
     if(!res.ok){errors.push(a.id+': HTTP '+res.status);break;}
     const body=await res.json();const text=body.choices?.[0]?.message?.content||'';
     try{return {provider:a.id,model:a.model,value:JSON.parse(text.replace(/^```json|```$/g,'').trim())};}catch{errors.push(a.id+': non-JSON output');break;}
    }
   }
   throw Object.assign(Error('No provider produced a result: '+errors.join(' | ')),{code:'NO_PROVIDER'});
  }};
}
