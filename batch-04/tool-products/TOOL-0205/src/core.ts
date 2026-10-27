
import {chiSquareSF,parseDelimited} from "../_vendor/stats";
export function parseContingency(text:string){
  const rows=parseDelimited(text,100,100).map(r=>r.map(v=>Number(v.trim())));
  if(rows.length<2||Math.min(...rows.map(r=>r.length))<2)throw new Error("Enter at least a 2×2 table.");
  const cols=rows[0].length;if(rows.some(r=>r.length!==cols||r.some(v=>!Number.isFinite(v)||v<0||!Number.isInteger(v))))throw new Error("All cells must be non-negative integer counts in a rectangular table.");
  return rows;
}
export function chiSquareIndependence(obs:number[][]){
  const R=obs.length,C=obs[0].length,row=obs.map(r=>r.reduce((a,b)=>a+b,0)),col=Array.from({length:C},(_,j)=>obs.reduce((s,r)=>s+r[j],0)),N=row.reduce((a,b)=>a+b,0);
  if(!N||row.some(x=>x===0)||col.some(x=>x===0))throw new Error("No row or column may have a zero total.");
  const expected=obs.map((r,i)=>r.map((_,j)=>row[i]*col[j]/N));
  let chi=0;const residuals=obs.map((r,i)=>r.map((o,j)=>{const e=expected[i][j];const d=o-e;chi+=d*d/e;return d/Math.sqrt(e);}));
  const df=(R-1)*(C-1),p=chiSquareSF(chi,df),v=Math.sqrt(chi/(N*Math.min(R-1,C-1))),small=expected.flat().filter(x=>x<5).length;
  return {chiSquare:chi,df,pValue:p,cramersV:v,expected,standardizedResiduals:residuals,N,warnings:small?[`${small} expected cell(s) are below 5; chi-square approximation may be unreliable.`]:[]};
}
