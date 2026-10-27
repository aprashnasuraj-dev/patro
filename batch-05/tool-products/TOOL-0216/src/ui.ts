
import {gcd,lcm} from "./core";import {clear,metrics,q,setError,text,notice} from "../_vendor/ui";
let worker:Worker|null=null;
q("run").addEventListener("click",()=>{const out=q("result");try{const a=BigInt(text("a")),b=BigInt(text("b"));clear(out);out.append(metrics([["GCD",gcd(a,b).toString()],["LCM",lcm(a,b).toString()]]));worker?.terminate();worker=new Worker(new URL("./worker.ts",import.meta.url),{type:"module"});out.append(notice("Factoring in a bounded worker…"));worker.onmessage=e=>{if(e.data.error){setError(out,new Error(e.data.error));return;}out.append(metrics([["Factors",e.data.result.factors.join(" × ")],["Primality mode",e.data.result.probabilistic?"probable-prime checks above 64-bit":"deterministic Miller–Rabin bases through 64-bit"]]));worker?.terminate();worker=null;};worker.postMessage({value:text("factor")});}catch(e){setError(out,e);}});


q("copy").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("result").textContent||"");});
q("download").addEventListener("click",()=>{const blob=new Blob([q("result").textContent||""],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
