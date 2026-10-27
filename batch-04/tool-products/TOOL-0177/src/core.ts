export interface BpmResult { bpm:number; confidence:number; alternatives:number[]; }
export function detectBpm(samples:Float32Array,sampleRate:number):BpmResult {
  if(samples.length<sampleRate*5) throw new Error('Use at least five seconds of audio.');
  const hop=512, env:number[]=[]; let prev=0;
  for(let i=0;i+hop<samples.length;i+=hop){ let e=0; for(let j=0;j<hop;j++){const v=samples[i+j];e+=v*v;} e=Math.sqrt(e/hop); env.push(Math.max(0,e-prev)); prev=e; }
  const mean=env.reduce((a,b)=>a+b,0)/env.length; for(let i=0;i<env.length;i++) env[i]=Math.max(0,env[i]-mean*0.5);
  const rate=sampleRate/hop; let best=0,bestScore=-Infinity; const scored:{bpm:number;score:number}[]=[];
  for(let bpm=60;bpm<=200;bpm++){ const lag=Math.round(rate*60/bpm); let score=0,n=0; for(let i=lag;i<env.length;i++){score+=env[i]*env[i-lag];n++;} score/=Math.max(1,n); scored.push({bpm,score}); if(score>bestScore){bestScore=score;best=bpm;} }
  scored.sort((a,b)=>b.score-a.score); const second=scored.find(x=>Math.abs(x.bpm-best)>3)?.score??0; const confidence=Math.max(0,Math.min(1,(bestScore-second)/(Math.abs(bestScore)+1e-9)));
  const alternatives=[best/2,best*2,...scored.slice(1,5).map(x=>x.bpm)].filter(x=>x>=40&&x<=240).map(x=>Math.round(x)).filter((x,i,a)=>a.indexOf(x)===i&&Math.abs(x-best)>2).slice(0,4);
  return {bpm:best,confidence,alternatives};
}
