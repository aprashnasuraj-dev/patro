import {finite,round} from "../_vendor/validation";
export function calculate(i:any){
 const area=finite("Roof design area",i.roofAreaSqFt,1,1000000), intensity=finite("Rain intensity",i.rainInPerHr,0.01,30);
 const n=finite("Downspouts",i.downspouts,1,1000), capacity=finite("Target capacity per downspout",i.downspoutCapacityGpm,0.1,10000);
 const total=0.0103896*area*intensity, each=total/n;
 const needed=Math.ceil(total/capacity);
 return {"City / location":String(i.city||"Custom"),"Design rainfall (in/hr)":intensity,"Total roof flow (gpm)":round(total,2),
 "Flow per selected downspout (gpm)":round(each,2),"Downspouts needed at entered capacity":needed,
 "Method note":"Rainfall intensity × horizontal design area gives inflow. Final gutter/downspout dimensions must follow the chosen standard/manufacturer and local AHJ."}
}
