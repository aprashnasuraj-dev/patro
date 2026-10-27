
import {chiSquareSF,invNorm,normalCDF} from "../_vendor/stats";
export type ABInput={controlN:number;controlConv:number;treatN:number;treatConv:number;expectedTreatShare:number;alpha:number};
export function analyzeAB(x:ABInput){
  const {controlN:n1,controlConv:k1,treatN:n2,treatConv:k2}=x;
  if(!Number.isInteger(n1)||!Number.isInteger(n2)||n1<1||n2<1)throw new Error("Sample sizes must be positive integers.");
  if(!Number.isInteger(k1)||!Number.isInteger(k2)||k1<0||k2<0||k1>n1||k2>n2)throw new Error("Conversions must be integers between 0 and sample size.");
  if(!(x.expectedTreatShare>0&&x.expectedTreatShare<1))throw new Error("Expected treatment share must be between 0 and 1.");
  const p1=k1/n1,p2=k2/n2, pooled=(k1+k2)/(n1+n2);
  const se0=Math.sqrt(pooled*(1-pooled)*(1/n1+1/n2));
  const z=se0===0?0:(p2-p1)/se0, pTwo=Math.min(1,2*(1-normalCDF(Math.abs(z))));
  const seDiff=Math.sqrt(p1*(1-p1)/n1+p2*(1-p2)/n2), zcrit=invNorm(1-x.alpha/2);
  const diff=p2-p1, diffCI:[number,number]=[diff-zcrit*seDiff,diff+zcrit*seDiff];
  const total=n1+n2, exp2=total*x.expectedTreatShare,exp1=total-exp2;
  const srmChi=(n1-exp1)**2/exp1+(n2-exp2)**2/exp2, srmP=chiSquareSF(srmChi,1);
  const expectedCells=[n1*pooled,n1*(1-pooled),n2*pooled,n2*(1-pooled)];
  const warnings:string[]=[];
  if(expectedCells.some(v=>v<5))warnings.push("At least one success/failure cell has fewer than 5 observations; the normal approximation may be unreliable.");
  if(srmP<0.01)warnings.push("Strong sample-ratio-mismatch signal (p < 0.01). Investigate assignment/logging before interpreting uplift.");
  return {pControl:p1,pTreatment:p2,difference:diff,relativeUplift:p1===0?null:diff/p1,z,pValue:pTwo,differenceCI:diffCI,srm:{chiSquare:srmChi,pValue:srmP,expected:[exp1,exp2],observed:[n1,n2]},warnings};
}
