import { finite } from '../_vendor/limits';
export interface CutOptions { start:number; end:number; fadeIn:number; fadeOut:number; format:'mp3'|'wav'; }
export function planCut(o:CutOptions,input:string,output:string):string[]{
  const s=finite(o.start,'Start',0,86400), e=finite(o.end,'End',0.01,86400); if(e<=s) throw new Error('End must be after start.');
  const dur=e-s, fi=Math.min(finite(o.fadeIn,'Fade in',0,30),dur/2), fo=Math.min(finite(o.fadeOut,'Fade out',0,30),dur/2);
  const af=`atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fi},afade=t=out:st=${Math.max(0,dur-fo)}:d=${fo}`;
  return ['-i',input,'-vn','-af',af,...(o.format==='mp3'?['-c:a','libmp3lame','-b:a','192k']:['-c:a','pcm_s16le']),output];
}
