
import {invNorm} from "../_vendor/stats";
export type SampleSizeInput={baseline:number;target:number;alpha:number;power:number;ratio:number;sided:"two"|"one"};
export function sampleSizeTwoProportions(x:SampleSizeInput){
  const {baseline:p1,target:p2}=x;
  if(!(p1>0&&p1<1&&p2>0&&p2<1)||p1===p2)throw new Error("Baseline and target rates must be distinct probabilities strictly between 0 and 1.");
  if(!(x.alpha>0&&x.alpha<0.5&&x.power>0.5&&x.power<1&&x.ratio>0&&x.ratio<=20))throw new Error("Check alpha, power and allocation ratio.");
  const r=x.ratio, delta=Math.abs(p2-p1), zA=invNorm(1-x.alpha/(x.sided==="two"?2:1)), zB=invNorm(x.power);
  const pbar=(p1+r*p2)/(1+r);
  const nullTerm=Math.sqrt(pbar*(1-pbar)*(1+1/r));
  const altTerm=Math.sqrt(p1*(1-p1)+p2*(1-p2)/r);
  const n1=Math.ceil(((zA*nullTerm+zB*altTerm)/delta)**2), n2=Math.ceil(r*n1);
  const warnings:string[]=[];
  if(Math.min(n1,n2)<30)warnings.push("The normal-approximation design is small; exact or simulation-based planning may be preferable.");
  return {control:n1,treatment:n2,total:n1+n2,absoluteMDE:delta,relativeMDE:delta/p1,method:"normal approximation for two independent proportions",warnings};
}
