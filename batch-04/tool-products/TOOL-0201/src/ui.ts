
import {analyzeAB} from "./core";import {clear,metrics,nfmt,notice,num,pct,q,setError} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=analyzeAB({controlN:num("controlN"),controlConv:num("controlConv"),treatN:num("treatN"),treatConv:num("treatConv"),expectedTreatShare:num("expectedShare"),alpha:num("alpha")});clear(out);out.append(metrics([["Control",pct(r.pControl)],["Treatment",pct(r.pTreatment)],["Absolute uplift",pct(r.difference)],["Relative uplift",r.relativeUplift===null?"—":pct(r.relativeUplift)],["z",nfmt(r.z)],["p-value",nfmt(r.pValue,6)],["SRM p",nfmt(r.srm.pValue,6)]]));out.append(document.createTextNode(` Difference CI: ${pct(r.differenceCI[0])} to ${pct(r.differenceCI[1])}. `));for(const w of r.warnings)out.append(notice(w));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
