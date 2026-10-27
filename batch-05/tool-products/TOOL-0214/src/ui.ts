
import {probability} from "./core";import {clear,metrics,nfmt,num,pct,q,select,setError} from "../_vendor/ui";
const kind=q<HTMLSelectElement>("kind"),bin=q("binomialFields"),pois=q("poissonField");kind.addEventListener("change",()=>{const isB=kind.value==="binomial";bin.hidden=!isB;pois.hidden=isB;});
q("run").addEventListener("click",()=>{const out=q("result");try{const k=select("kind") as "binomial"|"poisson";const r=probability(k,select("relation") as any,num("a"),num("b"),k==="binomial"?{n:num("n"),p:num("p")}:{lambda:num("lambda")});clear(out);out.append(metrics([["Probability",nfmt(r.probability,10)],["Percent",pct(r.probability,6)],["Distribution",r.kind],["Request",r.relation]]));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
