
import {sampleSizeTwoProportions} from "./core";import {clear,metrics,nfmt,num,pct,q,select,setError} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=sampleSizeTwoProportions({baseline:num("baseline"),target:num("target"),alpha:num("alpha"),power:num("power"),ratio:num("ratio"),sided:select("sided") as "two"|"one"});clear(out);out.append(metrics([["Control n",nfmt(r.control,0)],["Treatment n",nfmt(r.treatment,0)],["Total",nfmt(r.total,0)],["Absolute MDE",pct(r.absoluteMDE)],["Relative MDE",pct(r.relativeMDE)]]));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
