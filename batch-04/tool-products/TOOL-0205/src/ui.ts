
import {chiSquareIndependence,parseContingency} from "./core";import {clear,metrics,nfmt,q,setError,table,text,notice} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const obs=parseContingency(text("data")),r=chiSquareIndependence(obs);clear(out);out.append(metrics([["χ²",nfmt(r.chiSquare)],["df",String(r.df)],["p-value",nfmt(r.pValue,7)],["Cramér's V",nfmt(r.cramersV)],["N",String(r.N)]]));out.append(table(["Cell",...obs[0].map((_,j)=>`C${j+1}`)],r.expected.map((row,i)=>[`R${i+1}`,...row.map(x=>nfmt(x,2))])));for(const w of r.warnings)out.append(notice(w));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
