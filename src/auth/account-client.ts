import { useEffect, useSyncExternalStore } from "react";
import { switchLifeAccount, syncLifeTools } from "../patro-tools-integration/storage";

export type AuthUser={id:string;email:string|null;name:string|null;picture:string|null;provider:"google"};
let user: AuthUser|null=null;
const listeners=new Set<()=>void>();
let initialized: Promise<void>|null=null;
let timer: ReturnType<typeof setTimeout>|undefined;
let dirty=false, saving=false;

function publish(next:AuthUser|null){
  user=next;
  switchLifeAccount(next?.id||null);
  for(const listener of listeners)listener();
  window.dispatchEvent(new Event("patro:auth-changed"));
  window.dispatchEvent(new Event("patro:sync-personal"));
}
function schedule(){
  if(!user)return;
  dirty=true;
  clearTimeout(timer);
  timer=setTimeout(()=>void savePending(),800);
}
async function savePending(){
  if(saving||!user||!dirty)return;
  saving=true;dirty=false;
  try{const result=await syncLifeTools();if(!result.synced)dirty=true;}finally{saving=false;}
  // Failed saves retry only on another edit, reconnect, or explicit account sync.
  if(dirty&&user&&navigator.onLine)timer=setTimeout(()=>{if(!saving)void syncLifeTools();},1500);
}
export function initializeAccount(){
  if(initialized)return initialized;
  initialized=(async()=>{
    const response=await fetch("/api/v1/auth/me",{credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}});
    if(!response.ok)return;
    const body=await response.json();
    publish(body.authenticated?body.user:null);
    if(user)await syncLifeTools();
  })().catch(()=>undefined);
  window.addEventListener("patro:life-updated",event=>{
    const detail=(event as CustomEvent).detail;
    if(!detail?.synced&&!detail?.accountChanged)schedule();
  });
  window.addEventListener("online",()=>{if(user){dirty=true;void savePending();}});
  window.addEventListener("storage",event=>{
    if(event.key==="patro.account.active")location.reload();
  });
  return initialized;
}
export function useAccount(){
  useEffect(()=>{void initializeAccount();},[]);
  return useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener)},()=>user,()=>null);
}
export async function completeGoogleSignIn(credential:string){
  const response=await fetch("/api/v1/auth/google",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({credential})});
  const body=await response.json();
  if(!response.ok||!body.user)throw new Error("Google sign-in failed. Please try again.");
  publish(body.user);
  dirty=true;
  await savePending();
  return body.user as AuthUser;
}
export async function signOut(){
  const response=await fetch("/api/v1/auth/logout",{method:"POST",credentials:"same-origin"});
  if(!response.ok)throw new Error("Sign-out failed. Please try again.");
  clearTimeout(timer);dirty=false;
  publish(null);
  (window as any).google?.accounts?.id?.disableAutoSelect();
}
export async function accountChallenge(){
  await initializeAccount();
  const [configResponse,challengeResponse]=await Promise.all([
    fetch("/api/v1/auth/config",{cache:"no-store",credentials:"same-origin"}),
    fetch("/api/v1/auth/challenge",{method:"POST",credentials:"same-origin",cache:"no-store"})
  ]);
  const config=await configResponse.json(),challenge=await challengeResponse.json();
  if(!configResponse.ok||!challengeResponse.ok||!config.google?.enabled||!challenge.nonce)throw new Error("Google sign-in is temporarily unavailable.");
  return {clientId:config.google.client_id as string,nonce:challenge.nonce as string};
}

let gisPromise:Promise<void>|null=null;
export function loadGoogleIdentity(){
  if((window as any).google?.accounts?.id)return Promise.resolve();
  if(gisPromise)return gisPromise;
  gisPromise=new Promise<void>((resolve,reject)=>{
    const script=document.createElement("script");
    const timeout=setTimeout(()=>{script.remove();reject(new Error("Google sign-in could not load. Check your connection."));},15000);
    script.src="https://accounts.google.com/gsi/client";script.async=true;
    script.onload=()=>{clearTimeout(timeout);resolve();};
    script.onerror=()=>{clearTimeout(timeout);script.remove();reject(new Error("Google sign-in could not load. Check your connection."));};
    document.head.appendChild(script);
  }).catch(error=>{gisPromise=null;throw error;});
  return gisPromise;
}
