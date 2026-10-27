
import {parseNumbers,smoothSeries} from "./core";import {clear,metrics,nfmt,num,q,setError,table,text} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=smoothSeries(parseNumbers(text("data")),num("alpha"),num("window"));clear(out);out.append(metrics([["Next SES forecast",nfmt(r.nextForecast)],["One-step MSE",nfmt(r.sesOneStepMSE)],["Alpha",nfmt(r.alpha)],["MA window",String(r.window)]]));out.append(table(["t","Observed","SES","Moving avg"],r.observed.map((v,i)=>[i+1,nfmt(v),nfmt(r.ses[i]),r.sma[i]===null?"—":nfmt(r.sma[i] as number)])));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
