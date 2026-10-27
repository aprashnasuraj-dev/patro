
import {determinantWithSteps,inverseWithSteps,parseMatrix,rrefWithSteps} from "./core";import {clear,metrics,nfmt,pre,q,select,setError,table,text} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const A=parseMatrix(text("matrix")),op=select("operation");clear(out);if(op==="det"){const r=determinantWithSteps(A);out.append(metrics([["Determinant",nfmt(r.determinant,8)]]),pre(r.steps));}else if(op==="inv"){const r=inverseWithSteps(A);out.append(table(r.inverse[0].map((_,i)=>`C${i+1}`),r.inverse.map(row=>row.map(x=>nfmt(x)))),pre(r.steps));}else{const r=rrefWithSteps(A);out.append(table(r.rref[0].map((_,i)=>`C${i+1}`),r.rref.map(row=>row.map(x=>nfmt(x)))),pre(r.steps));}}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
