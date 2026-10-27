
export type RNG=()=>number;
function rotl(x:number,k:number){return ((x<<k)|(x>>>(32-k)))>>>0;}
function fnv1a(s:string){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function splitmix32(a:number){return()=>{a|=0;a=(a+0x9e3779b9)|0;let t=a;t=Math.imul(t^(t>>>16),0x21f0aaad);t=Math.imul(t^(t>>>15),0x735a2d97);return (t^(t>>>15))>>>0;};}
export function xoshiro128ss(seed:string):RNG{
  const sm=splitmix32(fnv1a(seed)||1);let s0=sm(),s1=sm(),s2=sm(),s3=sm();
  if(!(s0|s1|s2|s3))s0=1;
  return()=>{const result=Math.imul(rotl(Math.imul(s1,5)>>>0,7),9)>>>0;const t=(s1<<9)>>>0;s2^=s0;s3^=s1;s1^=s2;s0^=s3;s2^=t;s3=rotl(s3,11);return result/4294967296;};
}
export function normal01(rng:RNG){let u=0,v=0;while(u===0)u=rng();while(v===0)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
export function gammaSample(shape:number,rng:RNG):number{
  if(!(shape>0))throw new Error("Gamma shape must be positive.");
  if(shape<1){const u=Math.max(rng(),Number.MIN_VALUE);return gammaSample(shape+1,rng)*Math.pow(u,1/shape);}
  const d=shape-1/3,c=1/Math.sqrt(9*d);
  for(let i=0;i<10000;i++){const x=normal01(rng);let v=1+c*x;if(v<=0)continue;v=v*v*v;const u=rng();if(u<1-0.0331*x*x*x*x)return d*v;if(Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v;}
  throw new Error("Gamma sampler did not converge.");
}
export function betaSample(a:number,b:number,rng:RNG){const x=gammaSample(a,rng),y=gammaSample(b,rng);return x/(x+y);}
export function shuffleInPlace<T>(a:T[],rng:RNG){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
