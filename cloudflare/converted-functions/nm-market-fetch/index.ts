import { envGet } from "../_shared/env";
import { createClient } from "@supabase/supabase-js";

const __edgeHandler = (async req=>{
  const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
  const url=envGet("SUPABASE_URL")||"https://pxlsmxbpgdfzjzuqtict.supabase.co";
  const key=envGet("SUPABASE_SERVICE_ROLE_KEY")||JSON.parse(envGet("SUPABASE_SECRET_KEYS")||"{}").default||"";
  if(!key)return new Response(JSON.stringify({error:"service_role_unavailable"}),{status:503,headers});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:secret,error}=await db.rpc("nm_runtime_secret",{secret_name:"nm_cron_secret"});
  if(error||!secret)return new Response(JSON.stringify({error:"cron_secret_unavailable"}),{status:503,headers});
  if((req.headers.get("authorization")||"")!=="Bearer "+secret)return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers});

  let lastStatus=503;
  let lastBody=JSON.stringify({error:"market_refresh_unavailable"});
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const r=await fetch(url+"/functions/v1/nepal-miti-protected/api/cron/market",{
        method:"POST",
        headers:{authorization:"Bearer "+secret,"content-type":"application/json"},
        body:"{}"
      });
      lastStatus=r.status;
      lastBody=await r.text();
      if(r.ok)return new Response(lastBody,{status:r.status,headers:{...headers,"x-nm-attempt":String(attempt)}});
      if(r.status===401||r.status===403)break;
    }catch{
      lastStatus=503;
      lastBody=JSON.stringify({error:"market_refresh_transport_error"});
    }
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,attempt*1000));
  }
  return new Response(lastBody,{status:lastStatus,headers:{...headers,"x-nm-attempt":"3"}});
});

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
    void env;
    void ctx;
    return await __edgeHandler(request);
  },
};
