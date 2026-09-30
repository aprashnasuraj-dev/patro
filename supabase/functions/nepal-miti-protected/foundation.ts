
import { createClient } from "npm:@supabase/supabase-js@2";
export const FOUNDATION_JS="\n(()=>{\n  const NE=['०','१','२','३','४','५','६','७','८','९'];\n  const toNeDigits=v=>String(v).replace(/[0-9]/g,d=>NE[+d]);\n  const fromNeDigits=s=>String(s).replace(/[०-९]/g,d=>String(NE.indexOf(d)));\n  const readLocal=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}};\n  const writeLocal=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};\n  const mergeRecords=(local,remote)=>{\n    const byId=new Map();\n    for(const r of [...(remote||[]),...(local||[])]){if(!r||!r.id)continue;const p=byId.get(r.id);if(!p){byId.set(r.id,r);continue}\n      const rt=Date.parse(r.updatedAt||0),pt=Date.parse(p.updatedAt||0),newer=rt>=pt?r:p,older=newer===r?p:r;byId.set(r.id,{...older,...newer});\n    }\n    return [...byId.values()];\n  };\n  const relativeTimeNe=(date,now=new Date())=>{const s=Math.max(0,Math.round((now-new Date(date))/1000));if(s<60)return'भर्खरै';const m=Math.floor(s/60);if(m<60)return toNeDigits(m)+' मिनेट अघि';const h=Math.floor(m/60);if(h<24)return toNeDigits(h)+' घण्टा अघि';const d=Math.floor(h/24);return d<30?toNeDigits(d)+' दिन अघि':''};\n  const countdownNe=days=>days===0?'आज':days===1?'भोलि':toNeDigits(days)+' दिन बाँकी';\n  let flags=null;\n  async function loadFlags(){if(flags)return flags;try{const r=await fetch('/api/flags',{cache:'no-store'}),j=await r.json();flags=j.flags||{}}catch{flags={}}return flags}\n  async function flag(key){return !!(await loadFlags())[key]}\n  window.NM={toNeDigits,fromNeDigits,readLocal,writeLocal,mergeRecords,relativeTimeNe,countdownNe,flag,loadFlags};\n})();\n";
export const FOUNDATION_CSS="\n:root{--nm-ease-out:cubic-bezier(.2,.8,.2,1);--nm-dur-fast:140ms;--nm-dur-med:260ms;--nm-elev-1:0 1px 2px rgb(0 0 0/.06),0 2px 8px rgb(0 0 0/.06);--nm-elev-2:0 4px 16px rgb(0 0 0/.10);--nm-radius:12px;--nm-status-ok:#1f8a4c;--nm-status-warn:#c77700;--nm-status-late:#b3261e;--nm-status-info:#2b5fab;--nm-status-muted:#6b6b6b}\n.nm-ui-skeleton{background:linear-gradient(90deg,var(--nm-skel-a,#eee) 25%,var(--nm-skel-b,#f6f6f6) 37%,var(--nm-skel-a,#eee) 63%);background-size:400% 100%;animation:nm-shimmer 1.3s ease infinite;border-radius:8px}\n.nm-ui-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n.nm-ui-error{border:1px solid #e6b8b6;background:#fff7f6;border-radius:12px;padding:12px}\n@keyframes nm-shimmer{0%{background-position:100% 0}100%{background-position:0 0}}\n@media(prefers-reduced-motion:reduce){:root{--nm-dur-fast:0ms;--nm-dur-med:0ms}.nm-ui-skeleton{animation:none}}\n";
function admin(){
  const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return null;
  return createClient(url,key,{auth:{persistSession:false}});
}
export async function readFlags(){
  const db=admin(); if(!db)return {};
  const {data,error}=await db.from("app_flags").select("key,enabled");
  if(error)return {};
  return Object.fromEntries((data||[]).map((r:any)=>[r.key,!!r.enabled]));
}
export async function flagsResponse(){
  const flags=await readFlags();
  return new Response(JSON.stringify({ok:true,flags}),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
