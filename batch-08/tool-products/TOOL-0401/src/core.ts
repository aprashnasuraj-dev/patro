import {finite,pct,round} from "../_vendor/validation";
export function calculate(i:any){
  const count=finite("Post count",i.count,1,1000), d=finite("Hole diameter",i.holeDiameterIn,1,120), depth=finite("Hole depth",i.holeDepthIn,1,240);
  const shape=String(i.postShape||"square"), post=finite("Post size",i.postSizeIn,0,48), waste=pct("Waste",i.wastePct);
  const holeFt3=Math.PI*(d/24)**2*(depth/12);
  let postFt3=0;
  if(post>0){postFt3=shape==="round"?Math.PI*(post/24)**2*(depth/12):(post/12)**2*(depth/12)}
  if(postFt3>=holeFt3) throw new Error("Post displacement must be smaller than the hole volume.");
  const netPer=holeFt3-postFt3, total=netPer*count*(1+waste), bagYield=finite("Bag yield",i.bagYieldFt3,0.01,10);
  return {"Net concrete / post (ft³)":round(netPer,3),"Total with waste (ft³)":round(total,2),"Total (yd³)":round(total/27,3),"Bags required":Math.ceil(total/bagYield),"Assumption":"Bag yield is user-entered; verify the manufacturer label."}
}
