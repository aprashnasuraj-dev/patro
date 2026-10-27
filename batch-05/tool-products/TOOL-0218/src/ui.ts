
import {sampleSeeded} from "./core";import {clear,metrics,num,q,setError,table,text} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=sampleSeeded(text("items").split(/\n/),num("count"),text("seed"),q<HTMLInputElement>("replacement").checked);clear(out);out.append(metrics([["Seed",r.seed],["Input items",String(r.inputCount)],["Draws",String(r.count)],["Replacement",r.replacement?"Yes":"No"]]));out.append(table(["#","Sampled item"],r.items.map((x,i)=>[i+1,x])));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
