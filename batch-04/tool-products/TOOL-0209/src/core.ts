
import {averageRanks,parseDelimited,pearson} from "../_vendor/stats";
export type CorrMethod="pearson"|"spearman";
export function correlationMatrix(text:string,method:CorrMethod){
 const rows=parseDelimited(text,50000,50);if(rows.length<3)throw new Error("Provide a header plus at least two data rows.");
 const header=rows[0].map((h,i)=>h.trim()||`Column ${i+1}`);if(new Set(header).size!==header.length)throw new Error("Column headers must be unique.");
 const data=rows.slice(1);const cols=header.map((_,j)=>data.map((r,i)=>{const s=(r[j]??"").trim();if(s==="")return null;const v=Number(s);if(!Number.isFinite(v))throw new Error(`Non-numeric value in ${header[j]} at data row ${i+2}.`);return v;}));
 const matrix:number[][]=[],counts:number[][]=[];
 for(let i=0;i<header.length;i++){matrix[i]=[];counts[i]=[];for(let j=0;j<header.length;j++){const x:number[]=[],y:number[]=[];for(let k=0;k<data.length;k++){const a=cols[i][k],b=cols[j][k];if(a!==null&&b!==null&&Number.isFinite(a)&&Number.isFinite(b)){x.push(a);y.push(b);}}
   counts[i][j]=x.length;if(x.length<3){matrix[i][j]=NaN;continue;}if(method==="spearman"){const rx=averageRanks(x).ranks,ry=averageRanks(y).ranks;matrix[i][j]=pearson(rx,ry);}else matrix[i][j]=pearson(x,y);
 }}
 return {header,matrix,counts,method,warnings:matrix.flat().some(Number.isNaN)?["Some pairs have fewer than three complete observations or zero variance."]:[]};
}
