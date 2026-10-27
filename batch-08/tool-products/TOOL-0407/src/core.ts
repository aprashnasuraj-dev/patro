import {finite,round} from "../_vendor/validation";
export function calculate(i:any){
 const wallW=finite("Wall width",i.wallWidthFt,0.1,1000)*12, wallH=finite("Wall height",i.wallHeightFt,0.1,100)*12;
 const rollW=finite("Roll width",i.rollWidthIn,1,120), rollL=finite("Roll length",i.rollLengthFt,1,1000)*12;
 const repeat=finite("Pattern repeat",i.repeatIn,0.01,120), trim=finite("Trim allowance",i.trimIn,0,24), drop=finite("Drop offset",i.dropOffsetIn,0,120);
 const strips=Math.ceil(wallW/rollW);
 const cut=Math.ceil((wallH+trim+drop)/repeat)*repeat;
 const perRoll=Math.floor(rollL/cut); if(perRoll<1) throw new Error("A single pattern-matched strip is longer than the roll.");
 return {"Strips required":strips,"Matched cut length / strip (in)":round(cut,2),"Strips per roll":perRoll,"Rolls required":Math.ceil(strips/perRoll),
 "Unused length / roll (in)":round(rollL-perRoll*cut,2)}
}
