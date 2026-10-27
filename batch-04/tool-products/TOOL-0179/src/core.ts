import { fftMag, hann } from '../_vendor/audio/fft';
export interface Spectrogram { columns:number; bins:number; db:Float32Array; minDb:number; maxDb:number; }
export function spectrogram(samples:Float32Array,fftSize=2048,maxColumns=1000):Spectrogram {
  if((fftSize&(fftSize-1))!==0||fftSize<256||fftSize>8192) throw new Error('FFT size must be a power of two from 256 to 8192.');
  const hop=Math.max(1,Math.ceil(Math.max(1,samples.length-fftSize)/maxColumns)); const cols=Math.max(1,Math.floor(Math.max(0,samples.length-fftSize)/hop)+1), bins=fftSize/2; const db=new Float32Array(cols*bins); let minDb=0,maxDb=-160;
  const frame=new Float32Array(fftSize);
  for(let c=0;c<cols;c++){ const start=c*hop; for(let i=0;i<fftSize;i++) frame[i]=(samples[start+i]??0)*hann(i,fftSize); const mag=fftMag(frame); for(let b=0;b<bins;b++){const v=20*Math.log10(mag[b]+1e-9);db[c*bins+b]=v;if(v>maxDb)maxDb=v;if(v<minDb)minDb=v;} }
  minDb=Math.max(-120,minDb); return {columns:cols,bins,db,minDb,maxDb};
}
