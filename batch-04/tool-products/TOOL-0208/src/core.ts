
import {mean,parseDelimited,tTwoSidedP} from "../_vendor/stats";
export function parseXY(text:string){
 const rows=parseDelimited(text,100000,3);const start=rows.length&&rows[0].some(v=>!Number.isFinite(Number(v)))?1:0;const pts:{x:number,y:number}[]=[];
 for(let i=start;i<rows.length;i++){if(rows[i].length<2)continue;const x=Number(rows[i][0]),y=Number(rows[i][1]);if(Number.isFinite(x)&&Number.isFinite(y))pts.push({x,y});else throw new Error(`Non-numeric x/y at row ${i+1}.`);}
 if(pts.length<3)throw new Error("At least three x,y pairs are required.");return pts;
}
export function linearRegression(points:{x:number,y:number}[]){
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),mx=mean(xs),my=mean(ys);let sxx=0,sxy=0,syy=0;
 for(const p of points){const dx=p.x-mx,dy=p.y-my;sxx+=dx*dx;sxy+=dx*dy;syy+=dy*dy;}if(sxx===0)throw new Error("x has zero variance.");
 const slope=sxy/sxx,intercept=my-slope*mx,residuals=points.map(p=>({x:p.x,y:p.y,fitted:intercept+slope*p.x,residual:p.y-(intercept+slope*p.x)}));
 const sse=residuals.reduce((s,p)=>s+p.residual*p.residual,0),df=points.length-2,mse=sse/df,seSlope=Math.sqrt(mse/sxx),t=slope/seSlope,p=tTwoSidedP(t,df),r2=syy===0?1:1-sse/syy;
 return {slope,intercept,r2,adjustedR2:1-(1-r2)*(points.length-1)/df,rmse:Math.sqrt(mse),slopeSE:seSlope,slopeT:t,slopePValue:p,residuals};
}
