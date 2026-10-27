
import {mean,parseNumbers,tCritical,tTwoSidedP,variance} from "../_vendor/stats";
export function welchTest(a:number[],b:number[],confidence=0.95){
  if(a.length<2||b.length<2)throw new Error("Each group needs at least two observations.");
  const m1=mean(a),m2=mean(b),v1=variance(a),v2=variance(b),q1=v1/a.length,q2=v2/b.length,se=Math.sqrt(q1+q2);
  if(se===0)throw new Error("Both groups have zero variance.");
  const t=(m1-m2)/se,df=(q1+q2)**2/(q1*q1/(a.length-1)+q2*q2/(b.length-1)),p=tTwoSidedP(t,df),crit=tCritical(confidence,df),diff=m1-m2;
  return {n1:a.length,n2:b.length,mean1:m1,mean2:m2,variance1:v1,variance2:v2,difference:diff,t,df,pValue:p,ci:[diff-crit*se,diff+crit*se] as [number,number],confidence};
}
export {parseNumbers};
