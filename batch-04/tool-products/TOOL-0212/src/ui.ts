
import {parseNumbers,quantiles} from "./core";import {clear,metrics,nfmt,q,select,setError,table,text} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const ps=text("probs").split(/[\s,;]+/).filter(Boolean).map(x=>Number(x)/100);const r=quantiles(parseNumbers(text("data")),ps,select("method") as any);clear(out);out.append(metrics([["Count",String(r.count)],["Min",nfmt(r.min)],["Max",nfmt(r.max)],["Method",r.method]]));out.append(table(["Percentile","Value"],r.results.map(x=>[`${x.percentile}%`,nfmt(x.value)])));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
