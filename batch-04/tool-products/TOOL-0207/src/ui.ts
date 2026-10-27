
import {mannWhitney,parseNumbers} from "./core";import {clear,metrics,nfmt,notice,q,setError,text} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=mannWhitney(parseNumbers(text("a")),parseNumbers(text("b")));clear(out);out.append(metrics([["U₁",nfmt(r.U1)],["U₂",nfmt(r.U2)],["p-value",nfmt(r.pValue,7)],["Method",r.method],["Tied groups",String(r.ties)]]));for(const w of r.warnings)out.append(notice(w));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
