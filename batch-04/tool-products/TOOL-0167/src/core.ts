import { finite } from '../_vendor/limits';
export interface FramePlan { args:string[]; estimatedFrames:number; }
export function planFrames(duration:number,interval:number,format:'png'|'jpg',input:string,pattern:string):FramePlan {
  const d=finite(duration,'Duration',0.01,21600), step=finite(interval,'Interval',0.1,3600); const estimatedFrames=Math.ceil(d/step); if(estimatedFrames>500) throw new Error('Selection exceeds the 500-frame cap; increase the interval.');
  const args=['-i',input,'-vf',`fps=1/${step}`,'-vsync','vfr']; if(format==='jpg') args.push('-q:v','2'); args.push(pattern); return {args,estimatedFrames};
}
