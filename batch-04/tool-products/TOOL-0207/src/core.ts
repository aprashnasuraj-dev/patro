
import {averageRanks,normalCDF,parseNumbers} from "../_vendor/stats";
function exactPNoTies(n1:number,n2:number,r1:number){
  const N=n1+n2,maxSum=n1*(2*N-n1+1)/2;
  const dp:Array<Array<bigint>>=Array.from({length:n1+1},()=>Array(maxSum+1).fill(0n));dp[0][0]=1n;
  for(let rank=1;rank<=N;rank++)for(let k=Math.min(rank,n1);k>=1;k--)for(let s=maxSum;s>=rank;s--)dp[k][s]+=dp[k-1][s-rank];
  const row=dp[n1],total=row.reduce((a,b)=>a+b,0n);let lo=0n,hi=0n;
  for(let s=0;s<row.length;s++){if(s<=r1)lo+=row[s];if(s>=r1)hi+=row[s];}
  const smaller=lo<hi?lo:hi;return Math.min(1,2*Number(smaller)/Number(total));
}
export function mannWhitney(a:number[],b:number[]){
  if(!a.length||!b.length)throw new Error("Both samples are required.");if(a.length+b.length>20000)throw new Error("At most 20,000 observations are supported.");
  const all=[...a,...b],{ranks,ties}=averageRanks(all),n1=a.length,n2=b.length,N=n1+n2,r1=ranks.slice(0,n1).reduce((s,v)=>s+v,0);
  const u1=r1-n1*(n1+1)/2,u2=n1*n2-u1,meanU=n1*n2/2;
  let tieTerm=0;for(const t of ties)tieTerm+=t*t*t-t;
  const varianceU=n1*n2/12*((N+1)-tieTerm/(N*(N-1)));
  const z=varianceU? (Math.abs(u1-meanU)-0.5)/Math.sqrt(varianceU):0;
  const asymP=Math.min(1,2*(1-normalCDF(Math.max(0,z))));
  const useExact=ties.length===0&&Math.min(n1,n2)<=8&&N<=30;
  const p=useExact?exactPNoTies(n1,n2,Math.round(r1)):asymP;
  return {n1,n2,U1:u1,U2:u2,rankSum1:r1,pValue:p,method:useExact?"exact enumeration, no ties":"normal approximation with tie correction and continuity correction",ties:ties.length,warnings:ties.length&&Math.min(n1,n2)<10?["Small sample with ties: an exact permutation test is preferable for publication-grade inference."]:[]};
}
export {parseNumbers};
