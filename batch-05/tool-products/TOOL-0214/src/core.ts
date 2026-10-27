
import {logGamma,regularizedBeta,regularizedGammaQ} from "../_vendor/stats";
function logChoose(n:number,k:number){return logGamma(n+1)-logGamma(k+1)-logGamma(n-k+1);}
export function binomialPMF(n:number,k:number,p:number){if(!Number.isInteger(n)||n<0||n>10_000_000||!Number.isInteger(k)||k<0||k>n||p<0||p>1)throw new Error("Invalid binomial parameters.");if(p===0)return k===0?1:0;if(p===1)return k===n?1:0;return Math.exp(logChoose(n,k)+k*Math.log(p)+(n-k)*Math.log1p(-p));}
export function binomialCDF(n:number,k:number,p:number){if(k<0)return 0;if(k>=n)return 1;if(p===0)return 1;if(p===1)return k>=n?1:0;return regularizedBeta(1-p,n-k,k+1);}
export function poissonPMF(lambda:number,k:number){if(!(lambda>=0&&lambda<=1e7)||!Number.isInteger(k)||k<0)throw new Error("Invalid Poisson parameters.");if(lambda===0)return k===0?1:0;return Math.exp(-lambda+k*Math.log(lambda)-logGamma(k+1));}
export function poissonCDF(lambda:number,k:number){if(k<0)return 0;if(lambda===0)return 1;return regularizedGammaQ(k+1,lambda);}
export function probability(kind:"binomial"|"poisson",relation:"exact"|"atMost"|"atLeast"|"between",a:number,b:number,params:{n?:number;p?:number;lambda?:number}){
 let pmf:(k:number)=>number,cdf:(k:number)=>number;
 if(kind==="binomial"){const n=params.n!,p=params.p!;pmf=k=>binomialPMF(n,k,p);cdf=k=>binomialCDF(n,Math.floor(k),p);}
 else {const l=params.lambda!;pmf=k=>poissonPMF(l,k);cdf=k=>poissonCDF(l,Math.floor(k));}
 let value=0;if(relation==="exact")value=pmf(Math.floor(a));else if(relation==="atMost")value=cdf(a);else if(relation==="atLeast")value=1-cdf(a-1);else {const lo=Math.min(a,b),hi=Math.max(a,b);value=cdf(hi)-cdf(lo-1);}
 return {kind,relation,probability:Math.max(0,Math.min(1,value))};
}
