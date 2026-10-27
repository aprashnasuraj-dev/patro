import {finite,round} from "../_vendor/validation";
export function calculate(i:any){
 const last=finite("Prior Self Assessment amount",i.lastYearRelevantTax,0,1e10), outside=finite("Tax paid outside Self Assessment",i.outsideSaTax,0,1e10);
 const projected=finite("Projected current liability",i.projectedCurrentTax,0,1e10), already=finite("Payments on account already made",i.poaPaid,0,1e10);
 const outsidePct=last>0?outside/last:1, required=last>=1000 && outsidePct<=.80;
 const poa=required?last/2:0, totalPoa=poa*2, remainingPoa=Math.max(0,totalPoa-already), balancing=Math.max(0,projected-totalPoa);
 return {"Payments on account required?":required?"Likely under general rule":"No under general rule","Each payment on account":round(poa,2),
 "First due":"31 January","Second due":"31 July","Remaining payments on account":round(remainingPoa,2),"Projected balancing payment":round(balancing,2),
 "Outside-SA share":round(outsidePct*100,1)+"%","Note":"Student loans, capital gains and other items may be treated differently in the actual Self Assessment calculation."}
}
