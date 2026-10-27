export interface WavePoint { min:number; max:number; rms:number; }
export function waveform(samples:Float32Array,width:number):WavePoint[]{
  const w=Math.max(64,Math.min(4096,Math.round(width))); const step=Math.max(1,Math.floor(samples.length/w)); const out:WavePoint[]=[];
  for(let x=0;x<w;x++){ const a=x*step,b=Math.min(samples.length,a+step); let min=1,max=-1,sum=0,n=0; for(let i=a;i<b;i++){const v=samples[i]; if(v<min)min=v;if(v>max)max=v;sum+=v*v;n++;} out.push({min:n?min:0,max:n?max:0,rms:n?Math.sqrt(sum/n):0}); }
  return out;
}
