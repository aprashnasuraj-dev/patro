import { finite } from '../_vendor/limits';
function tempoParts(value:number):string[]{ let s=value, out:string[]=[]; while(s>2){out.push('atempo=2');s/=2;} while(s<0.5){out.push('atempo=0.5');s/=0.5;} out.push(`atempo=${s.toFixed(6)}`); return out; }
export function planSpeedPitch(speed:number,semitones:number,input:string,output:string):string[]{
  const s=finite(speed,'Speed',0.25,4), st=finite(semitones,'Pitch',-12,12), ratio=Math.pow(2,st/12); const sample=48000, shifted=Math.max(8000,Math.min(192000,Math.round(sample*ratio)));
  const filters=[`aresample=${sample}`,`asetrate=${shifted}`,`aresample=${sample}`,...tempoParts(1/ratio),...tempoParts(s)];
  return ['-i',input,'-vn','-af',filters.join(','),'-c:a','libmp3lame','-b:a','192k',output];
}
export const note='Pitch shifting uses resampling plus tempo compensation. It is practical, not a formant-preserving studio algorithm.';
