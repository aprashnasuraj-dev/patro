
import {normalCDF} from "../_vendor/stats";
export function zToPercentile(z:number){
 if(!Number.isFinite(z)||Math.abs(z)>12)throw new Error("Use a finite z-score between -12 and 12.");
 const left=normalCDF(z),right=1-left,twoTail=Math.min(1,2*Math.min(left,right));
 return {z,leftProbability:left,percentile:left*100,rightTail:right,twoSidedTail:twoTail};
}
