
import {detectOutliers,parseNumbers} from "./core";import {clear,metrics,nfmt,notice,num,q,setError,table,text} from "../_vendor/ui";
q("run").addEventListener("click",()=>{const out=q("result");try{const r=detectOutliers(parseNumbers(text("data")),num("iqrK"),num("zK"),num("madK"));clear(out);out.append(metrics([["Median",nfmt(r.summary.median)],["MAD",nfmt(r.summary.mad)],["Mean",nfmt(r.summary.mean)],["SD",nfmt(r.summary.sd)],["IQR",nfmt(r.summary.iqr)]]));out.append(table(["#","Value","z","Modified z","Flags"],r.rows.map(x=>[x.index,nfmt(x.value),nfmt(x.z),nfmt(x.modifiedZ),Object.entries(x.flags).filter(([,v])=>v).map(([k])=>k).join(", ")||"—"])));for(const w of r.warnings)out.append(notice(w));}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
