import { finite } from '../_vendor/limits';
export function planLosslessTrim(start:number,end:number,input:string,output:string):string[]{
  start=finite(start,'Start',0,86400); end=finite(end,'End',0.001,86400); if(end<=start) throw new Error('End must be after start.');
  return ['-ss',start.toFixed(3),'-i',input,'-t',(end-start).toFixed(3),'-map','0','-c','copy','-avoid_negative_ts','make_zero',output];
}
export const limitation='Stream-copy cuts are constrained by container timestamps/keyframes; the requested boundary may not be frame-exact.';
