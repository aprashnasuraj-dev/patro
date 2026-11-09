// Standalone opt-in Cloudflare Durable Object quota coordinator. NOT deployed by patro.
export class QuotaCoordinator {
 constructor(state,env){this.state=state;this.env=env;}
 async fetch(request){
  if(request.method!=='POST')return new Response('Method not allowed',{status:405});
  const expected=this.env.MANGAL_COORDINATOR_TOKEN;
  if(!expected||request.headers.get('Authorization')!=='Bearer '+expected)return new Response('Unauthorized',{status:401});
  let input;try{input=await request.json();}catch{return new Response('Invalid JSON',{status:400});}
  const {operation,provider,window_key,request_key,limit}=input;
  if(!/^[a-z0-9_-]{2,80}$/i.test(provider||'')||!/^[0-9a-z:_-]{4,80}$/i.test(window_key||'')||!/^[a-z0-9:_-]{8,120}$/i.test(request_key||''))return new Response('Invalid reservation identifiers',{status:400});
  if(!['reserve','complete'].includes(operation))return new Response('Invalid operation',{status:400});
  // Transaction on one Durable Object: all requests for same provider key map to SAME object ID.
  const data=await this.state.storage.transaction(async txn=>{
   const reqKey='request:'+request_key,prior=await txn.get(reqKey);
   if(prior){
    if(prior.provider!==provider||prior.window_key!==window_key)return {status:409,error:'Idempotency-key conflict'};
    if(operation==='complete'&&prior.status==='reserved'){prior.status='completed';await txn.put(reqKey,prior);}
    return {status:200,result:prior.status,replayed:true};
   }
   if(operation==='complete')return {status:404,error:'Unknown reservation'};
   if(!Number.isSafeInteger(limit)||limit<1||limit>100000000)return {status:400,error:'Invalid configured limit'};
   const quotaKey='quota:'+provider+':'+window_key;const previous=await txn.get(quotaKey)||{used:0,limit};
   previous.limit=Math.min(previous.limit,limit);
   if(previous.used>=previous.limit)return {status:429,error:'Quota exhausted'};
   previous.used+=1;
   await txn.put(quotaKey,previous);await txn.put(reqKey,{provider,window_key,status:'reserved'});
   return {status:200,result:'reserved',used:previous.used,limit:previous.limit};
  });
  return Response.json(data,{status:data.status});
 }
}
export default {
 async fetch(request,env){
  // A separate, protected endpoint, no link to site/production Worker.
  if(new URL(request.url).pathname!=='/quota')return new Response('Not found',{status:404});
  if(!env.MANGAL_QUOTAS||!env.MANGAL_COORDINATOR_TOKEN)return new Response('Not configured',{status:503});
  const url=new URL(request.url);let body;
  try{body=await request.clone().json();}catch{return new Response('Invalid JSON',{status:400});}
  if(!/^[a-z0-9_-]{2,80}$/i.test(body.provider||''))return new Response('Invalid provider',{status:400});
  const id=env.MANGAL_QUOTAS.idFromName('provider:'+body.provider);
  return env.MANGAL_QUOTAS.get(id).fetch(request);
 }
};
