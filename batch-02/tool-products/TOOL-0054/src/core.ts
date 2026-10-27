import {intIn} from '../_vendor/guards.js';
export async function compute(x,ctx={}){
 if(!x.ack)throw Error('Confirm the bounded write probe before running.');
 const cap=intIn(x.cap,1,4096),chunk=intIn(x.step,4,64),prefix='__mangal_quota_probe_'+crypto.randomUUID()+'_';let written=0,keys=[],ended='cap reached',estimated=null;
 try{
  if(!window.localStorage)throw Error('localStorage is unavailable.');
  const text='x'.repeat(chunk*512); // 2 UTF-16 bytes per code unit: chunk KiB
  for(let n=0;written<cap;n++){
   if(ctx.signal?.aborted)throw Error('Cancelled and cleaned up temporary writes.');
   const k=prefix+n,amount=Math.min(chunk,cap-written);let value=amount===chunk?text:'x'.repeat(amount*512);
   try{localStorage.setItem(k,value);}catch(e){if(e?.name==='QuotaExceededError'){ended='quota exceeded before cap';break;}throw e;}
   keys.push(k);written+=amount;
   if(n%4===0){ctx.notify?.(`Temporarily wrote ${written} of ${cap} KiB…`);await new Promise(resolve=>setTimeout(resolve,0));}
  }
  if(navigator.storage?.estimate){try{estimated=await navigator.storage.estimate();}catch{/* optional browser estimate */}}
  return {summary:`Reversible write probe: ${written} KiB, ended because ${ended}.`,text:JSON.stringify({writableProbeKiB:written,configuredCapKiB:cap,reason:ended,estimatedOriginUsageBytes:estimated?.usage??null,estimatedOriginQuotaBytes:estimated?.quota??null},null,2),warnings:['This is a bounded lower-bound probe, not a full localStorage quota measurement.','Storage estimates reflect broader origin storage, and browser private mode may differ.']};
 }finally{for(const k of keys){try{localStorage.removeItem(k);}catch{/* browser may revoke access */}}}
}
