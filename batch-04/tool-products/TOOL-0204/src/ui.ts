
import {surveySampleSize} from "./core";import {clear,metrics,nfmt,num,q,notice,setError} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=surveySampleSize(num("population"),num("margin"),num("confidence"),num("proportion"),num("designEffect"),num("response"));clear(out);out.append(metrics([["Infinite-pop n",nfmt(r.infinitePopulation,1)],["Finite-pop n",nfmt(r.finitePopulation,1)],["Completed responses",nfmt(r.completedResponses,0)],["Invitations",nfmt(r.invitations,0)]]));if(r.warning)out.append(notice(r.warning));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
