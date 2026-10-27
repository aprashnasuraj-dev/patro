
import {betaSample,xoshiro128ss} from "../_vendor/prng";
import {mean,quantileType7} from "../_vendor/stats";
export type PertTask={name:string;optimistic:number;mostLikely:number;pessimistic:number};
export function parsePertTasks(text:string){
 const rows=text.trim().split(/\n+/).filter(Boolean).map((line,i)=>{const p=line.split(/[,\t]/).map(x=>x.trim());if(p.length<4)throw new Error(`Row ${i+1}: expected name, optimistic, most likely, pessimistic.`);const a=Number(p[1]),m=Number(p[2]),b=Number(p[3]);if(![a,m,b].every(Number.isFinite)||a<0||a>m||m>b||a===b)throw new Error(`Row ${i+1}: require 0 ≤ optimistic ≤ most likely ≤ pessimistic and a non-zero range.`);return {name:p[0]||`Task ${i+1}`,optimistic:a,mostLikely:m,pessimistic:b};});
 if(!rows.length||rows.length>200)throw new Error("Provide 1–200 tasks.");return rows;
}
export function simulatePert(tasks:PertTask[],iterations=20000,seed="PERT",lambda=4){
 if(!Number.isInteger(iterations)||iterations<1000||iterations>100000)throw new Error("Iterations must be 1,000–100,000.");if(!(lambda>0&&lambda<=20))throw new Error("PERT lambda must be >0 and ≤20.");
 const rng=xoshiro128ss(seed),totals=new Array<number>(iterations);const expected=tasks.reduce((s,t)=>s+(t.optimistic+lambda*t.mostLikely+t.pessimistic)/(lambda+2),0);
 for(let it=0;it<iterations;it++){let total=0;for(const t of tasks){const {optimistic:a,mostLikely:m,pessimistic:b}=t;const mu=(a+lambda*m+b)/(lambda+2);const alpha=1+lambda*(m-a)/(b-a),beta=1+lambda*(b-m)/(b-a);total+=a+betaSample(alpha,beta,rng)*(b-a);}totals[it]=total;}
 return {iterations,seed,lambda,analyticExpected:expected,simulationMean:mean(totals),p50:quantileType7(totals,.5),p80:quantileType7(totals,.8),p90:quantileType7(totals,.9),p95:quantileType7(totals,.95),min:totals.reduce((a,b)=>b<a?b:a,Infinity),max:totals.reduce((a,b)=>b>a?b:a,-Infinity),samplesForChart:totals.filter((_,i)=>i%Math.max(1,Math.floor(iterations/2000))===0),warning:"Task durations are sampled independently and summed sequentially; this is not a dependency-network/critical-path simulation."};
}
