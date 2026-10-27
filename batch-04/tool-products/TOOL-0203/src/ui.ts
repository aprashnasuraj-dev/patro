
import {wilsonInterval} from "./core";import {clear,metrics,nfmt,num,pct,q,setError} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=wilsonInterval(num("successes"),num("n"),num("confidence"));clear(out);out.append(metrics([["Observed",pct(r.estimate)],["Lower",pct(r.lower)],["Upper",pct(r.upper)],["Half-width",pct(r.halfWidth)],["z*",nfmt(r.z)]]));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
