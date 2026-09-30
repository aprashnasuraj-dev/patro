import { createClient } from "npm:@supabase/supabase-js@2";
Deno.serve(async req=>{
  const url=Deno.env.get("SUPABASE_URL")||"https://pxlsmxbpgdfzjzuqtict.supabase.co";
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||"";
  if(!key)return new Response(JSON.stringify({error:"service_role_unavailable"}),{status:503,headers:{"content-type":"application/json"}});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:secret,error}=await db.rpc("nm_runtime_secret",{secret_name:"nm_cron_secret"});
  if(error||!secret)return new Response(JSON.stringify({error:"cron_secret_unavailable"}),{status:503,headers:{"content-type":"application/json"}});
  if((req.headers.get("authorization")||"")!=="Bearer "+secret)return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:{"content-type":"application/json","cache-control":"no-store"}});
  const r=await fetch(url+"/functions/v1/nepal-miti-protected/api/cron/push",{method:"POST",headers:{authorization:"Bearer "+secret,"content-type":"application/json"},body:"{}"});
  return new Response(await r.text(),{status:r.status,headers:{"content-type":r.headers.get("content-type")||"application/json","cache-control":"no-store"}});
});