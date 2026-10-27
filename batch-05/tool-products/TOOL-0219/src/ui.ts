
import {clear,metrics,nfmt,notice,num,q,setError,text} from "../_vendor/ui";let worker:Worker|null=null;
q("run").addEventListener("click",()=>{const out=q("result");worker?.terminate();clear(out);out.textContent="Running seeded PERT simulation in a worker…";worker=new Worker(new URL("./worker.ts",import.meta.url),{type:"module"});worker.onmessage=e=>{if(e.data.error){setError(out,new Error(e.data.error));return;}const r=e.data.result;clear(out);out.append(metrics([["Analytic expected",nfmt(r.analyticExpected)],["Simulated mean",nfmt(r.simulationMean)],["P50",nfmt(r.p50)],["P80",nfmt(r.p80)],["P90",nfmt(r.p90)],["P95",nfmt(r.p95)]]),notice(r.warning));worker?.terminate();worker=null;};worker.postMessage({tasks:text("tasks"),iterations:num("iterations"),seed:text("seed"),lambda:num("lambda")});});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
