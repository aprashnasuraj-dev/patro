import {finite,isoDate,daysBetween,round} from "../_vendor/validation";
export function calculate(i:any){
 const sold=isoDate(String(i.saleDate)), repl=isoDate(String(i.replacementDate)), original=isoDate(String(i.originalBuyDate));
 const sharesSold=finite("Shares sold",i.sharesSold,0.000001,1e12), sharesBought=finite("Replacement shares",i.replacementShares,0,1e12), loss=finite("Loss amount",i.lossAmount,0,1e15);
 const delta=daysBetween(sold,repl), inWindow=delta>=-30&&delta<=30, matched=inWindow?Math.min(sharesSold,sharesBought):0;
 const disallowed=loss*(matched/sharesSold), addPer=matched?disallowed/matched:0, held=Math.max(0,daysBetween(original,sold));
 const tackStart=new Date(repl.valueOf()-held*86400000);
 return {"Days from sale to replacement":delta,"Within ±30-day window?":inWindow?"YES":"NO","Matched replacement shares":round(matched,6),
 "Estimated disallowed loss":round(disallowed,2),"Basis addition per matched replacement share":round(addPer,4),
 "Approx. tacked holding-period anchor":matched?tackStart.toISOString().slice(0,10):"n/a",
 "Warning":"Substantially-identical analysis, spouse/entity purchases, IRA purchases, multiple lots and broker reporting can change the result. IRA wash sales have different basis consequences."}
}
