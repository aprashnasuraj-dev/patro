
import {logGamma,invNorm} from "../_vendor/stats";
export function effectSizes(n1:number,mean1:number,sd1:number,n2:number,mean2:number,sd2:number,confidence=.95,control:"group1"|"group2"="group2"){
 if(!Number.isInteger(n1)||!Number.isInteger(n2)||n1<2||n2<2||!(sd1>0)||!(sd2>0))throw new Error("Each group needs n ≥ 2 and SD > 0.");
 const df=n1+n2-2,pooled=Math.sqrt(((n1-1)*sd1*sd1+(n2-1)*sd2*sd2)/df),diff=mean1-mean2,d=diff/pooled;
 const J=Math.exp(logGamma(df/2)-0.5*Math.log(df/2)-logGamma((df-1)/2)),g=J*d,glass=diff/(control==="group1"?sd1:sd2);
 const vd=(n1+n2)/(n1*n2)+d*d/(2*(n1+n2)),vg=vd*J*J,z=invNorm(.5+confidence/2);
 return {difference:diff,pooledSD:pooled,cohensD:d,hedgesG:g,hedgesCorrection:J,glassDelta:glass,control,confidence,cohensDCI:[d-z*Math.sqrt(vd),d+z*Math.sqrt(vd)] as [number,number],hedgesGCI:[g-z*Math.sqrt(vg),g+z*Math.sqrt(vg)] as [number,number],warning:"Magnitude labels are context-dependent; do not treat generic small/medium/large cutoffs as universal."};
}
