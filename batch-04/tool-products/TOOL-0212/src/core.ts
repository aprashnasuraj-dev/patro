
import {parseNumbers,quantileType7,quantileType8} from "../_vendor/stats";
export function quantiles(data:number[],probs:number[],method:"type7"|"type8"|"nearest"){
 if(!probs.length||probs.some(p=>p<0||p>1))throw new Error("Percentiles must be probabilities in [0,1].");
 const sorted=[...data].sort((a,b)=>a-b);
 const values=probs.map(p=>{if(method==="type7")return quantileType7(sorted,p);if(method==="type8")return quantileType8(sorted,p);if(p===0)return sorted[0];return sorted[Math.max(0,Math.ceil(p*sorted.length)-1)];});
 return {count:data.length,min:sorted[0],max:sorted[sorted.length-1],method,results:probs.map((p,i)=>({probability:p,percentile:p*100,value:values[i]}))};
}
export {parseNumbers};
