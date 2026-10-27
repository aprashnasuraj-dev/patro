
import {invNorm} from "../_vendor/stats";
export function wilsonInterval(successes:number,n:number,confidence=0.95){
  if(!Number.isInteger(n)||n<1||!Number.isInteger(successes)||successes<0||successes>n)throw new Error("Enter integer successes between 0 and n.");
  if(!(confidence>0&&confidence<1))throw new Error("Confidence must be in (0,1).");
  const p=successes/n,z=invNorm(0.5+confidence/2),z2=z*z,den=1+z2/n;
  const center=(p+z2/(2*n))/den;
  const half=z*Math.sqrt((p*(1-p)+z2/(4*n))/n)/den;
  return {estimate:p,lower:Math.max(0,center-half),upper:Math.min(1,center+half),center,halfWidth:half,z,confidence};
}
