import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound } from "lucide-react";

type AuthUser={id:string;email:string|null;name:string|null;picture:string|null;provider:"google"};
type Config={ok:boolean;google?:{enabled:boolean;client_id:string|null}};

let gisPromise:Promise<void>|null=null;
function loadGis(){
  if((window as any).google?.accounts?.id)return Promise.resolve();
  if(gisPromise)return gisPromise;
  gisPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement|null;
    if(existing){existing.addEventListener("load",()=>resolve(),{once:true});existing.addEventListener("error",()=>reject(new Error("google_script_failed")),{once:true});return;}
    const script=document.createElement("script");
    script.src="https://accounts.google.com/gsi/client";script.async=true;script.defer=true;
    script.onload=()=>resolve();script.onerror=()=>reject(new Error("google_script_failed"));
    document.head.appendChild(script);
  });
  return gisPromise;
}
async function readMe():Promise<AuthUser|null>{
  try{
    const r=await fetch("/api/v1/auth/me",{headers:{Accept:"application/json"},cache:"no-store",credentials:"same-origin"});
    const body=await r.json();return body?.authenticated&&body?.user?body.user:null;
  }catch{return null}
}
export function GoogleAuthButton({language}:{language:"ne"|"en"}){
  const [user,setUser]=useState<AuthUser|null>(null);
  const [open,setOpen]=useState(false);
  const [config,setConfig]=useState<Config|null>(null);
  const [error,setError]=useState("");
  const host=useRef<HTMLDivElement>(null);

  useEffect(()=>{void readMe().then(setUser);const sync=()=>void readMe().then(setUser);window.addEventListener("patro:auth-changed",sync);return()=>window.removeEventListener("patro:auth-changed",sync);},[]);
  useEffect(()=>{
    if(!open||user)return;
    let cancelled=false;
    (async()=>{
      try{
        const c=await fetch("/api/v1/auth/config",{cache:"no-store"}).then(r=>r.json()) as Config;
        if(cancelled)return;setConfig(c);
        if(!c.google?.enabled||!c.google.client_id){setError(language==="ne"?"Google Sign-In अझै configure गरिएको छैन।":"Google Sign-In is not configured yet.");return;}
        await loadGis();if(cancelled||!host.current)return;
        const google=(window as any).google;
        google.accounts.id.initialize({
          client_id:c.google.client_id,
          callback:async(response:any)=>{
            setError("");
            const r=await fetch("/api/v1/auth/google",{method:"POST",headers:{"content-type":"application/json",Accept:"application/json"},body:JSON.stringify({credential:response?.credential||""}),credentials:"same-origin"});
            const body=await r.json().catch(()=>({}));
            if(!r.ok){setError(body?.error||"sign_in_failed");return;}
            setUser(body.user);setOpen(false);
            window.dispatchEvent(new Event("patro:auth-changed"));
            window.dispatchEvent(new Event("patro:sync-personal"));
          }
        });
        host.current.innerHTML="";
        google.accounts.id.renderButton(host.current,{theme:"outline",size:"large",shape:"pill",text:"signin_with",width:260});
      }catch(e){if(!cancelled)setError(String((e as Error)?.message||e));}
    })();
    return()=>{cancelled=true};
  },[open,user,language]);

  async function logout(){
    await fetch("/api/v1/auth/logout",{method:"POST",credentials:"same-origin"}).catch(()=>undefined);
    setUser(null);setOpen(false);window.dispatchEvent(new Event("patro:auth-changed"));
  }

  if(user)return <div className="mp-account">
    <button type="button" className="mp-account__button" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
      {user.picture?<img src={user.picture} alt="" referrerPolicy="no-referrer"/>:<UserRound size={18}/>}
      <span>{user.name?.split(" ")[0]|| (language==="ne"?"मेरो खाता":"Account")}</span>
    </button>
    {open&&<div className="mp-account__menu">
      <strong>{user.name||user.email||"Google account"}</strong>
      {user.email&&<small>{user.email}</small>}
      <a href="/my-data">{language==="ne"?"मेरो डेटा":"My data"}</a>
      <button type="button" onClick={logout}><LogOut size={16}/>{language==="ne"?"साइन आउट":"Sign out"}</button>
    </div>}
  </div>;

  return <>
    <button type="button" className="mp-signin" onClick={()=>{setError("");setOpen(true)}}><UserRound size={18}/><span>{language==="ne"?"Google साइन इन":"Sign in with Google"}</span></button>
    {open&&<div className="mp-auth-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}>
      <section className="mp-auth-dialog" role="dialog" aria-modal="true" aria-label="Google sign in">
        <button className="mp-auth-close" type="button" onClick={()=>setOpen(false)}>×</button>
        <UserRound size={30}/><h2>{language==="ne"?"आफ्नो डेटा सुरक्षित राख्नुहोस्":"Keep your personal data with you"}</h2>
        <p>{language==="ne"?"Google बाट साइन इन गरेपछि डायरी, व्यक्तिगत मिति, समुदाय छनोट र अन्य निजी डेटा तपाईंको खातामा सिङ्क हुन्छ।":"Sign in with Google to sync your diary, personal dates, community choices and other private data across devices."}</p>
        <div ref={host} className="mp-google-button"/>
        {config?.google?.enabled===false&&<small>{language==="ne"?"Cloudflare मा GOOGLE_CLIENT_ID राखेपछि यो सक्रिय हुन्छ।":"Set GOOGLE_CLIENT_ID in Cloudflare to activate this."}</small>}
        {error&&<p className="mp-auth-error">{error}</p>}
        <small>{language==="ne"?"Gmail वा Google Drive अनुमति मागिँदैन।":"No Gmail or Google Drive permission is requested."}</small>
      </section>
    </div>}
  </>;
}
