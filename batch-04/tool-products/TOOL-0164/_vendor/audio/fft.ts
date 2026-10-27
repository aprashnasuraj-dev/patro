export function hann(n:number, size:number):number { return 0.5 - 0.5*Math.cos((2*Math.PI*n)/(size-1)); }
export function fftMag(real: Float32Array): Float32Array {
  const n=real.length; if((n&(n-1))!==0) throw new Error('FFT size must be a power of two.');
  const re=new Float64Array(n), im=new Float64Array(n);
  for(let i=0,j=0;i<n;i++){ re[j]=real[i]; let bit=n>>1; while(j&bit){j^=bit;bit>>=1;} j^=bit; }
  for(let len=2;len<=n;len<<=1){ const ang=-2*Math.PI/len; for(let i=0;i<n;i+=len){ for(let j=0;j<len/2;j++){ const c=Math.cos(ang*j), s=Math.sin(ang*j), ur=re[i+j], ui=im[i+j], vr=re[i+j+len/2]*c-im[i+j+len/2]*s, vi=re[i+j+len/2]*s+im[i+j+len/2]*c; re[i+j]=ur+vr; im[i+j]=ui+vi; re[i+j+len/2]=ur-vr; im[i+j+len/2]=ui-vi; } } }
  const out=new Float32Array(n/2); for(let i=0;i<out.length;i++) out[i]=Math.hypot(re[i],im[i]); return out;
}
