import { envGet } from "../_shared/env";
import { createClient } from "@supabase/supabase-js";
const __edgeHandler = (async req=>{
  const url=envGet("SUPABASE_URL")||"https://pxlsmxbpgdfzjzuqtict.supabase.co";
  const key=envGet("SUPABASE_SERVICE_ROLE_KEY")||JSON.parse(envGet("SUPABASE_SECRET_KEYS")||"{}").default||"";
  if(!key)return new Response(JSON.stringify({error:"service_role_unavailable"}),{status:503,headers:{"content-type":"application/json"}});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:secret,error}=await db.rpc("nm_runtime_secret",{secret_name:"nm_cron_secret"});
  if(error||!secret)return new Response(JSON.stringify({error:"cron_secret_unavailable"}),{status:503,headers:{"content-type":"application/json"}});
  if((req.headers.get("authorization")||"")!=="Bearer "+secret)return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:{"content-type":"application/json","cache-control":"no-store"}});
  const r=await fetch(url+"/functions/v1/nepal-miti-protected/api/cron/push",{method:"POST",headers:{authorization:"Bearer "+secret,"content-type":"application/json"},body:"{}"});
  return new Response(await r.text(),{status:r.status,headers:{"content-type":r.headers.get("content-type")||"application/json","cache-control":"no-store"}});
});

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
    void env;
    void ctx;
    return await __edgeHandler(request);
  },
};
