import { generateKeyPairSync } from "node:crypto";
const account=process.env.CLOUDFLARE_ACCOUNT_ID, token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw new Error("Cloudflare credentials are required to provision morning push");
const base=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/patro/secrets`;
async function call(method,body){
  const response=await fetch(base,{method,headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
  const value=await response.json();
  if(!response.ok||value.success===false)throw new Error(`Push secret provisioning failed (${response.status}); check Workers edit permission`);
  return value.result;
}
// Only list secret names. Existing keys are never downloaded, printed, or rotated.
const names=new Set((await call("GET")).map(row=>row.name));
const publicExists=names.has("VAPID_PUBLIC_KEY"),privateExists=names.has("VAPID_PRIVATE_KEY");
if(publicExists!==privateExists)throw new Error("Incomplete VAPID key pair: restore the matching key before deploying; refusing to rotate existing subscriptions");
if(!publicExists){
  const {privateKey}=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
  const jwk=privateKey.export({format:"jwk"});
  const publicKey=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,"base64url"),Buffer.from(jwk.y,"base64url")]).toString("base64url");
  await call("PUT",{name:"VAPID_PRIVATE_KEY",text:jwk.d,type:"secret_text"});
  await call("PUT",{name:"VAPID_PUBLIC_KEY",text:publicKey,type:"secret_text"});
}
if(!names.has("VAPID_SUBJECT"))await call("PUT",{name:"VAPID_SUBJECT",text:"https://aafnaipatro.com/contact",type:"secret_text"});
console.log("Persistent VAPID keys configured; existing key pairs preserved.");
