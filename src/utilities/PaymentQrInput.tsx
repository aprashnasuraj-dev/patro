import { useState } from "react";
let decoder:Promise<void>|null=null;
function loadDecoder(){return decoder ||= new Promise<void>((resolve,reject)=>{const script=document.createElement("script");script.src="/vendor/jsQR.js";script.onload=()=>resolve();script.onerror=()=>{decoder=null;reject(new Error("QR reader लोड भएन।"))};document.head.appendChild(script)})}
export function PaymentQrInput({onPayload}:{onPayload:(value:string)=>void}){
 const [provider,setProvider]=useState("text"),[status,setStatus]=useState("");const [reading,setReading]=useState(false);
 async function read(file?:File){
  if(!file)return;if(file.size>16*1024*1024){setStatus("16 MB भन्दा सानो QR तस्बिर छान्नुहोस्।");return}
  setReading(true);setStatus("QR पढिँदैछ…");
  try{await loadDecoder();const image=await createImageBitmap(file);const canvas=document.createElement("canvas");const scale=Math.min(1,2400/Math.max(image.width,image.height));canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);const ctx=canvas.getContext("2d",{willReadFrequently:true})!;ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close();const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);const result=(window as any).jsQR(pixels.data,canvas.width,canvas.height,{inversionAttempts:"attemptBoth"});if(!result?.data)throw new Error("QR भेटिएन। स्पष्ट मूल QR तस्बिर छान्नुहोस्।");onPayload(result.data);setStatus("मूल QR को payload जस्ताको तस्तै पढियो। नयाँ QR डाउनलोड गर्नुहोस्।");}catch(error){setStatus(error instanceof Error?error.message:"QR पढ्न सकिएन।")}finally{setReading(false)}
 }
 return <div className="payment-qr-input"><label>QR प्रकार<select value={provider} onChange={e=>{setProvider(e.target.value);onPayload("");setStatus("")}}><option value="text">नेपाली पाठ / URL</option><option value="bank">बैंक / NepalPay / Fonepay</option><option value="esewa">eSewa</option><option value="khalti">Khalti</option></select></label>{provider!=="text"&&<><label>आधिकारिक {provider==="bank"?"बैंक":provider} QR तस्बिर<input type="file" accept="image/*" disabled={reading} onChange={e=>void read(e.target.files?.[0])}/></label><p>बैंक वा wallet ले दिएको मूल QR अपलोड गर्नुहोस् वा तल मूल QR payload / payment link राख्नुहोस्। खाताको नम्बर मात्रबाट वैध payment QR जारी हुँदैन। मूल प्राप्तकर्ता नबदली नयाँ QR बनाइन्छ।</p></>}{status&&<p role="status">{status}</p>}</div>
}
