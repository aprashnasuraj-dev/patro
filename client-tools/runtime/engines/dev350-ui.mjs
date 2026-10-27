import{el,button,output,copyText,downloadText}from"../common.mjs";
export{el,button,output};
export function area(label,value=""){const id="dev-"+crypto.randomUUID(),input=el("textarea",{id,spellcheck:"false"});input.value=value;return{wrap:el("div",{class:"ct-field"},[el("label",{for:id,text:label}),input]),input}}
export function input(label,value="",type="text"){const id="dev-"+crypto.randomUUID(),node=el("input",{id,type,value});return{wrap:el("div",{class:"ct-field"},[el("label",{for:id,text:label}),node]),input:node}}
export function select(label,options,value){const id="dev-"+crypto.randomUUID(),node=el("select",{id});for(const [v,t]of options)node.append(el("option",{value:v,text:t}));node.value=value??options[0]?.[0];return{wrap:el("div",{class:"ct-field"},[el("label",{for:id,text:label}),node]),input:node}}
export function renderText(out,text,name="result.txt"){out.textContent=String(text);const a=el("div",{class:"ct-actions"},[button("Copy",()=>copyText(String(text))),button("Download",()=>downloadText(name,String(text)),true)]);out.append(a)}
export function renderJson(out,value,name="result.json"){renderText(out,JSON.stringify(value,null,2),name)}
export function safeMessage(out,fn){return async()=>{try{await fn()}catch(e){out.textContent=String(e?.message||e)}}}
export function workerCall(op,payload){return new Promise((resolve,reject)=>{const w=new Worker("/client-tools/workers/dev350-worker.mjs",{type:"module"}),id=crypto.randomUUID(),timer=setTimeout(()=>{w.terminate();reject(new Error("Worker timed out."))},45000);w.onmessage=e=>{if(e.data?.id!==id)return;clearTimeout(timer);w.terminate();e.data.error?reject(new Error(e.data.error)):resolve(e.data.result)};w.onerror=e=>{clearTimeout(timer);w.terminate();reject(new Error(e.message||"Worker failed."))};w.postMessage({id,op,...payload})})}
export function readFragment(){return new URLSearchParams(location.hash.startsWith("#?")?location.hash.slice(2):"")}
export function writeFragment(values){const p=new URLSearchParams();for(const[k,v]of Object.entries(values))p.set(k,String(v));history.replaceState(null,"","#?"+p.toString())}
