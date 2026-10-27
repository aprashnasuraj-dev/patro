import { finite } from '../_vendor/limits';
export interface TargetPlan { videoKbps:number; audioKbps:number; predictedBytes:number; args:string[]; }
export function planTargetSize(durationSec:number,targetMiB:number,input:string,output:string):TargetPlan {
  const d=finite(durationSec,'Duration',1,21600), target=finite(targetMiB,'Target size',1,500);
  const audioKbps=d<30?96:128; const budgetKbps=(target*1024*1024*8/d/1000)*0.96;
  const videoKbps=Math.floor(budgetKbps-audioKbps); if(videoKbps<120) throw new Error('Target is too small for this duration; choose a larger size or shorter clip.');
  const args=['-i',input,'-c:v','libx264','-preset','veryfast','-b:v',`${videoKbps}k`,'-maxrate',`${Math.round(videoKbps*1.08)}k`,'-bufsize',`${videoKbps*2}k`,'-c:a','aac','-b:a',`${audioKbps}k`,'-movflags','+faststart',output];
  return {videoKbps,audioKbps,predictedBytes:Math.floor((videoKbps+audioKbps)*1000*d/8),args};
}
export const note='Target-size encoding is an estimate; muxing overhead, codec rate control and source complexity can move the final size away from the requested cap.';
