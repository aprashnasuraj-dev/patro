
import {clear,metrics,nfmt,notice,q,select,setError,table,text} from "../_vendor/ui";
let active:Worker|null=null;
q("run").addEventListener("click",()=>{const out=q("result");active?.terminate();clear(out);out.textContent="Computing pairwise correlations…";const w=new Worker(new URL("./worker.ts",import.meta.url),{type:"module"});active=w;w.onmessage=ev=>{if(active!==w)return;const m=ev.data;if(m.error){setError(out,new Error(m.error));return;}const r=m.result;clear(out);out.append(metrics([["Columns",String(r.header.length)],["Method",r.method]]));out.append(table(["",...r.header],r.matrix.map((row:any[],i:number)=>[r.header[i],...row.map((x:number)=>nfmt(x))])));for(const x of r.warnings)out.append(notice(x));w.terminate();active=null;};w.postMessage({text:text("data"),method:select("method")});});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
