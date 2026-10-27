import {finite,inverseNormal,roundTo} from '../_vendor/business';
export function reorderPoint(demandRaw:number,demandSdRaw:number,leadRaw:number,leadSdRaw:number,serviceRaw:number,whole:boolean){
 const demand=finite(demandRaw,'Average daily demand',0,1e12),demandSd=finite(demandSdRaw,'Daily demand SD',0,1e12),lead=finite(leadRaw,'Average lead time',0,36500),leadSd=finite(leadSdRaw,'Lead-time SD',0,36500),service=finite(serviceRaw,'Service level',50.001,99.999)/100;
 const z=inverseNormal(service),sigma=Math.sqrt(lead*demandSd*demandSd+demand*demand*leadSd*leadSd),safety=z*sigma,leadDemand=demand*lead,rop=leadDemand+safety;
 const convert=(n:number)=>whole?Math.ceil(n):roundTo(n,4);
 return {z:roundTo(z,5),leadTimeDemandSd:roundTo(sigma,4),safetyStock:convert(safety),averageLeadTimeDemand:convert(leadDemand),reorderPoint:convert(rop),raw:{safetyStock:safety,reorderPoint:rop},formula:'sigma_LT=sqrt(L*sigma_d^2 + d_bar^2*sigma_L^2); safety=z*sigma_LT; ROP=d_bar*L+safety'};
}
