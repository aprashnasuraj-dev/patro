
import {parseNumbers,welchTest} from "./core";import {clear,metrics,nfmt,num,q,setError,text} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=welchTest(parseNumbers(text("a")),parseNumbers(text("b")),num("confidence"));clear(out);out.append(metrics([["Mean A",nfmt(r.mean1)],["Mean B",nfmt(r.mean2)],["Difference",nfmt(r.difference)],["t",nfmt(r.t)],["df",nfmt(r.df,2)],["p-value",nfmt(r.pValue,7)],["CI",`${nfmt(r.ci[0])} … ${nfmt(r.ci[1])}`]]));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
