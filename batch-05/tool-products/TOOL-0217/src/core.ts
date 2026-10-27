
export function parseMatrix(text:string){
 const rows=text.trim().split(/\n+/).map(r=>r.trim().split(/[\s,]+/).filter(Boolean).map(Number));if(!rows.length||rows.some(r=>!r.length||r.some(v=>!Number.isFinite(v))))throw new Error("Matrix contains invalid numbers.");
 const c=rows[0].length;if(rows.some(r=>r.length!==c))throw new Error("Rows must have equal length.");if(rows.length>10||c>10)throw new Error("Matrices are limited to 10×10.");return rows;
}
function fmt(x:number){return Math.abs(x)<1e-12?0:+x.toPrecision(10);}
export function determinantWithSteps(A:number[][],eps=1e-12){
 const n=A.length;if(A.some(r=>r.length!==n))throw new Error("Determinant requires a square matrix.");const M=A.map(r=>[...r]);let det=1,swaps=0;const steps:string[]=[];
 for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;if(Math.abs(M[p][k])<eps)return {determinant:0,steps:[...steps,`Column ${k+1}: pivot is numerically zero; determinant is 0.`]};
   if(p!==k){[M[p],M[k]]=[M[k],M[p]];swaps++;steps.push(`Swap R${k+1} ↔ R${p+1}.`);}const pivot=M[k][k];det*=pivot;
   for(let i=k+1;i<n;i++){const f=M[i][k]/pivot;if(Math.abs(f)>eps)steps.push(`R${i+1} ← R${i+1} − (${fmt(f)})R${k+1}`);for(let j=k;j<n;j++)M[i][j]-=f*M[k][j];}
 }return {determinant:(swaps%2?-1:1)*det,steps,upper:M.map(r=>r.map(fmt))};
}
export function inverseWithSteps(A:number[][],eps=1e-12){
 const n=A.length;if(A.some(r=>r.length!==n))throw new Error("Inverse requires a square matrix.");const M=A.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>i===j?1:0)]);const steps:string[]=[];
 for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;if(Math.abs(M[p][k])<eps)throw new Error("Matrix is singular or numerically singular.");
  if(p!==k){[M[p],M[k]]=[M[k],M[p]];steps.push(`Swap R${k+1} ↔ R${p+1}.`);}const pivot=M[k][k];for(let j=0;j<2*n;j++)M[k][j]/=pivot;steps.push(`Scale R${k+1} by 1/${fmt(pivot)}.`);
  for(let i=0;i<n;i++)if(i!==k){const f=M[i][k];if(Math.abs(f)>eps){for(let j=0;j<2*n;j++)M[i][j]-=f*M[k][j];steps.push(`R${i+1} ← R${i+1} − (${fmt(f)})R${k+1}`);}}
 }return {inverse:M.map(r=>r.slice(n).map(fmt)),rref:M.map(r=>r.slice(0,n).map(fmt)),steps};
}
export function rrefWithSteps(A:number[][],eps=1e-12){
 const M=A.map(r=>[...r]);let row=0;const steps:string[]=[];
 for(let col=0;col<M[0].length&&row<M.length;col++){let p=row;for(let i=row+1;i<M.length;i++)if(Math.abs(M[i][col])>Math.abs(M[p][col]))p=i;if(Math.abs(M[p][col])<eps)continue;if(p!==row){[M[p],M[row]]=[M[row],M[p]];steps.push(`Swap R${row+1} ↔ R${p+1}.`);}const pv=M[row][col];for(let j=0;j<M[0].length;j++)M[row][j]/=pv;for(let i=0;i<M.length;i++)if(i!==row){const f=M[i][col];for(let j=0;j<M[0].length;j++)M[i][j]-=f*M[row][j];}steps.push(`Pivot column ${col+1} using row ${row+1}.`);row++;}
 return {rref:M.map(r=>r.map(fmt)),steps};
}
