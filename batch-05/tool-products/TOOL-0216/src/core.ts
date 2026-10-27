
export function gcd(a:bigint,b:bigint){a=a<0n?-a:a;b=b<0n?-b:b;while(b){[a,b]=[b,a%b];}return a;}
export function lcm(a:bigint,b:bigint){if(a===0n||b===0n)return 0n;return (a/gcd(a,b))*b<0n?-(a/gcd(a,b))*b:(a/gcd(a,b))*b;}
function modPow(a:bigint,e:bigint,n:bigint){let r=1n;a%=n;while(e){if(e&1n)r=r*a%n;a=a*a%n;e>>=1n;}return r;}
function bitLength(n:bigint){return n===0n?0:n.toString(2).length;}
export function isProbablePrime(n:bigint){
 if(n<2n)return false;for(const p of [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n]){if(n===p)return true;if(n%p===0n)return false;}
 let d=n-1n,s=0;while((d&1n)===0n){d>>=1n;s++;}
 const bases=n<18446744073709551616n?[2n,325n,9375n,28178n,450775n,9780504n,1795265022n]:[2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n];
 for(let a of bases){a%=n;if(a===0n)continue;let x=modPow(a,d,n);if(x===1n||x===n-1n)continue;let witness=true;for(let r=1;r<s;r++){x=x*x%n;if(x===n-1n){witness=false;break;}}if(witness)return false;}
 return true;
}
function pollard(n:bigint,budget:{steps:number}){
 if(n%2n===0n)return 2n;if(n%3n===0n)return 3n;
 for(let c=1n;c<=32n;c++){let x=2n+c,y=x,d=1n;const f=(v:bigint)=>(v*v+c)%n;
   while(d===1n&&budget.steps-->0){x=f(x);y=f(f(y));d=gcd(x>y?x-y:y-x,n);}
   if(d>1n&&d<n)return d;if(budget.steps<=0)break;
 }throw new Error("Factorization budget exhausted; the number is too difficult for this browser-safe limit.");
}
export function factorize(value:string,maxSteps=2_000_000){
 const n0=BigInt(value.trim());const sign=n0<0n?-1n:1n;let n=n0<0n?-n0:n0;if(n<2n)return {input:n0.toString(),factors:[n0.toString()],probabilistic:false};
 if(bitLength(n)>128)throw new Error("Factorization is bounded to 128-bit integers to prevent browser resource exhaustion.");
 const factors:bigint[]=[];const budget={steps:maxSteps};
 const rec=(v:bigint)=>{if(v===1n)return;if(isProbablePrime(v)){factors.push(v);return;}const d=pollard(v,budget);rec(d);rec(v/d);};rec(n);factors.sort((a,b)=>a<b?-1:a>b?1:0);
 if(sign<0n)factors.unshift(-1n);return {input:n0.toString(),factors:factors.map(String),probabilistic:bitLength(n)>64,remainingSteps:budget.steps};
}
