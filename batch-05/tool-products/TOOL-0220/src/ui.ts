
import {effectSizes} from "./core";import {clear,metrics,nfmt,num,q,select,setError} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=effectSizes(num("n1"),num("mean1"),num("sd1"),num("n2"),num("mean2"),num("sd2"),num("confidence"),select("control") as any);clear(out);out.append(metrics([["Mean difference",nfmt(r.difference)],["Pooled SD",nfmt(r.pooledSD)],["Cohen's d",nfmt(r.cohensD)],["Hedges' g",nfmt(r.hedgesG)],["Glass's Δ",nfmt(r.glassDelta)],["Hedges J",nfmt(r.hedgesCorrection,6)]]));out.append(document.createTextNode(` Hedges g CI: ${nfmt(r.hedgesGCI[0])} to ${nfmt(r.hedgesGCI[1])}.`));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
