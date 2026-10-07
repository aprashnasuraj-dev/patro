import { useDismiss } from "../useDismiss";
import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { accountChallenge, completeGoogleSignIn, loadGoogleIdentity, signOut, useAccount } from "./account-client";
import "./google-account.css";

export function GoogleMark(){return <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.04 46.98 31.87 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.77 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.86 23.86 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>}

export function GoogleAuthButton({language,compact=false}:{language:"ne"|"en";compact?:boolean}){
  const user=useAccount();
  const[open,setOpen]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const host=useRef<HTMLDivElement>(null),dialog=useRef<HTMLElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const label=language==="ne"?"Google बाट साइन इन":"Sign in with Google";
  useDismiss(open,()=>setOpen(false));
  useEffect(()=>{
    if(!open||user)return;
    let cancelled=false;
    const previous=document.activeElement as HTMLElement|null;
    dialog.current?.focus();
    setBusy(true);
    (async()=>{
      try{
        const[{clientId,nonce}]=await Promise.all([accountChallenge(),loadGoogleIdentity()]);
        if(cancelled||!host.current)return;
        const google=(window as any).google;
        google.accounts.id.initialize({client_id:clientId,nonce,auto_select:false,callback:async(response:any)=>{
          if(cancelled)return;
          setBusy(true);setError("");
          try{await completeGoogleSignIn(response?.credential||"");setOpen(false);}catch(e){if(!cancelled)setError((e as Error).message);}finally{setBusy(false);}
        }});
        host.current.replaceChildren();
        google.accounts.id.renderButton(host.current,{theme:"outline",size:"large",shape:"pill",text:"signin_with",width:280});
      }catch(e){if(!cancelled)setError((e as Error).message);}finally{if(!cancelled)setBusy(false);}
    })();
    return()=>{cancelled=true;previous?.focus();};
  },[open,user]);
  async function logout(){
    setBusy(true);setError("");
    try{await signOut();setOpen(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className={`google-account${compact?" google-account--compact":""}`}>
    <button ref={trigger} type="button" className="google-account-trigger" title={user?(user.name||user.email||"Account"):label} aria-label={user?(language==="ne"?"मेरो Google खाता":"My Google account"):label} aria-expanded={open} onClick={()=>{setError("");setOpen(v=>!v);}}>
      {user?(user.picture?<img src={user.picture} alt="" referrerPolicy="no-referrer"/>:<UserRound size={20}/>):<GoogleMark/>}
      {!compact&&<span>{user?(user.name?.split(" ")[0]||"Account"):label}</span>}
    </button>
    {open&&user&&<div className="google-account-menu"><strong>{user.name||"Google account"}</strong><small>{user.email}</small><a href="/me/notes">{language==="ne"?"मेरो टिपोट":"My notes"}</a><button type="button" onClick={logout} disabled={busy}><LogOut size={16}/>{language==="ne"?"साइन आउट":"Sign out"}</button>{error&&<p role="alert">{error}</p>}</div>}
    {open&&!user&&<div className="google-auth-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
      <section ref={dialog} tabIndex={-1} className="google-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="google-auth-title" onKeyDown={event=>{
        if(event.key!=="Tab")return;
        const nodes=[...dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],iframe,[tabindex="0"]')];
        const first=nodes[0],last=nodes.at(-1);
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }}>
        <button type="button" className="google-auth-close" onClick={()=>setOpen(false)} aria-label={language==="ne"?"बन्द गर्नुहोस्":"Close"}>×</button>
        <GoogleMark/><h2 id="google-auth-title">{label}</h2>
        <p>{language==="ne"?"टिपोट, परिवार मिति र सुरक्षित गरेका व्यक्तिगत विवरण आफ्नो खातामा राख्नुहोस्। यो उपकरणका सुरक्षित टिपोट पहिलो पटक साइन इन गर्दा खातामा जोडिन्छन्।":"Keep your notes, family dates and saved personal details in your account. Saved device notes join your account on your first sign-in."}</p>
        <div ref={host} className="google-auth-host"/>
        {busy&&<p role="status">{language==="ne"?"जोडिँदैछ…":"Connecting…"}</p>}
        {error&&<p className="google-auth-error" role="alert">{error}</p>}
        <small>{language==="ne"?"Gmail वा Drive अनुमति मागिँदैन। साइन इन नगरी पनि उपकरणमा टिपोट राख्न सकिन्छ।":"No Gmail or Drive access. You can also keep notes on this device without signing in."}</small>
      </section>
    </div>}
  </div>;
}
