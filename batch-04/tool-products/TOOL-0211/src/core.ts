
import {parseNumbers} from "../_vendor/stats";
export function smoothSeries(x:number[],alpha=.2,window=3){
 if(x.length<2)throw new Error("At least two observations are required.");if(!(alpha>0&&alpha<=1))throw new Error("Alpha must be in (0,1].");if(!Number.isInteger(window)||window<1||window>x.length)throw new Error("Moving-average window is invalid.");
 const ses:number[]=[x[0]];for(let i=1;i<x.length;i++)ses.push(alpha*x[i]+(1-alpha)*ses[i-1]);
 const sma=x.map((_,i)=>i+1<window?null:x.slice(i-window+1,i+1).reduce((a,b)=>a+b,0)/window);
 let sse=0,n=0;for(let i=1;i<x.length;i++){const e=x[i]-ses[i-1];sse+=e*e;n++;}
 return {observed:x,ses,sma,nextForecast:ses[ses.length-1],sesOneStepMSE:sse/n,alpha,window,warning:"Simple exponential smoothing assumes no explicit trend or seasonality."};
}
export {parseNumbers};
