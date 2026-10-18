// Budget-aware, health-aware LLM router. Replaces v1's per-process circuit breaker.
//  - only providers that passed preflight (health.json) are used, with the model preflight proved works
//  - each worker owns a slice of each provider's daily budget (daily*safety/workers) and an RPM slice -> 25 workers no longer stampede one quota
//  - 429 => cooldown that honours Retry-After; 401/402/403/404 => provider disabled for the rest of the run; bad JSON => try next provider
//  - when every provider is spent it throws NO_BUDGET so the runner stops cleanly (work stays queued for the next run) instead of burning topics
export function makeLlmV2({adapters,health,config,workers=1,env=process.env,fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),clock=()=>Date.now(),maxSleepMs=90_000}){
 const live=adapters.filter(a=>env[a.secret_env]&&health?.providers?.find(h=>h.id===a.id&&h.ok)).map(a=>{
  const h=health.providers.find(x=>x.id===a.id),c=config.providers?.[a.id]||{rpm:10,daily:a.daily_limit||200};
  const budget=Math.max(1,Math.floor(c.daily*(config.budget_safety??0.85)/workers)),gap=Math.ceil(60_000/Math.max(1,c.rpm/workers));
  return {a,model:h.model,budget,used:0,gap,next:0,cooldown:0,dead:false};});
 const usable=()=>live.filter(p=>!p.dead&&p.used<p.budget);
 const stats=()=>live.map(p=>({id:p.a.id,used:p.used,budget:p.budget,dead:p.dead}));
 return {available:()=>live.length>0,stats,
  async json(system,user){
   const errors=[];
   for(let round=0;round<4;round++){
    const pool=usable();if(!pool.length)throw Object.assign(Error('NO_BUDGET: '+(errors.join(' | ')||'all providers spent or unhealthy')),{code:'NO_BUDGET'});
    const t=clock();pool.sort((x,y)=>Math.max(x.next,x.cooldown)-Math.max(y.next,y.cooldown)||(y.budget-y.used)/y.budget-(x.budget-x.used)/x.budget);
    const p=pool[0],wait=Math.max(p.next,p.cooldown)-t;
    if(wait>maxSleepMs){errors.push(p.a.id+': cooling');p.cooldown=t+wait;continue;}
    if(wait>0)await sleep(wait);
    p.used++;p.next=clock()+p.gap;
    let res;try{res=await fetchImpl(p.a.endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+env[p.a.secret_env]},body:JSON.stringify({model:p.model,temperature:0.2,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:user}]})});}
    catch(e){errors.push(p.a.id+': '+e.message);p.cooldown=clock()+15_000;continue;}
    if(res.status===429||res.status>=500){const ra=Number(res.headers?.get?.('retry-after'))||30;p.cooldown=clock()+Math.min(ra,120)*1000;errors.push(p.a.id+': HTTP '+res.status);continue;}
    if(!res.ok){errors.push(p.a.id+': HTTP '+res.status);if([401,402,403,404].includes(res.status))p.dead=true;continue;}
    try{const body=await res.json();const text=body.choices?.[0]?.message?.content||'';return {provider:p.a.id,model:p.model,value:JSON.parse(text.replace(/^```json|```$/g,'').trim())};}
    catch{errors.push(p.a.id+': non-JSON');p.cooldown=clock()+5_000;}
   }
   throw Object.assign(Error('No provider produced a result: '+errors.join(' | ')),{code:'NO_PROVIDER'});
  }};
}
