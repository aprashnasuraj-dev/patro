
import {shuffleInPlace,xoshiro128ss} from "../_vendor/prng";
export function sampleSeeded(items:string[],count:number,seed:string,replacement=false){
 const clean=items.map(x=>x.trim()).filter(Boolean);if(!clean.length)throw new Error("Enter at least one item.");if(clean.length>100000)throw new Error("At most 100,000 items are supported.");
 if(!Number.isInteger(count)||count<1||count>100000)throw new Error("Sample size must be 1–100,000.");if(!replacement&&count>clean.length)throw new Error("Without replacement, sample size cannot exceed the number of items.");
 const rng=xoshiro128ss(seed||"default");let out:string[];if(replacement)out=Array.from({length:count},()=>clean[Math.floor(rng()*clean.length)]);else out=shuffleInPlace([...clean],rng).slice(0,count);
 return {seed:seed||"default",replacement,inputCount:clean.length,count,items:out,warning:"This seeded PRNG is reproducible, not cryptographically secure."};
}
