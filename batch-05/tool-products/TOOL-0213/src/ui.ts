
import {zToPercentile} from "./core";import {clear,metrics,nfmt,num,pct,q,setError} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=zToPercentile(num("z"));clear(out);out.append(metrics([["Percentile",`${nfmt(r.percentile,4)}th`],["Left probability",pct(r.leftProbability,5)],["Right tail",pct(r.rightTail,5)],["Two-sided tail",pct(r.twoSidedTail,5)]]));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
