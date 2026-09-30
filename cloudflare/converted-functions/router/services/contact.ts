import { envGet } from "../../_shared/env";
export type ContactPayload={name?:unknown;email?:unknown;message?:unknown;company?:unknown};
export type ContactResult={ok:boolean;status:number;error?:string};
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function clean(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):"";}
export async function storeContact(payload:ContactPayload,meta:{ip:string;userAgent:string}):Promise<ContactResult>{
  const company=clean(payload.company,200);if(company)return{ok:true,status:202};
  const name=clean(payload.name,120),email=clean(payload.email,254).toLowerCase(),message=clean(payload.message,5000);
  if(name.length<1)return{ok:false,status:400,error:"name_required"};if(!EMAIL.test(email))return{ok:false,status:400,error:"valid_email_required"};if(message.length<5)return{ok:false,status:400,error:"message_too_short"};
  const base=envGet("SUPABASE_URL")||"",role=envGet("SUPABASE_SERVICE_ROLE_KEY")||"";if(!base||!role)return{ok:false,status:503,error:"contact_service_unavailable"};
  const response=await fetch(base+"/rest/v1/contact_messages",{method:"POST",headers:{apikey:role,authorization:"Bearer "+role,"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify({name,email,message,source:"mero-patro-web",ip_hint:meta.ip==="shared-anonymous"?null:meta.ip.slice(0,64),user_agent:meta.userAgent.slice(0,300)})});
  if(!response.ok)return{ok:false,status:503,error:"contact_store_failed"};return{ok:true,status:202};
}
