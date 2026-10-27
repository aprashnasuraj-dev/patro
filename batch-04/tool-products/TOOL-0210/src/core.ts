
import {mean,median,parseNumbers,quantileType7,sd} from "../_vendor/stats";
export function detectOutliers(x:number[],iqrK=1.5,zK=3,madK=3.5){
 if(x.length<4)throw new Error("At least four observations are required.");
 const q1=quantileType7(x,.25),q3=quantileType7(x,.75),iqr=q3-q1,lo=q1-iqrK*iqr,hi=q3+iqrK*iqr,m=mean(x),s=sd(x),med=median(x),mad=median(x.map(v=>Math.abs(v-med)));
 const rows=x.map((v,index)=>{const z=s?(v-m)/s:0,modifiedZ=mad?0.6744897501960817*(v-med)/mad:0;return {index:index+1,value:v,iqr:v<lo||v>hi,z,modifiedZ,flags:{iqr:v<lo||v>hi,z:Math.abs(z)>zK,mad:mad?Math.abs(modifiedZ)>madK:false}};});
 return {summary:{q1,q3,iqr,lowerFence:lo,upperFence:hi,mean:m,sd:s,median:med,mad},rows,warnings:mad===0?["MAD is zero; modified Z-score cannot distinguish non-median points reliably and is not flagged."]:[]};
}
export {parseNumbers};
