
import {bayesTest} from "./core";import {clear,metrics,nfmt,notice,num,pct,q,setError,table} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=bayesTest(num("prevalence"),num("sensitivity"),num("specificity"),num("population"));clear(out);out.append(metrics([["PPV",pct(r.ppv)],["NPV",pct(r.npv)],["Positive rate",pct(r.positiveRate)],["Negative rate",pct(r.negativeRate)]]));const f=r.naturalFrequencies;out.append(table(["Outcome","Expected count"],[["True positive",nfmt(f.truePositive,1)],["False positive",nfmt(f.falsePositive,1)],["True negative",nfmt(f.trueNegative,1)],["False negative",nfmt(f.falseNegative,1)]]),notice(r.warning));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
