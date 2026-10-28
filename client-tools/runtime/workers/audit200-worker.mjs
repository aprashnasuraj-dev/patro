import{runAudit200}from"../cores/audit200-core.mjs";
self.onmessage=async e=>{try{const{operation,values}=e.data||{},result=await runAudit200(operation,values);self.postMessage({ok:true,result})}catch(error){self.postMessage({ok:false,error:String(error?.message||error)})}};
