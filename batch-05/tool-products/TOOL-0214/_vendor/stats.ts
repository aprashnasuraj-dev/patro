
export const MAX_NUMBERS = 200000;
export function clamp(x:number,a:number,b:number){ return Math.min(b,Math.max(a,x)); }
export function assertFinite(x:number,label:string){ if(!Number.isFinite(x)) throw new Error(`${label} must be finite.`); return x; }
export function parseNumbers(text:string, max=MAX_NUMBERS):number[]{
  if(text.length>4_000_000) throw new Error("Input is too large.");
  const tokens=text.trim().split(/[\s,;]+/).filter(Boolean);
  if(tokens.length>max) throw new Error(`Too many values (max ${max.toLocaleString()}).`);
  const out=tokens.map((t,i)=>{const v=Number(t); if(!Number.isFinite(v)) throw new Error(`Invalid number at item ${i+1}.`); return v;});
  if(!out.length) throw new Error("Enter at least one number.");
  return out;
}
export function mean(x:number[]){ return x.reduce((a,b)=>a+b,0)/x.length; }
export function variance(x:number[], sample=true){
  if(x.length < (sample?2:1)) throw new Error(sample?"At least two values are required.":"No values.");
  const m=mean(x); let s=0; for(const v of x){const d=v-m;s+=d*d;} return s/(x.length-(sample?1:0));
}
export function sd(x:number[], sample=true){ return Math.sqrt(variance(x,sample)); }
export function median(x:number[]){ const a=[...x].sort((p,q)=>p-q); const n=a.length; return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2; }
export function quantileType7(x:number[], p:number){
  if(!(p>=0&&p<=1)) throw new Error("Probability must be in [0,1].");
  const a=[...x].sort((u,v)=>u-v); if(a.length===1) return a[0];
  const h=(a.length-1)*p, j=Math.floor(h), g=h-j;
  return a[j]+g*(a[Math.min(j+1,a.length-1)]-a[j]);
}
export function quantileType8(x:number[], p:number){
  if(!(p>=0&&p<=1)) throw new Error("Probability must be in [0,1].");
  const a=[...x].sort((u,v)=>u-v); const n=a.length; if(n===1)return a[0];
  if(p<=0)return a[0]; if(p>=1)return a[n-1];
  const h=(n+1/3)*p+1/3; const j=Math.floor(h); const g=h-j;
  if(j<=0)return a[0]; if(j>=n)return a[n-1];
  return a[j-1]+g*(a[j]-a[j-1]);
}
export function erf(x:number){
  const sign=x<0?-1:1, a=Math.abs(x), t=1/(1+0.3275911*a);
  const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-a*a);
  return sign*y;
}
export function normalCDF(z:number){ return 0.5*(1+erf(z/Math.SQRT2)); }
export function normalSF(z:number){ return 1-normalCDF(z); }
export function invNorm(p:number){
  if(!(p>0&&p<1)) { if(p===0)return -Infinity;if(p===1)return Infinity;throw new Error("p must be in (0,1)."); }
  const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.3577518672690,-30.66479806614716,2.506628277459239];
  const b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
  const c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
  const d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
  const pl=0.02425, ph=1-pl; let q:number,r:number;
  if(p<pl){q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p>ph){q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  q=p-0.5;r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
export function logGamma(z:number){
  const p=[0.9999999999998099,676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.50734327868691,-0.1385710952657201,9.984369578019572e-6,1.5056327351493116e-7];
  if(z<0.5) return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
  z-=1; let x=p[0]; for(let i=1;i<p.length;i++) x+=p[i]/(z+i);
  const t=z+7.5; return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(x);
}
export function regularizedGammaP(a:number,x:number){
  if(a<=0||x<0)throw new Error("Invalid gamma arguments."); if(x===0)return 0;
  const ITMAX=200, EPS=3e-14;
  if(x<a+1){let ap=a,sum=1/a,del=sum;for(let n=1;n<=ITMAX;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*EPS)break;}return sum*Math.exp(-x+a*Math.log(x)-logGamma(a));}
  return 1-regularizedGammaQ(a,x);
}
export function regularizedGammaQ(a:number,x:number){
  if(a<=0||x<0)throw new Error("Invalid gamma arguments."); if(x===0)return 1;
  const ITMAX=200, EPS=3e-14, FPMIN=1e-300;
  let b=x+1-a,c=1/FPMIN,d=1/b,h=d;
  for(let i=1;i<=ITMAX;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<FPMIN)d=FPMIN;c=b+an/c;if(Math.abs(c)<FPMIN)c=FPMIN;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<EPS)break;}
  return Math.exp(-x+a*Math.log(x)-logGamma(a))*h;
}
function betaCF(a:number,b:number,x:number){
  const MAX=250,EPS=3e-14,FPMIN=1e-300;let qab=a+b,qap=a+1,qam=a-1,c=1,d=1-qab*x/qap;if(Math.abs(d)<FPMIN)d=FPMIN;d=1/d;let h=d;
  for(let m=1;m<=MAX;m++){let m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<FPMIN)d=FPMIN;c=1+aa/c;if(Math.abs(c)<FPMIN)c=FPMIN;d=1/d;h*=d*c;aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<FPMIN)d=FPMIN;c=1+aa/c;if(Math.abs(c)<FPMIN)c=FPMIN;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<EPS)break;}return h;
}
export function regularizedBeta(x:number,a:number,b:number){
  if(x<0||x>1||a<=0||b<=0)throw new Error("Invalid beta arguments."); if(x===0||x===1)return x;
  const bt=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log(1-x));
  return x<(a+1)/(a+b+2) ? bt*betaCF(a,b,x)/a : 1-bt*betaCF(b,a,1-x)/b;
}
export function studentTCDF(t:number,df:number){
  if(!(df>0))throw new Error("df must be positive."); if(t===0)return 0.5;
  const x=df/(df+t*t), ib=regularizedBeta(x,df/2,0.5);
  return t>0 ? 1-0.5*ib : 0.5*ib;
}
export function tTwoSidedP(t:number,df:number){ return Math.min(1,2*(1-studentTCDF(Math.abs(t),df))); }
export function tCritical(confidence:number,df:number){
  const target=0.5+confidence/2; let lo=0,hi=1;
  while(studentTCDF(hi,df)<target && hi<1e6)hi*=2;
  for(let i=0;i<80;i++){const m=(lo+hi)/2;if(studentTCDF(m,df)<target)lo=m;else hi=m;}return (lo+hi)/2;
}
export function chiSquareSF(x:number,df:number){ if(x<0||df<=0)throw new Error("Invalid chi-square arguments.");return regularizedGammaQ(df/2,x/2); }
export function averageRanks(values:number[]){
  const pairs=values.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v); const ranks=new Array(values.length); const ties:number[]=[];
  for(let i=0;i<pairs.length;){let j=i+1;while(j<pairs.length&&pairs[j].v===pairs[i].v)j++;const rank=((i+1)+j)/2;for(let k=i;k<j;k++)ranks[pairs[k].i]=rank;if(j-i>1)ties.push(j-i);i=j;}
  return {ranks,ties};
}
export function pearson(x:number[],y:number[]){
  if(x.length!==y.length||x.length<2)throw new Error("Need paired values.");const mx=mean(x),my=mean(y);let sxx=0,syy=0,sxy=0;
  for(let i=0;i<x.length;i++){const a=x[i]-mx,b=y[i]-my;sxx+=a*a;syy+=b*b;sxy+=a*b;}return sxx&&syy?sxy/Math.sqrt(sxx*syy):NaN;
}
export function parseDelimited(text:string,maxRows=50000,maxCols=200){
  if(text.length>5_000_000)throw new Error("Input exceeds 5 MB.");
  const rows:string[][]=[];let row:string[]=[],cell="",q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')q=false;else cell+=ch;}
    else if(ch==='"')q=true;
    else if(ch===','||ch==='\t'){row.push(cell);cell="";}
    else if(ch==='\n'){row.push(cell);cell="";if(row.some(x=>x!==''))rows.push(row);row=[];if(rows.length>maxRows)throw new Error("Too many rows.");}
    else if(ch!=='\r')cell+=ch;
  }
  if(q)throw new Error("Unclosed quoted field."); if(cell||row.length){row.push(cell);if(row.some(x=>x!==''))rows.push(row);}
  if(rows.some(r=>r.length>maxCols))throw new Error("Too many columns."); return rows;
}
