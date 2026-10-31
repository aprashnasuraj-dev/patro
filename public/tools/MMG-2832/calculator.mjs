// Original, dependency-free Poisson event calculator for bounded browser inputs.
// Draft-only client-side tool. No network requests and no analytics calls.
export const LIMITS = Object.freeze({lambdaMax:100,countMax:250});
function valid(lambda,k){
  if(!Number.isFinite(lambda)||lambda<0||lambda>LIMITS.lambdaMax)throw new RangeError('lambda must be finite and between 0 and 100');
  if(!Number.isSafeInteger(k)||k<0||k>LIMITS.countMax)throw new RangeError('k must be an integer between 0 and 250');
}
function logFactorial(k){let s=0;for(let i=2;i<=k;i++)s+=Math.log(i);return s;}
function poissonPmfInternal(k,lambda){
  if(lambda===0)return k===0?1:0;
  return Math.exp(-lambda+k*Math.log(lambda)-logFactorial(k));
}
export function poissonPmf(k,lambda){valid(lambda,k);return poissonPmfInternal(k,lambda);}
function kahanRange(lambda,lo,hi){
  let sum=0,c=0;
  for(let k=lo;k<=hi;k++){
    const y=poissonPmfInternal(k,lambda)-c,t=sum+y;
    c=(t-sum)-y;sum=t;
  }
  return Math.min(1,Math.max(0,sum));
}
export function poissonCdf(k,lambda){valid(lambda,k);return kahanRange(lambda,0,k);}
export function poissonSf(k,lambda){
  valid(lambda,k);
  const hi=Math.max(k+1,Math.ceil(lambda+20*Math.sqrt(lambda+1)+50));
  // Terms beyond this bound are negligible for lambda<=100, k<=250.
  return kahanRange(lambda,k+1,hi);
}
export function poissonEventProbability(lambda,k,mode){
  valid(lambda,k);
  switch(mode){
    case 'exact':return poissonPmf(k,lambda);
    case 'at-most':return poissonCdf(k,lambda);
    case 'at-least':return k===0?1:poissonSf(k-1,lambda);
    case 'more-than':return poissonSf(k,lambda);
    default:throw new RangeError('unknown event selector');
  }
}
function makeBarChart(svg,lambda,k){
  const ns='http://www.w3.org/2000/svg';svg.replaceChildren();
  const span=Math.max(4,Math.ceil(3*Math.sqrt(lambda+1)));
  const min=Math.max(0,Math.floor(lambda-span));const max=Math.min(250,Math.ceil(lambda+span));
  const step=Math.max(1,Math.ceil((max-min+1)/26));
  const points=[];for(let x=min;x<=max;x+=step)points.push([x,poissonPmf(x,lambda)]);
  const peak=Math.max(1e-30,...points.map(x=>x[1]));const w=690,h=260,pad=34,slot=(w-2*pad)/points.length;
  function el(tag,attrs,txt){const n=document.createElementNS(ns,tag);for(const [a,v] of Object.entries(attrs))n.setAttribute(a,String(v));if(txt!==undefined)n.textContent=txt;svg.append(n);return n;}
  el('line',{x1:pad,y1:h-36,x2:w-pad,y2:h-36,stroke:'#506b7d','stroke-width':2});
  points.forEach(([count,p],i)=>{
    const bar=Math.max(1,(h-105)*p/peak),x=pad+i*slot+4;
    el('rect',{x,y:h-36-bar,width:Math.max(3,slot-8),height:bar,rx:3,fill:count===k?'#e8913b':'#087f83'});
    if(points.length<=18||i%2===0)el('text',{x:x+(slot-8)/2,y:h-14,'text-anchor':'middle','font-size':12,fill:'#29455b'},String(count));
  });
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  document.getElementById('range').textContent=`Displayed integer counts ${min} to ${max}${step>1?` (every ${step}th count)`:''}. Bars show model probabilities, not observations.`;
}
function render(){
  const output=document.getElementById('result'),error=document.getElementById('error');
  const rawLambda=document.getElementById('lambda').value,rawK=document.getElementById('count').value;
  const lambda=Number(rawLambda),k=Number(rawK),mode=document.getElementById('mode').value;
  try{
    if(rawLambda.trim()===''||rawK.trim()==='')throw new RangeError('Both inputs are required');
    const p=poissonEventProbability(lambda,k,mode);
    const label={'exact':'exactly','at-most':'at most','at-least':'at least','more-than':'more than'}[mode];
    output.textContent=`P(X ${label} ${k} | lambda=${lambda}) = ${(p*100).toFixed(4)}% (${p.toExponential(8)})`;
    error.textContent='';makeBarChart(document.getElementById('chart'),lambda,k);
  }catch(e){output.textContent='No result';error.textContent=e.message;document.getElementById('chart').replaceChildren();}
}
if(typeof document!=='undefined'){
  document.addEventListener('DOMContentLoaded',()=>{
    for(const id of ['lambda','count','mode'])document.getElementById(id).addEventListener('input',render);
    document.getElementById('calculate').addEventListener('click',render);render();
  });
}
